import os
from pymongo import MongoClient

import backend.connection.load_env

uri = os.getenv("MONGO_URI")

client = MongoClient(uri)

db = client["customer_info"]
words_collection = db["words"]
photo_collection = db["review_photos"]
follow_collection = db["follow"]
restaurant_keywords_collection = db["keywords"]
user_keywords_collection = db["user_keyword"]
review_keywords_collection = db["review_keyword"]
user_rest_score = db["user_rest_score"]
