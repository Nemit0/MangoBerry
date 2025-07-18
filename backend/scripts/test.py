import argparse
import json
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import numpy as np
from sqlalchemy.orm import Session

# ──────────────────────────────── project imports ──────────────────────────
from backend.connection.mysqldb import Users, Restaurant, get_db          # SQL
from backend.connection.mongodb import (                                 # Mongo
    user_keywords_collection,
    restaurant_keywords_collection,
)
from backend.services.calc_score import (                                # canon helpers
    _canonize_kw_list,
)

# ────────────────────────────── cosine utility ────────────────────────────
def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    """Return cosine sim in [‑1,1]; 0 if either vec is all‑zero."""
    if not a.any() or not b.any():
        return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


# ─────────────────────────── similarity map fn ────────────────────────────
def keyword_similarity_map(
    user_kw: Iterable[Dict],
    rest_kw: Iterable[Dict],
    *,
    embed_dim: int = 1536,
) -> List[Tuple[str, str, float]]:
    """
    Return list of (user_token, rest_token, cosine) for *all* pairs.
    Tokens whose embeddings are malformed (wrong length) are skipped.
    """
    # canonicalise → list[dict]  each dict = {"token", "embedding", ...}
    kw_u = _canonize_kw_list(user_kw)
    kw_r = _canonize_kw_list(rest_kw)

    results: List[Tuple[str, str, float]] = []
    for rec_u in kw_u:
        emb_u = rec_u["embedding"]
        if emb_u.size != embed_dim:
            continue
        for rec_r in kw_r:
            emb_r = rec_r["embedding"]
            if emb_r.size != embed_dim:
                continue
            cos = _cosine(emb_u, emb_r)
            results.append((rec_u["token"], rec_r["token"], cos))

    # Highest cosine first
    results.sort(key=lambda x: x[2], reverse=True)
    return results


# ────────────────────────────────── main ──────────────────────────────────
def main() -> None:
    p = argparse.ArgumentParser(description="Full keyword‑similarity map")
    p.add_argument("--user", type=int, required=True, help="user_id")
    p.add_argument("--rest", type=int, required=True, help="restaurant_id")
    p.add_argument("--top", type=int, default=0,
                   help="limit printed rows (0 = all)")
    p.add_argument("--show-zero", action="store_true",
                   help="include cosine == 0 pairs")
    p.add_argument("--matrix-json", type=Path, default=None,
                   help="save full similarity map to this JSON file")
    args = p.parse_args()

    # DB session
    db_gen = get_db()
    db: Session = next(db_gen)

    try:
        user_doc = user_keywords_collection.find_one({"user_id": args.user}) or {}
        rest_doc = restaurant_keywords_collection.find_one({"r_id": args.rest}) or {}
        print(len(user_doc.get("keywords", [])), "user keywords found.")
        print(len(rest_doc.get("keywords", [])), "restaurant keywords found.")

        pairs = keyword_similarity_map(
            user_doc.get("keywords", []),
            rest_doc.get("keywords", []),
        )

    finally:
        db.close()
        try:
            next(db_gen)
        except StopIteration:
            pass

    if not args.show_zero:
        pairs = [tpl for tpl in pairs if tpl[2] != 0.0]
    if args.top:
        pairs = pairs[: args.top]

    # pretty print
    print(f"\nUser {args.user} ↔ Restaurant {args.rest}")
    print("user_keyword".ljust(25), "rest_keyword".ljust(25), "cosine")
    print("-" * 60)
    for u_tok, r_tok, cos in pairs:
        print(u_tok.ljust(25)[:24], r_tok.ljust(25)[:24], f"{cos:6.3f}")

    # optional JSON dump of *entire* matrix (not just --top slice)
    if args.matrix_json:
        args.matrix_json.write_text(json.dumps(pairs, ensure_ascii=False, indent=2))
        print(f"\nSaved similarity map → {args.matrix_json.resolve()}")


if __name__ == "__main__":
    main()