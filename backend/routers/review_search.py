from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional
from sqlalchemy.orm import Session
from ..connection.mysqldb import get_db, People

from ..connection.elasticdb import es_client as es

router = APIRouter()
'''
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
        must.append({"match": {"review": review}})
    if comments:
        must.append({"match": {"comments": comments}})
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
        response = es.search(index="user_review_kor", body=query)
        return {
            "success": True,
            "result": [hit["_source"] for hit in response["hits"]["hits"]]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
'''


@router.get("/search_review_es", tags=["Reviews"])
def search_review_es(
    review: str = Query(None),
    comments: str = Query(None),
    user_id: int = Query(None),
    restaurant_id: int = Query(None),
    nickname: str = Query(None),  # filter by nickname
    size: int = Query(10),
    db: Session = Depends(get_db)
):
    must = []

    if review:
        must.append({"match": {"review": review}})
    if comments:
        must.append({"match": {"comments": comments}})
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
        response = es.search(index="user_review_kor", body=query)
        hits = response["hits"]["hits"]

        # Get unique user_ids from results
        user_ids = list(set(hit["_source"]["user_id"] for hit in hits))

        # Query nickname info from People table
        user_map = (
            db.query(People.user_id, People.nickname)
            .filter(People.user_id.in_(user_ids))
            .all()
        )
        user_id_to_nickname = {u.user_id: u.nickname for u in user_map}

        # Attach nickname and apply nickname filter (if needed)
        results = []
        for hit in hits:
            doc = hit["_source"]
            doc["nickname"] = user_id_to_nickname.get(doc["user_id"], None)

            if nickname:
                if doc["nickname"] != nickname:
                    continue

            results.append(doc)

        return {
            "success": True,
            "result": results
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
