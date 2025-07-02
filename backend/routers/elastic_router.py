import os
import sys
import requests

from dotenv import load_dotenv
from fastapi import APIRouter, Query, Request
from elasticsearch import Elasticsearch
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
id = os.getenv("API_KEY_ID")
key = os.getenv("API_KEY")
print("ES_ID:", id)
print("ES_KEY:", key)


router = APIRouter()
es = Elasticsearch("https://2ae07f7bf36d47cc9da14549c264281b.us-central1.gcp.cloud.es.io:443",
    api_key=(os.getenv("API_KEY_ID"), os.getenv("API_KEY"))
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

@router.get("/search_restaurant_es")
def search_restaurant_es(
    name: str = Query(None),
    category: str = Query(None),
    size: int = Query(10)
):
    must = []

    if name:
        must.append({"match_phrase_prefix": {"name": name}})
    if category:
        must.append({"term": {"categories": category}})

    query = {
        "_source":["name", "categories", "r_id"],
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

@router.get("/nearby_from_ip")
def nearby_from_ip(request: Request, distance: str = "5km", size: int = 10):
    #ip = request.client.host
    ip = "121.162.119.1"
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
        "_source": ["r_id", "name", "categories", "location"],
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
