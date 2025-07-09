'''
Routers for searching restaurants
'''

import os
import sys
import requests

from dotenv import load_dotenv
from fastapi import APIRouter, Query, Request
from elasticsearch import Elasticsearch

sys.stdout.reconfigure(encoding='utf-8')

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

id = os.getenv("API_KEY_ID")
key = os.getenv("API_KEY")
print("ES_ID:", id)
print("ES_KEY:", key)


print("ES_HOST:", os.getenv("ES_HOST"))
print("ES_USER:", os.getenv("ES_USER"))
print("ES_PASS:", os.getenv("ES_PASS"))

router = APIRouter()


es = Elasticsearch(
    hosts=os.getenv("ES_HOST"),
    basic_auth=(os.getenv("ES_USER"), os.getenv("ES_PASS"))
)


es.search(index="full_restaurant", query={"match_all": {}})

def get_location_from_ip(ip: str):
    try:
        response = requests.get(f"http://ip-api.com/json/{ip}")
        data = response.json()
        print("GeoIP response:", data) 

        if data.get("status") == "success":
            return {"lat": data["lat"], "lon": data["lon"]}
        else:
            print("GeoIP failed:", data.get("message"))
    except Exception as e:
        print("GeoIP exception:", e)

    return None

@router.get("/search_restaurant_es", tags=["Restaurant"])
def search_restaurant_es(
    name: str = Query(None),
    category: str = Query(None),
    address: str = Query(None),
    size: int = Query(10)
):
    must = []

    if name:
        must.append({"match_phrase_prefix": {"name": name}})
    if category:
        must.append({"term": {"categories": category}})
    if address:
        must.append({"match_phrase_prefix": {"address": address}})

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
        response = es.search(index="full_restaurant", body=query)
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
        response = es.search(index="full_restaurant", body=query)
        return {
            "success": True,
            "location": {"lat": lat, "lon": lon},
            "results": [hit["_source"] for hit in response["hits"]["hits"]]
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
