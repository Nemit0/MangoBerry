import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..connection.mysqldb import (
    get_db,
    Users,
    Restaurant,
)
from ..connection.elasticdb import es_client as es
from ..connection.mongodb import (
    photo_collection,
    review_keywords_collection,
    user_keywords_collection,
    restaurant_keywords_collection,
    user_rest_score,
)
from ..services.calc_score import score_user_to_restaurant

router = APIRouter()

# ───────────────────────────────────────────────────────────────────

@router.get("/search_review_es", tags=["Reviews"])
def search_review_es(  # noqa: C901 – single endpoint contains all logic
    text: Optional[str] = Query(
        None,
        description=(
            "Full-text search across review, comments and nickname. "
            "If omitted, the latest reviews are returned."
        ),
    ),
    viewer_id: Optional[int] = Query(
        None,
        description=(
            "User ID of the *viewer* (NOT the author) – required to compute "
            "personalised compatibility scores."
        ),
    ),
    user_id: Optional[int] = Query(None, description="Filter by review author ID."),
    restaurant_id: Optional[int] = Query(None, description="Filter by restaurant ID."),
    size: int = Query(50, gt=1, le=500),
    sort: str = Query(
        "recent", pattern="^(recent|frequent)$", description='Sort order: "recent" | "frequent"'
    ),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Search reviews in Elasticsearch, enrich each hit with relational and
    document data, compute per-viewer rating (0–100), and return a structure
    directly consumable by *frontend/src/pages/PostList.js*.

    Parameters
    ----------
    text : str | None
        Full-text query string.
    viewer_id : int | None
        Logged-in user ID requesting the feed – needed for rating.
    user_id : int | None
        Author filter.
    restaurant_id : int | None
        Restaurant filter.
    size : int
        Maximum number of hits to return.
    sort : {"recent", "frequent"}
        Sort strategy.
    """
    # ─── 1. Build the Elasticsearch query ──────────────────────────
    must: List[Dict[str, Any]] = []

    if text:
        must.append(
            {
                "simple_query_string": {
                    "query": text,
                    "fields": ["review", "comments", "nickname"],
                    "default_operator": "and",
                }
            }
        )
    if user_id is not None:
        must.append({"term": {"user_id": user_id}})
    if restaurant_id is not None:
        must.append({"term": {"restaurant_id": restaurant_id}})

    es_query = {
        "_source": [
            "review_id",
            "restaurant_id",
            "user_id",
            "comments",
            "review",
            "nickname",
            "created_at",
        ],
        "query": {"bool": {"must": must or [{"match_all": {}}]}},
        "sort": [{"created_at": {"order": "desc"}}],  # recency sort always applied
        "size": size,
    }

    try:
        hits = es.search(index="user_review_nickname", body=es_query)["hits"]["hits"]
    except Exception as exc:  # pragma: no cover
        raise HTTPException(500, f"Elasticsearch query failed → {exc}") from exc

    # ─── 2. Prepare enrichment helpers ─────────────────────────────
    # Pre-cache all restaurants we'll need in a single DB query
    rest_ids = {h["_source"]["restaurant_id"] for h in hits if h["_source"]["restaurant_id"] is not None}
    rest_map = {
        r.restaurant_id: r
        for r in db.query(Restaurant).filter(Restaurant.restaurant_id.in_(rest_ids)).all()
    }

    # (Optional) cache viewer keyword data once
    viewer_keywords_doc = (
        user_keywords_collection.find_one({"user_id": viewer_id}) if viewer_id is not None else None
    )
    viewer_keywords: List[Dict[str, Any]] = viewer_keywords_doc.get("keywords", []) if viewer_keywords_doc else []
    viewer_state_id: Optional[int] = (
        db.query(Users.state_id).filter(Users.user_id == viewer_id).scalar() if viewer_id else None
    )

    results: List[Dict[str, Any]] = []

    # ─── 3. Enrich each hit ────────────────────────────────────────
    for h in hits:
        src = h["_source"]

        # 3-a. Relational enrichment (restaurant name + state_id)
        r_obj = rest_map.get(src["restaurant_id"])
        restaurant_name: str | None = getattr(r_obj, "name", None)
        restaurant_state_id: Optional[int] = getattr(r_obj, "state_id", None)

        # 3-b. Images (MongoDB)
        img_cursor = photo_collection.find({"review_id": src["review_id"]})
        images: List[str] = [doc["photo_urls"] for doc in img_cursor]

        # 3-c. Keywords for this review (MongoDB)
        kw_doc = review_keywords_collection.find_one({"review_id": src["review_id"]}) or {}
        pos_kw = kw_doc.get("positive_keywords", [])
        neg_kw = kw_doc.get("negative_keywords", [])
        keywords: List[str] = pos_kw + neg_kw

        # 3-d. Personalised rating (0‒100, or 0 if viewer_id missing)
        rating: float = 0.0
        if viewer_id is not None and restaurant_state_id is not None and viewer_state_id is not None:
            current_product_state = viewer_state_id * restaurant_state_id

            cache_doc = user_rest_score.find_one(
                {"u_id": viewer_id, "scores.r_id": src["restaurant_id"]},
                {"scores.$": 1},
            )

            cache_hit: Optional[Dict[str, Any]] = (
                cache_doc["scores"][0] if cache_doc and "scores" in cache_doc else None
            )

            if cache_hit and cache_hit.get("state_id") == current_product_state:
                rating = float(cache_hit.get("score", 0.0))
            else:
                # Recompute score and update cache
                rest_kw_doc = restaurant_keywords_collection.find_one({"r_id": src["restaurant_id"]}) or {}
                rest_kw = rest_kw_doc.get("keywords", [])

                rating = score_user_to_restaurant(viewer_keywords, rest_kw)

                user_rest_score.update_one(
                    {"u_id": viewer_id},
                    {
                        "$pull": {"scores": {"r_id": src["restaurant_id"]}},
                        "$push": {
                            "scores": {
                                "r_id": src["restaurant_id"],
                                "state_id": current_product_state,
                                "score": rating,
                            }
                        },
                    },
                    upsert=True,
                )

        # 3-e. Assemble result object
        results.append(
            {
                "review_id": src["review_id"],
                "restaurant_id": src["restaurant_id"],
                "restaurant_name": restaurant_name,
                "user_id": src["user_id"],
                "nickname": src.get("nickname") or "Unknown",
                "comments": src.get("comments", ""),
                "review": src.get("review", ""),
                "created_at": src.get("created_at"),
                "rating": rating,
                "images": images,
                "keywords": keywords,
            }
        )

    # ─── 4. Sorting (if requested) ─────────────────────────────────
    if sort == "frequent":
        # Highest rating first; tie-break by created_at DESC
        results.sort(key=lambda r: (r["rating"], r["created_at"] or ""), reverse=True)

    # ─── 5. Debug log + return ─────────────────────────────────────
    print("[search_review_es] →", json.dumps(results, ensure_ascii=False, indent=2))

    return {"success": True, "result": results}