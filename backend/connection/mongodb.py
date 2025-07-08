from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
uri = os.getenv("MONGO_URI")

client = MongoClient(uri)

# try:
#     client = MongoClient(uri)
#     info = client.server_info()
#     print("Connected to MongoDB!")
#     print("MongoDB version:", info["version"])
#     print(client.list_database_names())
# except Exception as e:
#     print("Failed to connect:", e)


db = client["customer_info"]
#collection = db["words"]
words_collection = db["words"]
photo_collection = db["review_photos"]
follow_collection = db["follow"]
