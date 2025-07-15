from elasticsearch import Elasticsearch
import json
import os
from dotenv import load_dotenv  # Correct import
from backend.connection.mysqldb import get_db, People

load_dotenv()  # Correct function name

# Create Elasticsearch client
es = Elasticsearch(
    hosts=os.getenv("ES_HOST"),  # e.g., "http://localhost:9200"
    basic_auth=(os.getenv("ES_USER"), os.getenv("ES_PASS"))
)


# index_name = "user_review_nickname"

# mapping = {
#   "settings": {
#     "analysis": {
#       "analyzer": {
#         "korean": {
#           "type": "custom",
#           "tokenizer": "nori_tokenizer"
#         }
#       }
#     }
#   },
#   "mappings": {
#     "properties": {
#       "review_id": { "type": "integer" },
#       "user_id": { "type": "integer" },
#       "nickname": {
#         "type": "text",
#         "analyzer": "korean"
#       },
#       "restaurant_id": { "type": "integer" },
#       "restaurant_name": {
#         "type": "text",
#         "fields": {
#           "keyword": { "type": "keyword", "ignore_above": 256 }
#         }
#       },
#       "review": {
#         "type": "text",
#         "analyzer": "korean"
#       },
#       "comments": {
#         "type": "text",
#         "analyzer": "korean"
#       },
#       "created_at": { "type": "date" }
#     }
#   }
# }

# if not es.indices.exists(index=index_name):
#     es.indices.create(index=index_name, body=mapping)
#     print(f"Index '{index_name}' created successfully.")
# else:
#     print(f"Index '{index_name}' already exists.")

# db_gen = get_db()
# db = next(db_gen)

# scroll = es.search(
#     index="user_review_kor",
#     scroll="2m",
#     size=1000,
#     body={"query": {"match_all": {}}}
# )

# scroll_id = scroll["_scroll_id"]
# hits = scroll["hits"]["hits"]

# # --- Step 4: Migrate with nickname
# while hits:
#     for hit in hits:
#         doc = hit["_source"]
#         user_id = doc.get("user_id")

#         # Get nickname from MySQL People table
#         person = db.query(People).filter(People.user_id == user_id).first()
#         nickname = person.nickname if person else None
#         doc["nickname"] = nickname

#         # Index to new ES index
#         es.index(index="user_review_nickname", body=doc)

#     # Get next batch
#     scroll = es.scroll(scroll_id=scroll_id, scroll="2m")
#     scroll_id = scroll["_scroll_id"]
#     hits = scroll["hits"]["hits"]

# print("Migration complete.")

# # --- Close DB session
# try:
#     next(db_gen)
# except StopIteration:
#     pass


response = es.search(
    index="user_review_nickname",
    body={"query": {"match_all": {}}},
    size=100  # adjust to number of docs you want to see
)

for hit in response["hits"]["hits"]:
    print(hit["_source"])