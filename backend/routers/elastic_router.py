import os
import sys
from dotenv import load_dotenv
from fastapi import APIRouter, Query
from elasticsearch import Elasticsearch
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

router = APIRouter()
es = Elasticsearch("https://2ae07f7bf36d47cc9da14549c264281b.us-central1.gcp.cloud.es.io:443",
    api_key=(os.getenv("API_KEY_ID"), os.getenv("API_KEY"))
)

es.search(index="restaurant", query={"match_all": {}})

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
        must.append({"match": {"categories": category}})

    query = {
        "_source":["name", "categories"],
        "query": {
            "bool": {
                "must": must if must else [{"match_all": {}}]
            }
        },
        "size": size
    }

    try:
        response = es.search(index="restaurant", body=query)
        return {
            "success": True,
            "result": [hit["_source"] for hit in response["hits"]["hits"]]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
