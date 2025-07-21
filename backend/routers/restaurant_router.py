from fastapi import Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from collections import Counter

from ..connection.elasticdb import es_client as es
from ..connection.mysqldb import get_db, Restaurant, Review
from ..connection.mongodb import (
    restaurant_keywords_collection,
    review_keywords_collection,   # review‑level keyword docs (with sentiment)
    photo_collection,             # review‑>photo URLs
)

from ..services.utilities import get_location_from_ip

from .common_imports import *

router = APIRouter()

@router.get("/search_restaurant_es", tags=["Restaurant"])
def search_restaurant_es(
    name: str = Query(None),
    category: str = Query(None),
    address: str = Query(None),
    size: int = Query(10)
):
    must = []

    if name:
        must.append({"match": {"name": name}})
    if category:
        must.append({"term": {"categories": category}})
    if address:
        must.append({"match": {"address": address}})

    query = {
        "_source":["name", "categories", "r_id", "address"],
        "query": {
            "bool": {
                "must": must if must else [{"match_all": {}}]
            }
        },
        "size": size
    }

    try:
        response = es.search(index="full_restaurant_kor", body=query)
        return {
            "success": True,
            "result": [hit["_source"] for hit in response["hits"]["hits"]]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.get("/nearby_restaurant_es", tags=["Restaurant"])
def nearby_restaurant_es(request: Request, distance: str = "5km", size: int = 10):
    ip = request.client.host

    # Localhost fallback for development
    if ip.startswith("127.") or ip == "localhost":
        print(f"Local IP {ip} detected, using fallback IP.")
        ip = "121.162.119.1"  # Example IP in Seoul

    user_location = get_location_from_ip(ip)


    print("User IP:", ip)
    print("User location:", user_location)

    if not user_location:
        return {"success": False, "error": "Could not determine location"}

    lat, lon = user_location["lat"], user_location["lon"]

    query = {
        "query": {
            "bool": {
                "filter": {
                    "geo_distance": {
                        "distance": distance,
                        "location": {"lat": lat, "lon": lon}
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
                    "mode": "min"
                }
            }
        ],
        "_source": ["r_id", "name", "categories", "address"],
        "size": size
    }

    try:
        response = es.search(index="full_restaurant_kor", body=query)
        return {
            "success": True,
            "location": {"lat": lat, "lon": lon},
            "results": [hit["_source"] for hit in response["hits"]["hits"]]
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/restaurant_info/{restaurant_id}", tags=["Restaurant"])
def get_restaurant_info(
    restaurant_id: int,
    db: Session = Depends(get_db),
):
    """
    Consolidated information needed by **RestaurantInfoPage**.

    Returns
    -------
    {
        "success": True,
        "data": {
            "id":               int,
            "name":             str,
            "address":          str | None,
            "image":            str | None,   # first photo URL (if any)
            "keywords": {
                "keyword": str,
                "frequency": int
            }
        }
    }
    """
    # 1 ── Basic profile (MySQL)
    row = (
        db.query(Restaurant)
        .filter(Restaurant.restaurant_id == restaurant_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    # 2 ── Keywords (aggregate across all reviews; MongoDB)
    projection = {"_id": 0, "keywords.keyword": 1, "keywords.frequency": 1}
    kw_doc = restaurant_keywords_collection.find_one({"r_id": restaurant_id}, projection=projection) or {}
    keywords = kw_doc.get("keywords", [])

    # 3 ── Thumbnail (first photo URL tied to any review)
    thumb_url: str | None = None
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

    # 4 ── Assemble payload
    return {
        "success": True,
        "data": {
            "id":               restaurant_id,
            "name":             row.name,
            "address":          getattr(row, "location", None),
            "image":            thumb_url,
            "keywords":         keywords
        },
    }