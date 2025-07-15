import contextlib
from typing import List, Dict, Union, Optional

import numpy as np
from fastapi import Depends
from sqlalchemy.orm import Session

from ..connection.mysqldb import Users, Restaurant, get_db
from ..connection.mongodb import (
    user_keywords_collection,
    restaurant_keywords_collection,
    user_rest_score,
)
from .utilities import random_prime_in_range, PRIME_LOWER_CAP, PRIME_UPPER_CAP

THRESHOLD: float = 0.6 

def skew_score(score: float, b: int = 15) -> float:
    """
    Apply logarithmic skew to *score* (expected 0‒1).
    The curve maps lower raw scores to proportionally higher
    skewed values, keeping 0 → 0 and 1 → 1.
    """
    return np.log(1 + (b - 1) * score) / np.log(b)

def cosine_similarity(vec_a: Union[List[float], np.ndarray],
                      vec_b: Union[List[float], np.ndarray]) -> float:
    """
    Cosine similarity between two equal-length vectors.
    Returns 0.0 if either vector is all-zeros.
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

def score_user_to_restaurant(
    user_keywords: List[Dict],
    restaurant_keywords: List[Dict],
    threshold: float = THRESHOLD,
    b: int = 15,
) -> float:
    """
    Compare one user profile to a restaurant profile.

    * user_keywords   ‒ Each dict has keys:
        {"name", "sentiment", "frequency", "embedding"}
    * restaurant_keywords ‒ Each dict has keys:
        {"keyword", "frequency", "embedding"}

    Returns:
        float ∈ [0, 100]  – skewed & clamped compatibility score.
    """

    # Build fast lookup tables {keyword: vector}
    u_vecs = {kw["name"]: np.asarray(kw["embedding"], dtype=np.float32)
              for kw in user_keywords}
    r_vecs = {kw["keyword"]: np.asarray(kw["embedding"], dtype=np.float32)
              for kw in restaurant_keywords}

    score_sum: float = 0.0
    matched_r_keys: set[str] = set()

    for u in user_keywords:
        u_key   = u["name"]
        u_vec   = u_vecs[u_key]
        u_sent  = u.get("sentiment", "positive")  # default → positive
        u_freq  = u.get("frequency", 1)

        best_sim: float = 0.0
        best_rest_kw: Dict | None = None

        for r in restaurant_keywords:
            r_key = r["keyword"]
            if r_key in matched_r_keys:           # don’t reuse a rest keyword
                continue

            sim_val = cosine_similarity(u_vec, r_vecs[r_key])
            if sim_val >= threshold and sim_val > best_sim:
                best_sim = sim_val
                best_rest_kw = r

        if best_rest_kw is not None:
            matched_r_keys.add(best_rest_kw["keyword"])

            sentiment_sign = 1 if u_sent == "positive" else -1
            r_freq = best_rest_kw.get("frequency", 1)

            weight = (u_freq or 1) * (r_freq or 1)
            score_sum += sentiment_sign * weight

    total_u_weight = sum(u.get("frequency", 1) for u in user_keywords)
    total_r_weight = sum(r.get("frequency", 1) for r in restaurant_keywords)
    norm_factor = (total_u_weight + total_r_weight) / 2.0 or 1.0

    raw_score = max(0.0, score_sum / norm_factor)  # negative → 0
    skewed = skew_score(raw_score, b=b)

    return min(max(skewed * 100.0, 0.0), 100.0)

def score_user_to_user(
    userA_keywords: List[Dict],
    userB_keywords: List[Dict],
    threshold: float = THRESHOLD,
    b: int = 15,
) -> float:
    """
    Symmetrical compatibility between two users.

    Input list format is identical for both users:
        {"keyword", "sentiment", "frequency", "embedding"}

    Returns:
        float ∈ [0, 100] – skewed & clamped similarity score.
    """

    # Pre-compute embedding lookups
    vecsA = {kw["keyword"]: np.asarray(kw["embedding"], dtype=np.float32)
             for kw in userA_keywords}
    vecsB = {kw["keyword"]: np.asarray(kw["embedding"], dtype=np.float32)
             for kw in userB_keywords}

    similarity_sum: float = 0.0
    matched_B: set[str] = set()

    # Greedy best-match pairing (A → B)
    for a in userA_keywords:
        a_key   = a["keyword"]
        a_vec   = vecsA[a_key]
        a_sent  = a.get("sentiment", "positive")
        a_freq  = a.get("frequency", 1)

        best_sim: float = 0.0
        best_b: Dict | None = None

        for b_kw in userB_keywords:
            b_key = b_kw["keyword"]
            if b_key in matched_B:
                continue

            sim_val = cosine_similarity(a_vec, vecsB[b_key])
            if sim_val >= threshold and sim_val > best_sim:
                best_sim = sim_val
                best_b = b_kw

        if best_b is not None:
            matched_B.add(best_b["keyword"])

            b_sent = best_b.get("sentiment", "positive")
            b_freq = best_b.get("frequency", 1)

            # +1 for sentiment agreement, −1 for disagreement
            sentiment_factor = 1 if a_sent == b_sent else -1
            weight = (a_freq or 1) * (b_freq or 1)
            similarity_sum += sentiment_factor * weight

    # Normalise
    total_A = sum(a.get("frequency", 1) for a in userA_keywords)
    total_B = sum(b.get("frequency", 1) for b in userB_keywords)
    norm_factor = (total_A + total_B) / 2.0 or 1.0

    raw_score = max(0.0, similarity_sum / norm_factor)  # negative → 0
    skewed = skew_score(raw_score, b=b)

    return min(max(skewed * 100.0, 0.0), 100.0)

def _ensure_state_id(obj, attr: str, db: Session) -> int:
    """Guarantee a prime-valued `state_id` on a SQLAlchemy row."""
    val = getattr(obj, attr)
    if val is None:
        val = random_prime_in_range(PRIME_LOWER_CAP, PRIME_UPPER_CAP)
        setattr(obj, attr, val)
        db.add(obj)
        db.flush()                  # caller commits
    return val


def _compute_score(u_id: int, r_id: int, db: Session) -> float:
    """Core logic, split out so we can reuse it in two wrappers."""
    # 1.  Load SQL rows and ensure version-tracking primes ---------------------
    user_obj = db.query(Users).filter(Users.user_id == u_id).first()
    rest_obj = db.query(Restaurant).filter(Restaurant.restaurant_id == r_id).first()
    if user_obj is None or rest_obj is None:
        raise ValueError("Invalid u_id or r_id supplied.")

    uid_prime = _ensure_state_id(user_obj, "state_id", db)
    rid_prime = _ensure_state_id(rest_obj, "state_id", db)

    # 2.  Persist any new primes in a single commit ---------------------------
    with contextlib.suppress(Exception):
        db.commit()

    current_hash: int = uid_prime * rid_prime

    # 3.  Check MongoDB cache --------------------------------------------------
    proj = {"scores.$": 1}
    cached_parent = user_rest_score.find_one(
        {"u_id": u_id, "scores.r_id": r_id, "scores.state_id": current_hash},
        proj,
    )
    if cached_parent and cached_parent["scores"]:
        return cached_parent["scores"][0]["score"]          # cache hit ✅

    # 4.  Compute fresh score --------------------------------------------------
    user_kw = (user_keywords_collection
               .find_one({"user_id": u_id}) or {}).get("keywords", [])
    rest_kw = (restaurant_keywords_collection
               .find_one({"r_id": r_id}) or {}).get("keywords", [])
    fresh_score: float = score_user_to_restaurant(user_kw, rest_kw)

    # 5.  Upsert parent doc (no array manipulation yet) ---------------------------
    user_rest_score.update_one(
        {"u_id": u_id},
        {"$setOnInsert": {"u_id": u_id, "scores": []}},
        upsert=True,
    )

    # 6.  Remove any old snapshot for this restaurant -----------------------------
    user_rest_score.update_one(
        {"u_id": u_id},
        {"$pull": {"scores": {"r_id": r_id}}},
    )

    # 7.  Push the fresh snapshot --------------------------------------------------
    user_rest_score.update_one(
        {"u_id": u_id},
        {"$push": {"scores": {
            "r_id": r_id,
            "state_id": current_hash,
            "score": fresh_score,
        }}},
    )

    return fresh_score

def update_user_to_restaurant_score(
    u_id: int,
    r_id: int,
    db: Optional[Session] = Depends(get_db),
) -> float:
    """
    Return a compatibility score between *user* and *restaurant*.

    Works in three scenarios:
    1. FastAPI route → FastAPI injects an open Session.
    2. Plain script / REPL  → *db* is **None** or a Depends sentinel,
       so we create and later close our own session.
    3. Caller explicitly passes a Session → we just use it.
    """
    # Detect whether we must create/clean up our own session ------------------
    needs_local_session = db is None or not isinstance(db, Session)
    if needs_local_session:
        db_gen = get_db()
        db = next(db_gen)

    try:
        return _compute_score(u_id, r_id, db)
    finally:
        if needs_local_session:     # avoid leaking connections
            db.close()
            with contextlib.suppress(StopIteration):
                next(db_gen)