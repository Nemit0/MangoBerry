from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from ..connection.elasticdb import es_client as es

router = APIRouter()

@router.get("/search_review_es", tags=["Reviews"])
def search_review_es(
    review: str = Query(None),
    comments: str = Query(None),
    user_id: int = Query(None),
    restaurant_id: int = Query(None),
    size: int = Query(10)
):
    must = []

    if review:
        must.append({"match_phrase_prefix": {"review": review}})
    if comments:
        must.append({"match_phrase_prefix": {"comments": comments}})
    if user_id:
        must.append({"term": {"user_id": user_id}})
    if restaurant_id:
        must.append({"term": {"restaurant_id": restaurant_id}})

    query = {
        "_source": ["review_id", "restaurant_id", "user_id", "comments", "review", "created_at"],
        "query": {
            "bool": {
                "must": must if must else [{"match_all": {}}]
            }
        },
        "size": size
    }

    try:
        response = es.search(index="user_review", body=query)
        return {
            "success": True,
            "result": [hit["_source"] for hit in response["hits"]["hits"]]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
