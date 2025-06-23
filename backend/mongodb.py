from pymongo import MongoClient
# uri = "mongodb+srv://mangoberry:mangoberry@mangoberry.mlzqhtq.mongodb.net/"
uri = "mongodb://mangoberry:mangoberry@10.241.144.46:27017/?authSource=customer_info"
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