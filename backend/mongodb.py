from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
uri = os.getenv("MONGO_URI")

client = MongoClient(uri)
# try:
#     info = client.server_info()
#     print("Connected to MongoDB!")
#     print("MongoDB version:", info["version"])
# except Exception as e:
#     print("Failed to connect:", e)
# print(client.list_database_names())
db = client["customer_info"]
collection = db["words"]
user = collection.find_one({"user_id":2})
print(user)