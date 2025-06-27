from fastapi import APIRouter
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Connect to MongoDB
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["customer_info"]
collection = db["follow"]

# Serialize ObjectId
def serialize_doc(doc):
    doc["_id"] = str(doc["_id"])
    return doc

# Get a user's followers & followings
@router.get("/social/{user_id}")
def get_user_social(user_id: int):
    doc = collection.find_one({"user_id": user_id})
    return serialize_doc(doc) if doc else {"message": "User not found."}