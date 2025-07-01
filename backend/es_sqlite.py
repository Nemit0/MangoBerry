import sqlite3
from elasticsearch import Elasticsearch, helpers
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()


print("Host:", os.getenv("ES_HOST"))
print("User:", os.getenv("ES_USER"))
print("Pass:", os.getenv("ES_PASS"))


# Elasticsearch connection
es = Elasticsearch(
    os.getenv("ES_HOST"),
    basic_auth=(os.getenv("ES_USER"), os.getenv("ES_PASS"))
)


try:
    print("Elasticsearch info:")
    print(es.info())
except Exception as e:
    print("Connection failed:")
    print(e)




index_name = "full_restaurant"

# Delete existing index if it exists
if es.indices.exists(index=index_name):
    es.indices.delete(index=index_name)

# Create new index with proper mapping
es.indices.create(
    index=index_name,
    body={
        "settings": {
            "number_of_shards": 1
        },
        "mappings": {
            "properties": {
                "r_id": {"type": "integer"},
                "id": {"type": "keyword"},
                "name": {"type": "text"},
                "type": {"type": "keyword"},
                "categories": {"type": "keyword"},
                "lat": {"type": "float"},
                "lon": {"type": "float"},
                "location": {"type": "geo_point"},
                "address": {"type": "text"}
            }
        }
    }
)

