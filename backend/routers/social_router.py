from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session

from ..connection.mysqldb import (
    get_db,
    Users,
    People,
)
from ..connection.mongodb import (
    follow_collection,
    user_keywords_collection,
)

from .common_imports import *

router = APIRouter()

def _serialize_doc(doc: dict) -> dict:
    """Convert MongoDB’s ObjectId to str for JSON serialisation."""
    doc["_id"] = str(doc["_id"])
    return doc

@router.get("/social/{user_id}", tags=["Social"])
def get_user_social(user_id: int, db: Session = Depends(get_db)):
    """
    Return follower / following statistics **plus** nickname and keyword
    profile for the given user.

    Response schema
    ---------------
    {
        "user_id":           int,
        "nickname":          str | None,         # from People
        "follower_count":    int,
        "following_count":   int,
        "following_ids":     list[int],
        "keywords":          list[dict]          # raw doc from Mongo
    }
    """
    # 1. ── Core user row (for counts & validity)
    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. ── Nickname (People table)
    person = db.query(People).filter(People.user_id == user_id).first()
    nickname = person.nickname if person else None

    # 3. ── Follower / following IDs (MongoDB)
    doc = follow_collection.find_one({"user_id": user_id}) or {}
    follower_ids = doc.get("follower_ids", [])
    following_ids = doc.get("following_ids", [])

    # 4. ── Counts – update MySQL cache if stale
    follower_count = len(follower_ids)
    following_count = len(following_ids)
    if (user.follower_count != follower_count or
            user.following_count != following_count):
        user.follower_count = follower_count
        user.following_count = following_count
        db.commit()

    # 5. ── Keyword profile (MongoDB)
    projection = {"_id": 0, "keywords.name": 1, "keywords.sentiment": 1, "keywords.frequency": 1}
    kw_doc = user_keywords_collection.find_one({"user_id": user_id}, projection) or {}
    keywords = kw_doc.get("keywords", [])  # each item: {name, sentiment, frequency, embedding}

    # 6. ── Assemble response
    return {
        "user_id": user_id,
        "nickname": nickname,
        "follower_count": follower_count,
        "following_count": following_count,
        "following_ids": following_ids,
        "keywords": keywords,
    }

@router.post("/follow/{user_id}/{target_id}", tags=["Social"])
def follow_user(user_id: int, target_id: int, db: Session = Depends(get_db)):
    if user_id == target_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    user = db.query(Users).filter(Users.user_id == user_id).first()
    target = db.query(Users).filter(Users.user_id == target_id).first()
    if not user or not target:
        raise HTTPException(status_code=404, detail="One or both users not found.")

    doc = follow_collection.find_one({"user_id": user_id})
    following_ids = doc.get("following_ids", []) if doc else []
    if target_id in following_ids:
        raise HTTPException(status_code=409, detail="Already following this user.")

    follow_collection.update_one(
        {"user_id": user_id},
        {"$addToSet": {"following_ids": target_id}},
        upsert=True
    )
    follow_collection.update_one(
        {"user_id": target_id},
        {"$addToSet": {"follower_ids": user_id}},
        upsert=True
    )

    # Recalculate counts
    updated_user_doc = follow_collection.find_one({"user_id": user_id})
    updated_target_doc = follow_collection.find_one({"user_id": target_id})

    user.following_count = len(updated_user_doc.get("following_ids", []))
    target.follower_count = len(updated_target_doc.get("follower_ids", []))
    db.commit()

    return {"message": "Followed successfully"}


@router.post("/unfollow/{user_id}/{target_id}", tags=["Social"])
def unfollow_user(user_id: int, target_id: int, db: Session = Depends(get_db)):
    if user_id == target_id:
        raise HTTPException(status_code=400, detail="Cannot unfollow yourself")

    user = db.query(Users).filter(Users.user_id == user_id).first()
    target = db.query(Users).filter(Users.user_id == target_id).first()
    if not user or not target:
        raise HTTPException(status_code=404, detail="One or both users not found.")

    doc = follow_collection.find_one({"user_id": user_id})
    following_ids = doc.get("following_ids", []) if doc else []
    if target_id not in following_ids:
        raise HTTPException(status_code=409, detail="Not following this user.")

    follow_collection.update_one(
        {"user_id": user_id},
        {"$pull": {"following_ids": target_id}}
    )
    follow_collection.update_one(
        {"user_id": target_id},
        {"$pull": {"follower_ids": user_id}}
    )

    # Recalculate counts
    updated_user_doc = follow_collection.find_one({"user_id": user_id})
    updated_target_doc = follow_collection.find_one({"user_id": target_id})

    user.following_count = len(updated_user_doc.get("following_ids", []))
    target.follower_count = len(updated_target_doc.get("follower_ids", []))
    db.commit()

    return {"message": "Unfollowed successfully"}


@router.get("/followers/{user_id}", tags=["Social"])
def get_followers(user_id: int):
    doc = follow_collection.find_one({"user_id": user_id}, {"_id": 0, "follower_ids": 1})
    if not doc:
        return {"follower_ids": []}
    return doc


@router.get("/following/{user_id}", tags=["Social"])
def get_following(user_id: int):
    doc = follow_collection.find_one({"user_id": user_id}, {"_id": 0, "following_ids": 1})
    if not doc:
        return {"following_ids": []}
    return doc
