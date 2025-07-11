import numpy as np
from typing import List, Dict, Union

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
        {"keyword", "sentiment", "frequency", "embedding"}
    * restaurant_keywords ‒ Each dict has keys:
        {"keyword", "frequency", "embedding"}

    Returns:
        float ∈ [0, 100]  – skewed & clamped compatibility score.
    """

    # Build fast lookup tables {keyword: vector}
    u_vecs = {kw["keyword"]: np.asarray(kw["embedding"], dtype=np.float32)
              for kw in user_keywords}
    r_vecs = {kw["keyword"]: np.asarray(kw["embedding"], dtype=np.float32)
              for kw in restaurant_keywords}

    score_sum: float = 0.0
    matched_r_keys: set[str] = set()

    for u in user_keywords:
        u_key   = u["keyword"]
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


if __name__ == "__main__":
    # Example usage
    from backend.services.generate_embedding import embed_small

    user_keywords = [
        {"keyword": "pizza", "sentiment": "positive", "frequency": 3, "embedding": embed_small("pizza")[0]},
        {"keyword": "pasta", "sentiment": "negative", "frequency": 1, "embedding": embed_small("pasta")[0]}
    ]
    restaurant_keywords = [
        {"keyword": "pizza", "frequency": 2, "embedding": embed_small("pizza")[0]},
        {"keyword": "salad", "frequency": 1, "embedding": embed_small("salad")[0]}
    ]

    score = score_user_to_restaurant(user_keywords, restaurant_keywords, threshold=0.9)
    print(f"User to Restaurant Score: {score:.2f}")