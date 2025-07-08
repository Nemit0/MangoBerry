from fastapi import APIRouter, HTTPException
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv

from ..connection.mongodb import follow_collection

load_dotenv()

router = APIRouter()


# Serialize ObjectId
def serialize_doc(doc):
    doc["_id"] = str(doc["_id"])
    return doc

# Get a user's followers & followings
@router.get("/social/{user_id}")
def get_user_social(user_id: int):
    doc = follow_collection.find_one({"user_id": user_id})
    return serialize_doc(doc) if doc else {"message": "User not found."}


@router.post("/follow/{user_id}/{target_id}")
def follow_user(user_id: int, target_id: int):
    if user_id == target_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself.")

    try:
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
        return {"message": f"User {user_id} is now following {target_id}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Unfollow a user
@router.delete("/unfollow/{user_id}/{target_id}")
def unfollow_user(user_id: int, target_id: int):
    try:
        follow_collection.update_one(
            {"user_id": user_id},
            {"$pull": {"following_ids": target_id}}
        )
        follow_collection.update_one(
            {"user_id": target_id},
            {"$pull": {"follower_ids": user_id}}
        )
        return {"message": f"User {user_id} has unfollowed {target_id}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get a user's followers
# collection.find_one(filter, projection)
@router.get("/followers/{user_id}")
def get_followers(user_id: int):
    doc = follow_collection.find_one({"user_id": user_id}, {"_id": 0, "follower_ids": 1})
    if not doc:
        return {"follower_ids": []}
    return doc


# Get users a user is following
@router.get("/following/{user_id}")
def get_following(user_id: int):
    doc = follow_collection.find_one({"user_id": user_id}, {"_id": 0, "following_ids": 1})
    if not doc:
        return {"following_ids": []}
    return doc