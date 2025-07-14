from fastapi import APIRouter, Query, Request

from ..connection.elasticdb import es_client as es
from ..services.utilities import get_location_from_ip

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
