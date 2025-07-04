from fastapi import APIRouter, Query, HTTPException
from elasticsearch import Elasticsearch
from typing import Optional
from dotenv import load_dotenv
import os

load_dotenv()
router = APIRouter()

es = Elasticsearch(
    os.getenv("ES_HOST"),
    basic_auth=(os.getenv("ES_USER"), os.getenv("ES_PASS"))
)


@router.get("/reviews/search")
def search_reviews(
    review_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    restaurant_id: Optional[int] = Query(None),
    comment_query: Optional[str] = Query(None)
):
    try:
        if review_id is not None:
            # Directly fetch by document ID
            result = es.get(index="user_review", id=review_id)
            return {"results": [{"id": result["_id"], **result["_source"]}]}

        # Build a query if no specific review_id is provided
        query = {"bool": {"must": []}}

        if user_id is not None:
            query["bool"]["must"].append({"match": {"user_id": user_id}})
        if restaurant_id is not None:
            query["bool"]["must"].append({"match": {"restaurant_id": restaurant_id}})
        if comment_query is not None:
            query["bool"]["must"].append({"match": {"comments": comment_query}})

        res = es.search(index="user_review", query=query)
        results = [
            {
                "id": hit["_id"],
                **hit["_source"]
            }
            for hit in res["hits"]["hits"]
        ]
        return {"results": results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))