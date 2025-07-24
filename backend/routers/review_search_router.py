from typing import Any, Dict, List, Optional

from fastapi import Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..connection.mysqldb import (
    get_db,
    Users,
    Restaurant,
)
from ..connection.mysqldb import get_db, Users, Restaurant
from ..connection.elasticdb import es_client as es
from ..connection.mongodb import (
    photo_collection,
    review_keywords_collection,
    follow_collection
)

from ..services.calc_score import batch_user_rest_scores


from .common_imports import *

router = APIRouter()

# ───────────────────────────────────────────────────────────────────

@router.get("/search_review_es", tags=["Reviews"])
def search_review_es(
    text: Optional[str] = Query(
        None,
        description=(
            "Full‑text search across review, comments and nickname. "
            "If omitted, the latest reviews are returned."
        ),
    ),
    viewer_id: Optional[int] = Query(
        None,
        description=(
            "User ID of the *viewer* (NOT the author) – required to compute "
            "personalised compatibility scores and follow‑status flags."
        ),
    ),
    user_id: Optional[int] = Query(None, description="Filter by review author ID."),
    restaurant_id: Optional[int] = Query(None, description="Filter by restaurant ID."),
    size: int = Query(50, gt=1, le=500),
    sort: str = Query(
        "recent",
        pattern="^(recent|frequent)$",
        description='Sort order: "recent" | "frequent"',
    ),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    1⃣  Elasticsearch → get review hits  
    2⃣  Bulk‑fetch restaurants & ratings (single batch call)  
    3⃣  Enrich each hit with SQL + MongoDB data (photos, keywords, follow)  
    4⃣  Return JSON directly consumable by *frontend/src/pages/PostList.js*
    """

    # ─── 1. Build ES query ─────────────────────────────────────────
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

    es_query: Dict[str, Any] = {
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
        "sort": [{"created_at": {"order": "desc"}}],  # newest first
        "size": size,
    }

    try:
        hits = es.search(index="user_review_nickname", body=es_query)["hits"]["hits"]
    except Exception as exc:  # pragma: no cover
        raise HTTPException(500, f"Elasticsearch query failed → {exc}") from exc

    if not hits:
        return {"success": True, "result": []}

    # ─── 2. Bulk SQL look‑ups ──────────────────────────────────────
    rest_ids: set[int] = {
        h["_source"]["restaurant_id"]
        for h in hits
        if h["_source"]["restaurant_id"] is not None
    }

    rest_map: Dict[int, Restaurant] = {
        r.restaurant_id: r
        for r in db.query(Restaurant)
        .filter(Restaurant.restaurant_id.in_(rest_ids))
        .all()
    }

    ratings: Dict[int, float] = (
        {}
        if viewer_id is None
        else batch_user_rest_scores(viewer_id, list(rest_ids), db=db)
    )

    # ─── 3. Viewer’s follow‑list (one Mongo query) ────────────────
    viewer_following_ids: set[int] = set()
    if viewer_id is not None:
        viewer_doc = follow_collection.find_one({"user_id": viewer_id}) or {}
        viewer_following_ids = set(viewer_doc.get("following_ids", []))

    # ─── 4. Build enriched payload ────────────────────────────────
    results: List[Dict[str, Any]] = []
    for h in hits:
        src = h["_source"]
        rid = src["restaurant_id"]
        uid = src["user_id"]

        # ⓐ Restaurant name
        restaurant_name: Optional[str] = getattr(rest_map.get(rid), "name", None)

        # ⓑ Profile image (SQL)
        profile_url: str = (
            db.query(Users.profile_image).filter(Users.user_id == uid).scalar() or ""
        )

        # ⓒ Images (MongoDB)
        images_cursor = photo_collection.find({"review_id": src["review_id"]})
        images: List[str] = [doc["photo_urls"] for doc in images_cursor]

        # ⓓ Keywords (MongoDB)
        kw_projection = {"_id": 0, "positive_keywords": 1, "negative_keywords": 1}
        kw_doc = review_keywords_collection.find_one(
            {"review_id": src["review_id"]}, kw_projection
        ) or {}
        pos_kw = kw_doc.get("positive_keywords", [])
        neg_kw = kw_doc.get("negative_keywords", [])
        keywords = (
            [{"keyword": kw, "sentiment": "positive"} for kw in pos_kw]
            + [{"keyword": kw, "sentiment": "negative"} for kw in neg_kw]
        )

        # ⓔ Rating (batch lookup; default 0.0)
        rating: float = ratings.get(rid, 0.0)

        # ⓕ Follow status (viewer → author)
        is_following: bool = uid in viewer_following_ids

        # ⓖ Assemble final object
        results.append(
            {
                "review_id": src["review_id"],
                "restaurant_id": rid,
                "restaurant_name": restaurant_name,
                "user_id": uid,
                "profile_url": profile_url,
                "nickname": src.get("nickname") or "Unknown",
                "comments": src.get("comments", ""),
                "review": src.get("review", ""),
                "created_at": src.get("created_at"),
                "rating": rating,
                "images": images,
                "keywords": keywords,
                "is_following": is_following,        # ★ NEW
            }
        )

    # ─── 5. Optional resorting ────────────────────────────────────
    if sort == "frequent":
        results.sort(
            key=lambda r: (r["rating"], r["created_at"] or ""),
            reverse=True,
        )

    # ─── 6. Done ─────────────────────────────────────────────────
    return {"success": True, "result": results}