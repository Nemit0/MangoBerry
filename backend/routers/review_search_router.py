from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional
from sqlalchemy.orm import Session
from ..connection.mysqldb import get_db, People

from ..connection.elasticdb import es_client as es

router = APIRouter()

@router.get("/search_review_es", tags=["Reviews"])
def search_review_es(
    text: str = Query(..., description="Search text in review, comments, or nickname"),
    user_id: int = Query(None),
    restaurant_id: int = Query(None),
    size: int = Query(10),
):
    must_clauses = [
        {
            "simple_query_string": {
                "query": text,
                "fields": ["review", "comments", "nickname"],
                "default_operator": "and"
            }
        }
    ]

    if user_id is not None:
        must_clauses.append({"term": {"user_id": user_id}})
    if restaurant_id is not None:
        must_clauses.append({"term": {"restaurant_id": restaurant_id}})

    query = {
        "_source": ["review_id", "restaurant_id", "user_id", "comments", "review", "nickname"],
        "query": {
            "bool": {
                "must": must_clauses
            }
        },
        "size": size
    }

    try:
        response = es.search(index="user_review_nickname", body=query)
        hits = response["hits"]["hits"]
        result = [hit["_source"] for hit in hits]

        return {
            "success": True,
            "result": result
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }