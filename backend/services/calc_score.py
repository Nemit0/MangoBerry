import contextlib
import numpy as np
import logging

from typing import List, Dict, Union, Optional, Iterable, Tuple, Any
from logging import debug
from fastapi import Depends
from sqlalchemy.orm import Session

from ..connection.mysqldb import Users, Restaurant, get_db
from ..connection.mongodb import (
    user_keywords_collection,
    restaurant_keywords_collection,
    user_rest_score,
    user_user_score
)
from .utilities import random_prime_in_range, PRIME_LOWER_CAP, PRIME_UPPER_CAP

# --------------------------------------------------------------------------- #
# Tunables
# --------------------------------------------------------------------------- #

THRESHOLD: float = 0.6 
SKEW_B: int = 15


# --------------------------------------------------------------------------- #
# Math helpers
# --------------------------------------------------------------------------- #

def skew_score(score: float, b: int = SKEW_B) -> float:
    """
    Logarithmic "lift the tail" transform for values in [0,1].
    Keeps endpoints fixed; compresses high end slightly; lifts low end.
    """
    return np.log(1 + (b - 1) * score) / np.log(b)


def cosine_similarity(vec_a: Union[List[float], np.ndarray],
                      vec_b: Union[List[float], np.ndarray]) -> float:
    """
    Cosine similarity between two equal-length vectors.
    Returns 0.0 if either vector has zero L2 norm.
    """
    a = np.asarray(vec_a, dtype=np.float32)
    b = np.asarray(vec_b, dtype=np.float32)
    if a.shape != b.shape:
        raise ValueError("Vectors must be of the same dimension")
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


# --------------------------------------------------------------------------- #
# Keyword canonicalization
# --------------------------------------------------------------------------- #

def _canon_token(rec: Dict[str, Any]) -> str:
    """Extract the keyword string regardless of source field naming."""
    if "token" in rec:
        return rec["token"]
    if "name" in rec:
        return rec["name"]
    if "keyword" in rec:
        return rec["keyword"]
    # fallback: try label / word etc.
    for k in ("word", "text", "label"):
        if k in rec:
            return rec[k]
    raise KeyError("No keyword-like field found in record: %r" % rec)


def _canon_sentiment(rec: Dict[str, Any]) -> str:
    """Default to 'positive' when absent."""
    return rec.get("sentiment") or "positive"


def _canon_frequency(rec: Dict[str, Any]) -> int:
    """Coerce freq to positive int; floor to 1."""
    try:
        v = int(rec.get("frequency", 1))
    except Exception:
        v = 1
    return v if v > 0 else 1


def _canon_embedding(rec: Dict[str, Any]) -> np.ndarray:
    """Return float32 numpy vector (empty→0-len array)."""
    emb = rec.get("embedding", [])
    return np.asarray(emb, dtype=np.float32)


def _canonize_kw_list(records: Optional[Iterable[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    """
    Normalize a heterogenous incoming keyword list into canonical form.

    Returns list-of-dicts; each dict guaranteed to have keys:
        token, sentiment, frequency, embedding(np.ndarray[float32])
    """
    if not records:
        return []
    canon: List[Dict[str, Any]] = []
    for rec in records:
        try:
            canon.append({
                "token": _canon_token(rec),
                "sentiment": _canon_sentiment(rec),
                "frequency": _canon_frequency(rec),
                "embedding": _canon_embedding(rec),
            })
        except Exception:
            # Skip malformed entries silently; alternatively log/raise.
            continue
    return canon


# --------------------------------------------------------------------------- #
# Core scoring kernels (operate on canonicalized lists)
# --------------------------------------------------------------------------- #

def score_user_to_restaurant(
    user_keywords: List[Dict[str, Any]],
    restaurant_keywords: List[Dict[str, Any]],
    threshold: float = THRESHOLD,
    b: int = SKEW_B,
) -> float:
    """
    Compare one user profile to one restaurant profile.

    Canonical inputs (see _canonize_kw_list).
    Returns [0,100].
    """
    u_kw = _canonize_kw_list(user_keywords)
    r_kw = _canonize_kw_list(restaurant_keywords)

    # Quick exits
    if not u_kw or not r_kw:
        return 0.0

    # Fast lookup: restaurant token -> vec
    r_vecs = {rec["token"]: rec["embedding"] for rec in r_kw}

    score_sum: float = 0.0
    matched_r: set[str] = set()

    for u in u_kw:
        u_token = u["token"]
        u_vec = u["embedding"]
        u_sent = u["sentiment"]
        u_freq = u["frequency"]

        best_sim = 0.0
        best_token = None
        best_r_freq = 1

        for r in r_kw:
            token_r = r["token"]
            if token_r in matched_r:
                continue
            sim_val = cosine_similarity(u_vec, r_vecs[token_r])
            if sim_val >= threshold and sim_val > best_sim:
                best_sim = sim_val
                best_token = token_r
                best_r_freq = r["frequency"]

        if best_token is not None:
            matched_r.add(best_token)
            sentiment_sign = 1 if u_sent == "positive" else -1
            weight = (u_freq or 1) * (best_r_freq or 1)
            score_sum += sentiment_sign * weight

    total_u_weight = sum(rec["frequency"] for rec in u_kw)
    total_r_weight = sum(rec["frequency"] for rec in r_kw)
    norm_factor = (total_u_weight + total_r_weight) / 2.0 or 1.0

    raw_score = max(0.0, score_sum / norm_factor)  # negatives clamp to 0
    skewed = skew_score(raw_score, b=b)
    return min(max(skewed * 100.0, 0.0), 100.0)


def score_user_to_user(
    userA_keywords: List[Dict[str, Any]],
    userB_keywords: List[Dict[str, Any]],
    threshold: float = THRESHOLD,
    b: int = SKEW_B,
) -> float:
    """
    Symmetric compatibility between two users.
    Sentiment agreement increases, disagreement reduces.
    Returns [0,100].
    """
    kwA = _canonize_kw_list(userA_keywords)
    kwB = _canonize_kw_list(userB_keywords)

    if not kwA or not kwB:
        return 0.0

    vecsB = {rec["token"]: rec["embedding"] for rec in kwB}

    similarity_sum: float = 0.0
    matched_B: set[str] = set()

    for a in kwA:
        a_token = a["token"]
        a_vec = a["embedding"]
        a_sent = a["sentiment"]
        a_freq = a["frequency"]

        best_sim = 0.0
        best_b_token = None
        best_b_sent = "positive"
        best_b_freq = 1

        for b_rec in kwB:
            b_token = b_rec["token"]
            if b_token in matched_B:
                continue
            sim_val = cosine_similarity(a_vec, vecsB[b_token])
            if sim_val >= threshold and sim_val > best_sim:
                best_sim = sim_val
                best_b_token = b_token
                best_b_sent = b_rec["sentiment"]
                best_b_freq = b_rec["frequency"]

        if best_b_token is not None:
            matched_B.add(best_b_token)
            sentiment_factor = 1 if a_sent == best_b_sent else -1
            weight = (a_freq or 1) * (best_b_freq or 1)
            similarity_sum += sentiment_factor * weight

    total_A = sum(rec["frequency"] for rec in kwA)
    total_B = sum(rec["frequency"] for rec in kwB)
    norm_factor = (total_A + total_B) / 2.0 or 1.0

    raw_score = max(0.0, similarity_sum / norm_factor)
    skewed = skew_score(raw_score, b=b)
    return min(max(skewed * 100.0, 0.0), 100.0)


# --------------------------------------------------------------------------- #
# SQL state helpers
# --------------------------------------------------------------------------- #

def _ensure_state_id(obj: Any, attr: str, db: Session) -> int:
    """
    Guarantee a prime-valued `state_id` attribute on the given SQLAlchemy row.
    Lazily assigns one when missing.
    """
    val = getattr(obj, attr)
    if val is None:
        val = random_prime_in_range(PRIME_LOWER_CAP, PRIME_UPPER_CAP)
        setattr(obj, attr, val)
        db.add(obj)
        db.flush()  # caller commits
    return val


# --------------------------------------------------------------------------- #
# Mongo cache utility ops
# --------------------------------------------------------------------------- #

def _cache_find_user_rest(u_id: int, r_id: int, state_hash: int) -> Optional[float]:
    """Return cached user↔restaurant score if present and valid."""
    proj = {"scores.$": 1}
    doc = user_rest_score.find_one(
        {"u_id": u_id, "scores.r_id": r_id, "scores.state_id": state_hash},
        proj,
    )
    if doc and doc.get("scores"):
        return doc["scores"][0]["score"]
    return None


def _cache_write_user_rest(u_id: int, r_id: int, state_hash: int, score_val: float) -> None:
    """Upsert + replace cached snapshot for a user↔restaurant pair."""
    user_rest_score.update_one(
        {"u_id": u_id},
        {"$setOnInsert": {"u_id": u_id, "scores": []}},
        upsert=True,
    )
    user_rest_score.update_one(
        {"u_id": u_id},
        {"$pull": {"scores": {"r_id": r_id}}},
    )
    user_rest_score.update_one(
        {"u_id": u_id},
        {"$push": {"scores": {
            "r_id": r_id,
            "state_id": state_hash,
            "score": score_val,
        }}},
    )


def _cache_find_user_user(holder_u_id: int, partner_u_id: int, state_hash: int) -> Optional[float]:
    """Lookup cached user↔user score stored under *holder_u_id* doc."""
    proj = {"scores.$": 1}
    doc = user_user_score.find_one(
        {"u_id": holder_u_id, "scores.u_id": partner_u_id, "scores.state_id": state_hash},
        proj,
    )
    if doc and doc.get("scores"):
        return doc["scores"][0]["score"]
    return None


def _cache_write_user_user(holder_u_id: int, partner_u_id: int, state_hash: int, score_val: float) -> None:
    """
    Upsert + replace cached snapshot for one direction (holder → partner).

    Called twice (once per direction) when mirroring is enabled.
    """
    user_user_score.update_one(
        {"u_id": holder_u_id},
        {"$setOnInsert": {"u_id": holder_u_id, "scores": []}},
        upsert=True,
    )
    user_user_score.update_one(
        {"u_id": holder_u_id},
        {"$pull": {"scores": {"u_id": partner_u_id}}},
    )
    user_user_score.update_one(
        {"u_id": holder_u_id},
        {"$push": {"scores": {
            "u_id": partner_u_id,
            "state_id": state_hash,
            "score": score_val,
        }}},
    )


# --------------------------------------------------------------------------- #
# Internal compute paths
# --------------------------------------------------------------------------- #

def _compute_user_rest_score(u_id: int, r_id: int, db: Session, force_update: bool) -> float:
    """
    Core user↔restaurant compute path. Assumes *db* is an open Session.
    """
    # Load SQL rows -----------------------------------------------------------
    user_obj = db.query(Users).filter(Users.user_id == u_id).first()
    rest_obj = db.query(Restaurant).filter(Restaurant.restaurant_id == r_id).first()
    if user_obj is None or rest_obj is None:
        raise ValueError(
            "Invalid identifiers supplied.",
            f"u_id missing: {u_id}" if user_obj is None else "",
            f"r_id missing: {r_id}" if rest_obj is None else "",
        )

    # Ensure both have a prime `state_id` ------------------------------------
    uid_prime = _ensure_state_id(user_obj, "state_id", db)
    rid_prime = _ensure_state_id(rest_obj, "state_id", db)

    # Persist newly assigned primes ------------------------------------------
    with contextlib.suppress(Exception):
        db.commit()

    # Composite version hash --------------------------------------------------
    current_hash: int = uid_prime * rid_prime

    # Cache check -------------------------------------------------------------
    if not force_update:
        cached = _cache_find_user_rest(u_id, r_id, current_hash)
        if cached is not None:
            return cached

    # Fresh compute -----------------------------------------------------------
    user_kw = (user_keywords_collection.find_one({"user_id": u_id}) or {}).get("keywords", [])
    rest_kw = (restaurant_keywords_collection.find_one({"r_id": r_id}) or {}).get("keywords", [])
    fresh_score = score_user_to_restaurant(user_kw, rest_kw)

    # Cache write -------------------------------------------------------------
    _cache_write_user_rest(u_id, r_id, current_hash, fresh_score)

    return fresh_score


def _compute_user_user_score(
    u_id_a: int,
    u_id_b: int,
    db: Session,
    force_update: bool,
    mirror: bool,
) -> float:
    """
    Core user↔user compute path. Assumes *db* is an open Session.

    *mirror*: when True, store the snapshot under BOTH user docs.
    """
    # Load both users ---------------------------------------------------------
    userA = db.query(Users).filter(Users.user_id == u_id_a).first()
    userB = db.query(Users).filter(Users.user_id == u_id_b).first()
    if userA is None or userB is None:
        raise ValueError(
            "Invalid user id(s) supplied.",
            f"A missing: {u_id_a}" if userA is None else "",
            f"B missing: {u_id_b}" if userB is None else "",
        )

    # Prime state IDs ---------------------------------------------------------
    primeA = _ensure_state_id(userA, "state_id", db)
    primeB = _ensure_state_id(userB, "state_id", db)

    with contextlib.suppress(Exception):
        db.commit()

    # Order-independent hash --------------------------------------------------
    current_hash = primeA * primeB  # commutative

    # Avoid double work when cached ------------------------------------------
    if not force_update:
        cached_a = _cache_find_user_user(u_id_a, u_id_b, current_hash)
        if cached_a is not None:
            return cached_a
        # optionally check reverse (in case mirror disabled earlier)
        cached_b = _cache_find_user_user(u_id_b, u_id_a, current_hash)
        if cached_b is not None:
            # if found only on B, mirror into A for completeness
            _cache_write_user_user(u_id_a, u_id_b, current_hash, cached_b)
            return cached_b

    # Pull keyword payloads ---------------------------------------------------
    kwA = (user_keywords_collection.find_one({"user_id": u_id_a}) or {}).get("keywords", [])
    kwB = (user_keywords_collection.find_one({"user_id": u_id_b}) or {}).get("keywords", [])

    fresh_score = score_user_to_user(kwA, kwB)

    # Cache write(s) ----------------------------------------------------------
    _cache_write_user_user(u_id_a, u_id_b, current_hash, fresh_score)
    if mirror:
        _cache_write_user_user(u_id_b, u_id_a, current_hash, fresh_score)

    return fresh_score


# --------------------------------------------------------------------------- #
# Public API wrappers
# --------------------------------------------------------------------------- #

def update_user_to_restaurant_score(
    u_id: int,
    r_id: int,
    db: Optional[Session] = Depends(get_db),
    force_update: bool = False,
) -> Union[float, Tuple[float, Dict[str, Any], Dict[str, Any]]]:
    """
    Return a compatibility score between *user* and *restaurant*.

    Three usage contexts:
        1. FastAPI route: FastAPI injects an open Session (db param is a Session)
        2. Script / REPL: pass nothing (or None) → we open/close a Session
        3. Existing Session: pass your own Session → we use it

    When `force_update` is truthy, also return the raw keyword docs.
    """
    needs_local_session = db is None or not isinstance(db, Session)
    if needs_local_session:
        db_gen = get_db()
        db = next(db_gen)

    try:
        score_val = _compute_user_rest_score(u_id, r_id, db, force_update=force_update)
        if not force_update:
            return score_val

        kw_user_doc = user_keywords_collection.find_one({"user_id": u_id}) or {}
        kw_rest_doc = restaurant_keywords_collection.find_one({"r_id": r_id}) or {}

        # Filter out embedding field for brevity
        kw_user_doc = [
            {
                "keyword": rec["token"],
                "sentiment": rec["sentiment"],
                "frequency": rec["frequency"]
            } for rec in _canonize_kw_list(kw_user_doc)
        ]
        kw_user_doc = [
            {
                "keyword": rec["token"],
                "sentiment": rec["sentiment"],
                "frequency": rec["frequency"]
            } for rec in _canonize_kw_list(kw_user_doc)
        ]

        return score_val, kw_user_doc, kw_rest_doc
    finally:
        if needs_local_session:
            db.close()
            with contextlib.suppress(StopIteration):
                next(db_gen)


def update_user_to_user_score(
    u_id_a: int,
    u_id_b: int,
    db: Optional[Session] = Depends(get_db),
    force_update: bool = False,
    mirror: bool = True,
) -> Union[float, Tuple[float, Dict[str, Any], Dict[str, Any]]]:
    """
    Return a symmetric compatibility score for two users.

    *mirror* (default True) stores the score under BOTH user docs in
    `user_user_score` so downstream queries can always read from the requesting
    side without a canonical ordering step. Set False if you want to store
    only under `u_id_a` for space or other reasons.

    When `force_update` is truthy, also return the raw keyword docs that were
    compared: (score, kw_a_doc, kw_b_doc).
    """
    needs_local_session = db is None or not isinstance(db, Session)
    if needs_local_session:
        db_gen = get_db()
        db = next(db_gen)

    try:
        score_val = _compute_user_user_score(
            u_id_a,
            u_id_b,
            db,
            force_update=force_update,
            mirror=mirror,
        )
        if not force_update:
            return score_val

        kw_a_doc = user_keywords_collection.find_one({"user_id": u_id_a}) or {}
        kw_b_doc = user_keywords_collection.find_one({"user_id": u_id_b}) or {}

        kw_a_doc = kw_a_doc.get("keywords", [])
        kw_b_doc = kw_b_doc.get("keywords", [])

        kw_a_doc = [
            {
                "keyword": rec["token"],
                "sentiment": rec["sentiment"],
                "frequency": rec["frequency"]
            } for rec in _canonize_kw_list(kw_a_doc)
        ]

        kw_b_doc = [
            {
                "keyword": rec["token"],
                "sentiment": rec["sentiment"],
                "frequency": rec["frequency"]
            } for rec in _canonize_kw_list(kw_b_doc)
        ]
        # Filter out embedding field for brevity
        kw_a_doc = [
            {
                "keyword": rec["token"],
                "sentiment": rec["sentiment"],
                "frequency": rec["frequency"]
            } for rec in _canonize_kw_list(kw_a_doc)
        ]
        kw_b_doc = [
            {
                "keyword": rec["token"],
                "sentiment": rec["sentiment"],
                "frequency": rec["frequency"]
            } for rec in _canonize_kw_list(kw_b_doc)
        ]

        return score_val, kw_a_doc, kw_b_doc
    finally:
        if needs_local_session:
            db.close()
            with contextlib.suppress(StopIteration):
                next(db_gen)
