import os
import json
from dotenv import load_dotenv
from elasticsearch import Elasticsearch

from backend.connection.elasticdb import es_client as es

# # Load .env file
# load_dotenv()

# # Elasticsearch connection
es = Elasticsearch(
    os.getenv("ES_HOST"),
    basic_auth=(os.getenv("ES_USER"), os.getenv("ES_PASS"))
)

index_name = "user_review_kor"
'''
# Step 2: Delete old index if it exists
if es.indices.exists(index=index_name):
    es.indices.delete(index=index_name)
    print(f"Deleted existing index: {index_name}")

# Step 3: Define the index with nori analyzer
index_config = {
    "settings": {
        "analysis": {
            "analyzer": {
                "korean": {
                    "type": "custom",
                    "tokenizer": "nori_tokenizer"
                }
            }
        }
    },
    "mappings": {
        "properties": {
            "review_id": {"type": "integer"},
            "user_id": {"type": "integer"},
            "restaurant_id": {"type": "integer"},
            "created_at": {"type": "date"},
            "comments": {
                "type": "text",
                "analyzer": "korean"
            },
            "review": {
                "type": "text",
                "analyzer": "korean"
            }
        }
    }
}

# Step 4: Create the new index
es.indices.create(index=index_name, body=index_config)
print(f"Created new index: {index_name}")

reindex_body = {
    "source": {"index": "user_review"},
    "dest": {"index": "user_review_kor"}
}

res = es.reindex(body=reindex_body, wait_for_completion=True)
print("Reindex complete")
print(res)
'''

query = {
    "query": {
        "match": {
            "review": "치즈즈"
        }
    }
}

# Run the search
response = es.search(index="user_review_kor", body=query)

# Display results
print("🔍 Search Results:")
for hit in response["hits"]["hits"]:
    print(hit["_source"])

mapping = es.indices.get_mapping(index="user_review_kor")
print(mapping["user_review_kor"]["mappings"]["properties"])

response = es.search(
    index="user_review_kor",
    body={
        "query": { "match_all": {} },
        "size": 10,
        "_source": ["review", "comments"]
    }
)

for hit in response["hits"]["hits"]:
    print("📝", hit["_source"])