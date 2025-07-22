from collections import Counter
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from ..connection.elasticdb import es_client as es
from ..connection.mysqldb import get_db, Restaurant, Review, Users
from ..connection.mongodb import (
    restaurant_keywords_collection,
    review_keywords_collection,
    photo_collection,
)

from ..services.calc_score import update_user_to_restaurant_score
from ..services.utilities import get_location_from_ip
from .common_imports import *  # noqa: F403,F401

router = APIRouter()

# ───────────────────────────────────────────────────────────────────
# Helpers
# ───────────────────────────────────────────────────────────────────
def _safe_score(viewer_id: Optional[int], r_id: int, db: Session) -> float:
    """
    Wrapper around `update_user_to_restaurant_score()` that returns **0.0**
    whenever the viewer is anonymous *or* the scorer raises `ValueError`.
    """
    if viewer_id is None:
        return 0.0
    try:
        score, *_ = update_user_to_restaurant_score(  # type: ignore
            u_id=viewer_id,
            r_id=r_id,
            db=db,
            force_update=True,
        )
        return score
    except ValueError:
        return 0.0


# ───────────────────────────────────────────────────────────────────
# 1) TEXT / FACET RESTAURANT SEARCH
# ───────────────────────────────────────────────────────────────────
@router.get("/search_restaurant_es", tags=["Restaurant"])
def search_restaurant_es(
    name: Optional[str] = Query(None, description="Full‑text search on restaurant name"),
    category: Optional[str] = Query(None, description="Exact category match"),
    address: Optional[str] = Query(None, description="Full‑text search on address"),
    size: int = Query(10, gt=1, le=1000),
    viewer_id: Optional[int] = Query(
        None,
        description="Logged‑in user ID (for personalised compatibility scores)",
    ),
    db: Session = Depends(get_db),
):
    must: List[Dict[str, Any]] = []
    if name:
        must.append({"match": {"name": name}})
    if category:
        must.append({"term": {"categories": category}})
    if address:
        must.append({"match": {"address": address}})

    es_query = {
        "_source": ["r_id", "name", "categories", "address"],
        "query": {"bool": {"must": must or [{"match_all": {}}]}},
        "size": size,
    }

    try:
        hits = es.search(index="full_restaurant_kor", body=es_query)["hits"]["hits"]
    except Exception as exc:  # pragma: no cover
        return {"success": False, "error": f"Elasticsearch query failed → {exc}"}

    # Pre‑fetch all corresponding MySQL rows (lat/lon + optional state_id)
    rest_ids = {h["_source"]["r_id"] for h in hits}
    rest_map = {
        r.restaurant_id: r
        for r in db.query(Restaurant).filter(Restaurant.restaurant_id.in_(rest_ids)).all()
    }

    results: List[Dict[str, Any]] = []
    for h in hits:
        src = h["_source"]
        r_id = src["r_id"]
        row = rest_map.get(r_id)

        rating = _safe_score(viewer_id, r_id, db)

        results.append(
            {
                "restaurant_id": r_id,
                "name": src["name"],
                "categories": src.get("categories", ""),
                "address": src.get("address", ""),
                "x": getattr(row, "longitude", None),
                "y": getattr(row, "latitude", None),
                "rating": rating,
            }
        )

    # Personalised order (rating DESC)
    if viewer_id is not None:
        results.sort(key=lambda r: r["rating"], reverse=True)

    return {"success": True, "result": results}


# ───────────────────────────────────────────────────────────────────
# 2) NEARBY RESTAURANTS (GEO SEARCH)
# ───────────────────────────────────────────────────────────────────
@router.get("/nearby_restaurant_es", tags=["Restaurant"])
def nearby_restaurant_es(
    request: Request,
    distance: str = Query("5km", pattern=r"^[0-9]+(m|km)$"),
    size: int = Query(10, gt=1, le=1000),
    viewer_id: Optional[int] = Query(None, description="Viewer ID for personalised scoring"),
    # Frontend‑supplied coordinates (aliases y / x for convenience)
    lat: Optional[float] = Query(None, alias="y", description="Latitude of the client"),
    lon: Optional[float] = Query(None, alias="x", description="Longitude of the client"),
    db: Session = Depends(get_db),
):
    # ── Determine reference point ─────────────────────────────────
    if lat is None or lon is None:
        caller_ip = request.client.host
        if caller_ip.startswith("127.") or caller_ip == "localhost":
            caller_ip = "121.162.119.1"  # Seoul fallback for local dev
        user_location = get_location_from_ip(caller_ip)
        if not user_location:
            return {"success": False, "error": "Could not determine location"}
        lat, lon = user_location["lat"], user_location["lon"]

    es_query = {
        "query": {
            "bool": {
                "filter": {
                    "geo_distance": {
                        "distance": distance,
                        "location": {"lat": lat, "lon": lon},
                    }
                }
            }
        },
        "sort": [
            {
                "_geo_distance": {
                    "location": {"lat": lat, "lon": lon},
                    "order": "asc",
                    "unit": "km",
                }
            }
        ],
        "_source": ["r_id", "name", "categories", "address"],
        "size": size,
    }

    try:
        hits = es.search(index="full_restaurant_kor", body=es_query)["hits"]["hits"]
    except Exception as exc:  # pragma: no cover
        return {"success": False, "error": f"Elasticsearch query failed → {exc}"}

    # Fetch relational data for x/y
    rest_ids = {h["_source"]["r_id"] for h in hits}
    rest_map = {
        r.restaurant_id: r
        for r in db.query(Restaurant).filter(Restaurant.restaurant_id.in_(rest_ids)).all()
    }

    results: List[Dict[str, Any]] = []
    for h in hits:
        src = h["_source"]
        r_id = src["r_id"]
        row = rest_map.get(r_id)

        rating = _safe_score(viewer_id, r_id, db)

        results.append(
            {
                "restaurant_id": r_id,
                "name": src["name"],
                "categories": src.get("categories", ""),
                "address": src.get("address", ""),
                "distance_km": h["sort"][0],
                "x": getattr(row, "longitude", None),
                "y": getattr(row, "latitude", None),
                "rating": rating,
            }
        )

    # Mixed sort: rating DESC, then distance ASC
    if viewer_id is not None:
        results.sort(key=lambda r: (-r["rating"], r["distance_km"]))

    return {
        "success": True,
        "origin": {"lat": lat, "lon": lon},
        "results": results,
    }


# ───────────────────────────────────────────────────────────────────
# 3) SINGLE RESTAURANT DETAIL
# ───────────────────────────────────────────────────────────────────
@router.get("/restaurant_info/{restaurant_id}", tags=["Restaurant"])
def get_restaurant_info(
    restaurant_id: int,
    viewer_id: Optional[int] = Query(None, description="Viewer ID for personalised compatibility"),
    db: Session = Depends(get_db),
):
    """
    Consolidated payload for **RestaurantInfoPage**.

    Returns
    -------
    {
        "success": True,
        "data": {
            "id":         int,
            "name":       str,
            "address":    str | None,
            "image":      str | None,
            "keywords":   List[{keyword:str, frequency:int}],
            "rating":     float,
            "x":          float | None,
            "y":          float | None,
        }
    }
    """
    # 1 ── Basic profile ───────────────────────────────────────────
    row = db.query(Restaurant).filter(Restaurant.restaurant_id == restaurant_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    # 2 ── Aggregated keywords ─────────────────────────────────────
    projection = {"_id": 0, "keywords.keyword": 1, "keywords.frequency": 1}
    kw_doc = restaurant_keywords_collection.find_one(
        {"r_id": restaurant_id}, projection=projection
    ) or {}
    keywords = kw_doc.get("keywords", [])

    # 3 ── Thumbnail (first photo URL) ─────────────────────────────
    thumb_url: Optional[str] = None
    first_review = (
        db.query(Review.review_id)
        .filter(Review.restaurant_id == restaurant_id)
        .order_by(Review.created_at.asc())
        .first()
    )
    if first_review:
        photo_doc = photo_collection.find_one({"review_id": first_review[0]}) or {}
        urls = photo_doc.get("photo_urls", [])
        if urls:
            thumb_url = urls[0]

    # 4 ── Personalised score ─────────────────────────────────────
    rating = _safe_score(viewer_id, restaurant_id, db)

    # 5 ── Assemble response ──────────────────────────────────────
    return {
        "success": True,
        "data": {
            "id":       restaurant_id,
            "name":     row.name,
            "address":  getattr(row, "location", None),
            "image":    thumb_url,
            "keywords": keywords,
            "rating":   rating,
            "x":        getattr(row, "longitude", None),
            "y":        getattr(row, "latitude", None),
        },
    }