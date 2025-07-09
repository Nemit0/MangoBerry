from fastapi import APIRouter, HTTPException, Depends
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv

from ..connection.mongodb import follow_collection

from ..mysql.models import People, Users
from ..connection.database import get_db
from sqlalchemy.orm import Session

load_dotenv()

router = APIRouter()


# Serialize ObjectId
def serialize_doc(doc):
    doc["_id"] = str(doc["_id"])
    return doc

# Get a user's followers & followings
@router.get("/social/{user_id}", tags=["Social"])
def get_user_social(user_id: int, db: Session = Depends(get_db)):
    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    doc = follow_collection.find_one({"user_id": user_id})
    follower_ids = doc.get("follower_ids", []) if doc else []
    following_ids = doc.get("following_ids", []) if doc else []

    # Update counts in MySQL if different
    follower_count = len(follower_ids)
    following_count = len(following_ids)

    if user.follower_count != follower_count or user.following_count != following_count:
        user.follower_count = follower_count
        user.following_count = following_count
        db.commit()

    return {
        "user_id": user_id,
        "follower_count": follower_count,
        "following_count": following_count,
        "following_ids": following_ids,
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


# Get a user's followers
# collection.find_one(filter, projection)
@router.get("/followers/{user_id}", tags=["Social"])
def get_followers(user_id: int):
    doc = follow_collection.find_one({"user_id": user_id}, {"_id": 0, "follower_ids": 1})
    if not doc:
        return {"follower_ids": []}
    return doc


# Get users a user is following
@router.get("/following/{user_id}", tags=["Social"])
def get_following(user_id: int):
    doc = follow_collection.find_one({"user_id": user_id}, {"_id": 0, "following_ids": 1})
    if not doc:
        return {"following_ids": []}
    return doc