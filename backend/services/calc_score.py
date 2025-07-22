import contextlib
import logging
import os
from typing import Any, Dict, Iterable, List, Optional, Tuple, Union, Set
from concurrent.futures import ThreadPoolExecutor, as_completed

import numpy as np
from fastapi import Depends
from sqlalchemy.orm import Session

# ─────────────────────────────────── SQL / Mongo hooks ─────────────────────────
from ..connection.mysqldb import Restaurant, Users, get_db
from ..connection.mongodb import (  # type: ignore
    restaurant_keywords_collection,
    user_keywords_collection,
    user_rest_score,
    user_user_score,
)
from .utilities import PRIME_LOWER_CAP, PRIME_UPPER_CAP, random_prime_in_range

logger = logging.getLogger(__name__)

# ───────────────────────────────────── Tunables ────────────────────────────────
THRESHOLD: float = 0.50           # cosine ≥ THRESHOLD counts as a match
EMBED_DIM: int = 1536             # OpenAI text‑embedding‑3‑small dimension
LIFT_TAIL_B: int = 10             # 1 disables logarithmic skew
print(f"DEBUG: USING CONFIG:\nTHRESHOLD = {THRESHOLD}\nEMBED_DIM = {EMBED_DIM}\nLIFT_TAIL_B = {LIFT_TAIL_B}")

def relu(x: float) -> float:
    """Rectified linear unit (ReLU) activation function."""
    return np.maximum(0, x)

def skew_score(score: float, b: int = LIFT_TAIL_B) -> float:
    """
    Apply logarithmic tail lift to a score in [0, 1].
    If b=1, no skew is applied (linear).
    """
    if b <= 1:
        return score
    return np.log1p(relu((b - 1) * score)) / np.log(b)

# ───────────────────────────── Canonicalisation helpers ───────────────────────
def _canon_token(rec: Dict[str, Any]) -> str:
    for key in ("token", "name", "keyword", "word", "text", "label"):
        if key in rec:
            return rec[key]
    raise KeyError(f"No keyword‑like field found: {rec!r}")

def _canon_sentiment(rec: Dict[str, Any]) -> str:  # 'positive' default
    return rec.get("sentiment", "positive")

def _canon_frequency(rec: Dict[str, Any]) -> int:  # floor at 1
    try:
        v = int(rec.get("frequency", 1))
    except Exception:
        v = 1
    return max(v, 1)

def _canon_embedding(rec: Dict[str, Any]) -> np.ndarray:
    emb = rec.get("embedding", [])
    return np.asarray(emb, dtype=np.float32)

def _canonize_kw_list(records: Optional[Iterable[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    if not records:
        return []
    canon: List[Dict[str, Any]] = []
    for rec in records:
        try:
            canon.append(
                {
                    "token": _canon_token(rec),
                    "sentiment": _canon_sentiment(rec),
                    "frequency": _canon_frequency(rec),
                    "embedding": _canon_embedding(rec),
                }
            )
        except Exception as exc:
            logger.debug("Skipping malformed keyword %r (%s)", rec, exc)
    return canon

# ───────────────────────────── Similarity primitives ──────────────────────────
def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    if not a.any() or not b.any():
        return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

# ───────────────────────────── Core scoring routine ───────────────────────────
def _score_pair(
    kw_user: List[Dict[str, Any]],
    kw_rest: List[Dict[str, Any]],
    *,
    metric: str = "cosine",           # kept for API compatibility – ignored
    lift_tail_b: int | None = None,   # ditto
    threshold: float = THRESHOLD,
) -> float:
    """
    Per‑keyword cosine scoring with threshold.

    Steps
    -----
    1. For every user keyword U, find the *single* restaurant keyword R with the
       highest cosine ≥ *threshold* that hasn’t already been matched.
    2. Contribution = sentiment_sign(U) · freq(U) · freq(R).
    3. Sum contributions → *score_sum*.
    4. Normalise by the average profile weight and map to 0‑100.

    Returns
    -------
    float in [0, 100]
    """
    # Filter out keywords whose embeddings are the wrong size
    user_kw = [rec for rec in kw_user if rec["embedding"].size == EMBED_DIM]
    rest_kw = [rec for rec in kw_rest if rec["embedding"].size == EMBED_DIM]

    if not user_kw or not rest_kw:
        return 0.0

    # Pre‑compute normalised vectors for efficiency
    for rec in user_kw + rest_kw:
        vec = rec["embedding"]
        # Cache the L2‑norm to avoid recomputing inside the loop
        rec["_norm"] = np.linalg.norm(vec)

    score_sum: float = 0.0
    matched_rest_tokens: Set[str] = set()

    # Iterate over user keywords
    for u_rec in user_kw:
        u_vec = u_rec["embedding"]
        u_norm = u_rec["_norm"] or 1.0

        best_sim: float = 0.0
        best_r_rec: Optional[Dict[str, Any]] = None

        # Linear scan over restaurant keywords (small lists → fine)
        for r_rec in rest_kw:
            if r_rec["token"] in matched_rest_tokens:
                continue
            sim = float(np.dot(u_vec, r_rec["embedding"]) / (u_norm * (r_rec["_norm"] or 1.0)))
            if sim >= threshold and sim > best_sim:
                best_sim = sim
                best_r_rec = r_rec

        if best_r_rec is not None:
            matched_rest_tokens.add(best_r_rec["token"])
            sentiment_sign = 1 if u_rec["sentiment"] == "positive" else -1
            weight = u_rec["frequency"] * best_r_rec["frequency"]
            score_sum += sentiment_sign * weight

    # Normalise – average profile weight
    total_user_weight = sum(rec["frequency"] for rec in user_kw)
    total_rest_weight = sum(rec["frequency"] for rec in rest_kw)
    denominator = (total_user_weight + total_rest_weight) / 2.0
    if denominator <= 0:
        return 0.0

    score_fraction = score_sum / denominator
    score_fraction = skew_score(score_fraction)
    return float(np.clip(score_fraction * 100.0, 0.0, 100.0))

# ─────────────────────────────── Cache helpers ────────────────────────────────
def _ensure_state_id(obj: Any, attr: str, db: Session) -> int:
    val = getattr(obj, attr)
    if val is None:
        val = random_prime_in_range(PRIME_LOWER_CAP, PRIME_UPPER_CAP)
        setattr(obj, attr, val)
        db.add(obj)
        db.flush()
    return val

def _cache_find_user_rest(u_id: int, r_id: int, state_hash: int) -> Optional[float]:
    doc = user_rest_score.find_one(
        {"u_id": u_id, "scores.r_id": r_id, "scores.state_id": state_hash},
        {"scores.$": 1},
    )
    if doc and doc.get("scores"):
        return doc["scores"][0]["score"]
    return None

def _cache_write_user_rest(u_id: int, r_id: int, state_hash: int, score_val: float) -> None:
    user_rest_score.update_one(
        {"u_id": u_id}, {"$setOnInsert": {"u_id": u_id, "scores": []}}, upsert=True
    )
    user_rest_score.update_one({"u_id": u_id}, {"$pull": {"scores": {"r_id": r_id}}})
    user_rest_score.update_one(
        {"u_id": u_id},
        {"$push": {"scores": {"r_id": r_id, "state_id": state_hash, "score": score_val}}},
    )

def _cache_find_user_user(holder: int, partner: int, state_hash: int) -> Optional[float]:
    doc = user_user_score.find_one(
        {"u_id": holder, "scores.u_id": partner, "scores.state_id": state_hash},
        {"scores.$": 1},
    )
    if doc and doc.get("scores"):
        return doc["scores"][0]["score"]
    return None

def _cache_write_user_user(holder: int, partner: int, state_hash: int, score_val: float) -> None:
    user_user_score.update_one(
        {"u_id": holder}, {"$setOnInsert": {"u_id": holder, "scores": []}}, upsert=True
    )
    user_user_score.update_one({"u_id": holder}, {"$pull": {"scores": {"u_id": partner}}})
    user_user_score.update_one(
        {"u_id": holder},
        {"$push": {"scores": {"u_id": partner, "state_id": state_hash, "score": score_val}}},
    )

# ───────────────────────────── Low‑level compute paths ────────────────────────
def _compute_user_rest_score(
    u_id: int,
    r_id: int,
    db: Session,
    *,
    metric: str,
    lift_tail_b: int,
    force: bool,
) -> float:
    user_obj = db.query(Users).filter(Users.user_id == u_id).first()
    rest_obj = db.query(Restaurant).filter(Restaurant.restaurant_id == r_id).first()
    if user_obj is None or rest_obj is None:
        raise ValueError(f"Invalid identifiers u_id={u_id} r_id={r_id}")

    prime_u = _ensure_state_id(user_obj, "state_id", db)
    prime_r = _ensure_state_id(rest_obj, "state_id", db)
    with contextlib.suppress(Exception):
        db.commit()

    state_hash = prime_u * prime_r

    if not force:
        cached = _cache_find_user_rest(u_id, r_id, state_hash)
        if cached is not None:
            return cached

    kw_u = (user_keywords_collection.find_one({"user_id": u_id}) or {}).get("keywords", [])
    kw_r = (restaurant_keywords_collection.find_one({"r_id": r_id}) or {}).get("keywords", [])

    score_val = _score_pair(
        _canonize_kw_list(kw_u),
        _canonize_kw_list(kw_r),
        metric=metric,
        lift_tail_b=lift_tail_b,
    )

    _cache_write_user_rest(u_id, r_id, state_hash, score_val)
    return score_val

def _compute_user_user_score(
    u_a: int,
    u_b: int,
    db: Session,
    *,
    metric: str,
    lift_tail_b: int,
    force: bool,
    mirror: bool,
) -> float:
    userA = db.query(Users).filter(Users.user_id == u_a).first()
    userB = db.query(Users).filter(Users.user_id == u_b).first()
    if userA is None or userB is None:
        raise ValueError(f"Invalid user ids u_a={u_a} u_b={u_b}")

    primeA = _ensure_state_id(userA, "state_id", db)
    primeB = _ensure_state_id(userB, "state_id", db)
    with contextlib.suppress(Exception):
        db.commit()

    state_hash = primeA * primeB

    if not force:
        cached = _cache_find_user_user(u_a, u_b, state_hash)
        if cached is not None:
            return cached
        cached_rev = _cache_find_user_user(u_b, u_a, state_hash)
        if cached_rev is not None:
            _cache_write_user_user(u_a, u_b, state_hash, cached_rev)
            return cached_rev

    kw_a = (user_keywords_collection.find_one({"user_id": u_a}) or {}).get("keywords", [])
    kw_b = (user_keywords_collection.find_one({"user_id": u_b}) or {}).get("keywords", [])

    score_val = _score_pair(
        _canonize_kw_list(kw_a),
        _canonize_kw_list(kw_b),
        metric=metric,
        lift_tail_b=lift_tail_b,
    )

    _cache_write_user_user(u_a, u_b, state_hash, score_val)
    if mirror:
        _cache_write_user_user(u_b, u_a, state_hash, score_val)

    return score_val

# ───────────────────────────────── Public API ─────────────────────────────────
def update_user_to_restaurant_score(
    u_id: int,
    r_id: int,
    *,
    db: Optional[Session] = Depends(get_db),
    metric: str = "cosine",      # accepted but ignored
    lift_tail_b: int = 1,        # kept for signature; no skew applied
    force_update: bool = False,
) -> Union[float, Tuple[float, List[Dict[str, Any]], List[Dict[str, Any]]]]:
    local = db is None or not isinstance(db, Session)
    if local:
        db_gen = get_db()
        db = next(db_gen)

    try:
        score_val = _compute_user_rest_score(
            u_id, r_id, db, metric=metric, lift_tail_b=lift_tail_b, force=force_update
        )
        if not force_update:
            return score_val

        # Return stripped keyword docs for debug purposes
        kw_user = (
            user_keywords_collection.find_one({"user_id": u_id}) or {}
        ).get("keywords", [])
        kw_rest = (
            restaurant_keywords_collection.find_one({"r_id": r_id}) or {}
        ).get("keywords", [])

        strip = lambda rec: {
            "keyword": rec["token"],
            "sentiment": rec.get("sentiment", "positive"),
            "frequency": rec.get("frequency", 1),
        }

        return (
            score_val,
            [strip(r) for r in _canonize_kw_list(kw_user)],
            [strip(r) for r in _canonize_kw_list(kw_rest)],
        )
    finally:
        if local:
            db.close()
            with contextlib.suppress(StopIteration):
                next(db_gen)

def update_user_to_user_score(
    u_id_a: int,
    u_id_b: int,
    *,
    db: Optional[Session] = Depends(get_db),
    metric: str = "cosine",
    lift_tail_b: int = 1,
    mirror: bool = True,
    force_update: bool = False,
) -> Union[float, Tuple[float, List[Dict[str, Any]], List[Dict[str, Any]]]]:
    local = db is None or not isinstance(db, Session)
    if local:
        db_gen = get_db()
        db = next(db_gen)

    try:
        score_val = _compute_user_user_score(
            u_id_a,
            u_id_b,
            db,
            metric=metric,
            lift_tail_b=lift_tail_b,
            force=force_update,
            mirror=mirror,
        )
        if not force_update:
            return score_val

        kw_a = (
            user_keywords_collection.find_one({"user_id": u_id_a}) or {}
        ).get("keywords", [])
        kw_b = (
            user_keywords_collection.find_one({"user_id": u_id_b}) or {}
        ).get("keywords", [])

        strip = lambda rec: {
            "keyword": rec["token"],
            "sentiment": rec.get("sentiment", "positive"),
            "frequency": rec.get("frequency", 1),
        }

        return (
            score_val,
            [strip(r) for r in _canonize_kw_list(kw_a)],
            [strip(r) for r in _canonize_kw_list(kw_b)],
        )
    finally:
        if local:
            db.close()
            with contextlib.suppress(StopIteration):
                next(db_gen)

def batch_user_rest_scores(                       # <─ public helper
    u_id: int,
    r_ids: list[int],
    *,
    db: Session,
    threshold: float      = THRESHOLD,
    lift_tail_b: int      = 1,
    max_workers: int | None = None,
) -> dict[int, float]:
    """
    Vector‑friendly batch computation of *compatibility scores* for one user
    against many restaurants.

    Parameters
    ----------
    u_id        : target user
    r_ids       : list of restaurant IDs
    db          : **local** SQLAlchemy session (use Depends(get_db) in routes)
    threshold   : cosine cut‑off forwarded to `_score_pair`
    lift_tail_b : skew param – keep at 1 for linear mapping
    max_workers : override for thread pool size (defaults to 2×CPU)

    Returns
    -------
    {r_id: score(float in 0–100)}
    """
    if not r_ids:
        return {}

    # ── 1. ONE read for the user keyword profile ─────────────────────────────
    kw_user_raw = (user_keywords_collection.find_one({"user_id": u_id}) or {}) \
                     .get("keywords", [])
    kw_user = _canonize_kw_list(kw_user_raw)
    if not kw_user:
        # anonymous / cold‑start – everybody gets 0.0
        return {r: 0.0 for r in r_ids}

    # ── 2. ONE bulk read for all requested restaurants ───────────────────────
    rest_kw_cursor = restaurant_keywords_collection.find(
        {"r_id": {"$in": r_ids}},
        {"_id": 0, "r_id": 1, "keywords": 1},
    )
    rest_kw_map = {
        doc["r_id"]: _canonize_kw_list(doc.get("keywords", []))
        for doc in rest_kw_cursor
    }

    # ── 3. Threaded fan‑out of the pure‑Python/NumPy scorer ───────────────────
    def _score_single(r_id: int) -> tuple[int, float]:
        kw_rest = rest_kw_map.get(r_id, [])
        s = _score_pair(
            kw_user,
            kw_rest,
            threshold=threshold,
            lift_tail_b=lift_tail_b,
        )
        return r_id, s

    pool_size = max_workers or min(len(r_ids), os.cpu_count() * 2)
    with ThreadPoolExecutor(max_workers=pool_size) as ex:
        fut_map = {ex.submit(_score_single, rid): rid for rid in r_ids}
        scores  = {rid: 0.0 for rid in r_ids}           # default fallback
        for fut in as_completed(fut_map):
            r_id, val = fut.result()
            scores[r_id] = val

    return scores