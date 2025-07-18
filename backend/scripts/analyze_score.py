import contextlib
import random
import os
import json
from collections import defaultdict
from typing import Dict, List

import matplotlib.pyplot as plt
import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from tqdm import tqdm

# ─────────────────────── internal project imports ────────────────────────
# Adjust the import paths if your package layout differs.
from backend.connection.mysqldb import Restaurant, get_db          # SQL‑side
from backend.services.calc_score import update_user_to_restaurant_score  # scorer

# ────────────────────────── configuration knobs ──────────────────────────
USER_IDS: List[int] = [5, 6, 7, 8, 9]      # target cohort
N_RESTAURANTS: int = 100                   # sample size
METRIC: str = "cosine"                  # "euclidean" | "dot" | "cosine"
TAIL_LIFT_B: int = 10                      # 1 disables logarithmic skew
SEED: int | None = 42                      # set None for nondeterministic run

# ────────────────────────────── constants ───────────────────────────────
with open(os.path.join(os.path.dirname(__file__), "unique_r_ids.json"), "r") as f:
    # Load a JSON file containing a list of unique restaurant IDs.
    R_IDS: List[int] = json.load(f)

# ─────────────────────────── helper functions ────────────────────────────
def _sample_restaurant_ids(n: int) -> List[int]:
    """Return *n* distinct restaurant_id values randomly sampled from SQL."""
    rng = random.Random(SEED)
    return rng.sample(R_IDS, n) if SEED is not None else rng.sample(R_IDS, n)

def _compute_scores(
    db: Session, users: List[int], restaurants: List[int]
) -> Dict[int, List[float]]:
    """Return {user_id: [100 score values]}."""
    scores: Dict[int, List[float]] = defaultdict(list)
    for u_id in users:
        for r_id in restaurants:
            score_val: float = update_user_to_restaurant_score(
                u_id=u_id,
                r_id=r_id,
                db=db,
                metric=METRIC,
                lift_tail_b=TAIL_LIFT_B,
                force_update=True
            )
            scores[u_id].append(score_val)
    return scores


def _plot_distributions(scores: Dict[int, List[float]]) -> None:
    """Overlay 5 histograms on a single figure."""
    plt.figure(figsize=(10, 6))
    bins = np.linspace(0, 100, 21)  # 5‑point buckets
    for u_id, vals in scores.items():
        plt.hist(
            vals,
            bins=bins,
            alpha=0.45,
            label=f"User {u_id}",
            edgecolor="black",
            linewidth=0.5,
        )
    plt.xlabel("Compatibility score")
    plt.ylabel("Frequency (out of 100 restaurants)")
    plt.title(
        "User‑to‑Restaurant Score Distributions\n"
        f"metric = {METRIC}, tail‑lift b = {TAIL_LIFT_B}"
    )
    plt.legend()
    plt.tight_layout()
    plt.savefig(".test/score_distributions.png", dpi=300)


# ──────────────────────────────── main() ─────────────────────────────────
def main() -> None:
    # Obtain DB session from your FastAPI generator
    db_gen = get_db()
    db: Session = next(db_gen)
    print("Connected to MySQL database.")
    try:
        restaurant_ids = _sample_restaurant_ids(N_RESTAURANTS)
        score_dict = _compute_scores(db, USER_IDS, restaurant_ids)
        print(f"Computed scores for {len(USER_IDS)} users and {N_RESTAURANTS} restaurants.")
    finally:
        db.close()
        with contextlib.suppress(StopIteration):
            next(db_gen)  # close generator cleanly
    print("Closed database connection.")

    # Quick descriptive stats in console
    for u_id, vals in tqdm(score_dict.items()):
        arr = np.asarray(vals)
        print(
            f"User {u_id}: "
            f"mean = {arr.mean():6.2f}, "
            f"median = {np.median(arr):6.2f}, "
            f"min = {arr.min():6.2f}, "
            f"max = {arr.max():6.2f}"
        )

    # Visualise
    _plot_distributions(score_dict)

if __name__ == "__main__":
    main()