import os
import requests
from collections import Counter
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func

from ..connection.elasticdb import es_client as es
from ..connection.mysqldb   import get_db, Restaurant, Review, Users
from ..connection.mongodb   import (
    restaurant_keywords_collection,
    review_keywords_collection,
    photo_collection,
)
from ..schemas.restaurant   import RestaurantCreate
from ..services.calc_score  import (
    update_user_to_restaurant_score,
    batch_user_rest_scores,
)
from ..services.utilities   import get_location_from_ip
from .common_imports        import *       # noqa: F401,F403

# ────────────────────────── Kakao API set-up ──────────────────────────
KAKAO_KEY    = os.getenv("KAKAO_MAP_APP_KEY")           # REST API key
KAKAO_HEADER = {"Authorization": f"KakaoAK {KAKAO_KEY}"}

router = APIRouter()

# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────
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

# ── Kakao helpers ─────────────────────────────────────────────────────
def _coords_from_address(addr: str) -> tuple[float, float] | None:
    """Geocodes **road / jibun** address → (lat, lon)."""
    url = "https://dapi.kakao.com/v2/local/search/address.json"
    res = requests.get(url, headers=KAKAO_HEADER, params={"query": addr})
    if res.ok and (docs := res.json().get("documents")):
        first = docs[0]
        return float(first["y"]), float(first["x"])             # (lat, lon)
    return None

def _address_from_coords(lat: float, lon: float) -> str | None:
    """Reverse-geocodes (lat, lon) → road address string."""
    url = "https://dapi.kakao.com/v2/local/geo/coord2address.json"
    res = requests.get(url, headers=KAKAO_HEADER, params={"x": lon, "y": lat})
    if res.ok and (docs := res.json().get("documents")):
        road = docs[0]["road_address"] or docs[0]["address"]
        return road["address_name"]
    return None

def _search_kakao_places(keyword: str, max_pages: int = 3) -> list[dict[str, Any]]:
    """
    Retrieve up to **45** place records from Kakao Local Keyword-Search.

    Parameters
    ----------
    keyword : str
        Free-text search term.
    max_pages : int, default 3
        Kakao returns 15 results per page → 3 pages = 45 max.

    Returns
    -------
    List[Dict] - each item contains the **full** document returned by Kakao.
    """
    results: list[dict[str, Any]] = []
    url = "https://dapi.kakao.com/v2/local/search/keyword.json"

    for page in range(1, max_pages + 1):
        params = {"query": keyword, "page": page}
        res    = requests.get(url, headers=KAKAO_HEADER, params=params)
        if not res.ok:
            raise HTTPException(
                status_code=res.status_code,
                detail=f"Kakao API error → {res.text}",
            )
        data = res.json()
        results.extend(data.get("documents", []))
        if data.get("meta", {}).get("is_end"):
            break

    return results

@router.get("/search_kakao", tags=["Restaurant"])
def search_kakao(
    keyword: str = Query(..., min_length=1, description="검색 키워드 (예: '딸부자네')"),
):
    """
    Proxy endpoint → Kakao Keyword-Search.

    Returns
    -------
    {
        "success": True,
        "results": [
            {
                "id"       : str,
                "name"     : str,
                "address"  : str | None,
                "category" : str | None,
                "latitude" : float | None,
                "longitude": float | None,
                "phone"    : str | None,
            },
            ...
        ]
    }
    """
    try:
        docs = _search_kakao_places(keyword)
    except HTTPException:
        raise 
    except Exception as exc:
        raise HTTPException(500, f"Kakao search failed → {exc!s}")

    mapped: list[dict[str, Any]] = []
    for d in docs:
        mapped.append(
            {
                "id"       : d.get("id"),
                "name"     : d.get("place_name"),
                "address"  : d.get("road_address_name") or d.get("address_name"),
                "category" : d.get("category_name"),
                "latitude" : float(d["y"]) if d.get("y") else None,
                "longitude": float(d["x"]) if d.get("x") else None,
                "phone"    : d.get("phone"),
            }
        )

    return {"success": True, "results": mapped}

@router.get("/search_restaurant_es", tags=["Restaurant"])
def search_restaurant_es(
    name: Optional[str] = Query(None, description="Full-text search on restaurant name"),
    category: Optional[str] = Query(None, description="Exact category match"),
    address: Optional[str] = Query(None, description="Full-text search on address"),
    size: int = Query(100, gt=1, le=1000),
    viewer_id: Optional[int] = Query(
        None,
        description="Logged-in user ID (for personalised compatibility scores)",
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

    # Pre-fetch all corresponding MySQL rows (lat/lon + optional state_id)
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
    size: int = Query(10, gt=1, le=10000),
    viewer_id: Optional[int] = Query(None, description="Viewer ID for personalised scoring"),
    # Frontend-supplied coordinates (aliases y / x for convenience)
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

    ratings = (
        {} if viewer_id is None
        else batch_user_rest_scores(viewer_id, list(rest_ids), db=db)
    )

    results: list[dict[str, Any]] = []
    for h in hits:
        src  = h["_source"]
        r_id = src["r_id"]
        row  = rest_map.get(r_id)

        results.append(
            {
                "restaurant_id": r_id,
                "name":      src["name"],
                "categories": src.get("categories", ""),
                "address":   src.get("address", ""),
                "distance_km": h["sort"][0],
                "x": getattr(row, "longitude", None),
                "y": getattr(row, "latitude",  None),
                "rating": ratings.get(r_id, 0.0),
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

@router.post("/add_restaurant", tags=["Restaurant"])
def add_restaurant(
    payload: RestaurantCreate,
    db: Session = Depends(get_db),
):
    """
    Adds a new restaurant across **MySQL → Elasticsearch → MongoDB**.

    Returns
    -------
    { "success": True, "restaurant_id": int }
    """
    # ── 1) Resolve missing geo/address data ──────────────────────
    lat, lon, addr = payload.latitude, payload.longitude, payload.location

    # 1-A. Need coords → get them from Kakao
    if (lat is None or lon is None) and addr:
        if (coords := _coords_from_address(addr)) is None:
            raise HTTPException(400, "Unable to geocode supplied address")
        lat, lon = coords

    # 1-B. Need address → reverse-geocode
    if not addr:
        addr = _address_from_coords(lat, lon)
        if not addr:
            raise HTTPException(400, "Unable to reverse-geocode coordinates")

    # ── 2) Insert row in MySQL (manual PK) ───────────────────────
    try:
        max_id = db.query(func.max(Restaurant.restaurant_id)).scalar() or 0
        new_id = max_id + 1

        new_row = Restaurant(
            restaurant_id=new_id,
            name         =payload.name,
            location     =addr,
            cuisine_type =payload.cuisine_type,
            latitude     =lat,
            longitude    =lon,
        )
        db.add(new_row)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(500, f"MySQL insert failed → {exc!s}")

    # ── 3) Index document in Elasticsearch ──────────────────────
    es_doc = {
        "r_id":      new_id,
        "name":      payload.name,
        "address":   addr,
        "categories":payload.cuisine_type,
        "location":  {"lat": lat, "lon": lon},
    }
    try:
        es.index(index="full_restaurant_kor", id=new_id, document=es_doc)
    except Exception as exc:
        # Best-effort rollback in MySQL so IDs stay contiguous
        db.query(Restaurant).filter(Restaurant.restaurant_id == new_id).delete()
        db.commit()
        raise HTTPException(500, f"Elasticsearch insert failed → {exc!s}")

    # ── 4) Stub keywords doc in MongoDB ──────────────────────────
    restaurant_keywords_collection.insert_one(
        {"r_id": new_id, "keywords": []}
    )

    return {"success": True, "restaurant_id": new_id}