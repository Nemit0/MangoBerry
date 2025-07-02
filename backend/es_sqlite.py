import sqlite3
from elasticsearch import Elasticsearch, helpers
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()
print(os.getcwd())


def extract_categories(type_str):
    if not type_str:
        return []
    try:
        # Remove "음식점 >" part
        trimmed = type_str.replace("음식점 >", "").strip()
        # Split by ">" and ","
        parts = []
        for part in trimmed.split(">"):
            parts.extend(p.strip() for p in part.split(","))
        return list(set(parts))  # remove duplicates if any
    except:
        return []



# Connect to SQLite
conn = sqlite3.connect("routers/clean_copy.sqlite")
cursor = conn.cursor()

# Fetch all columns
cursor.execute("SELECT r_id, id, name, type, lat, lon FROM restaurants;")
rows = cursor.fetchall()
print("Host:", os.getenv("ES_HOST"))
print("User:", os.getenv("ES_USER"))
print("Pass:", os.getenv("ES_PASS"))


# Elasticsearch connection
es = Elasticsearch(
    "https://2ae07f7bf36d47cc9da14549c264281b.us-central1.gcp.cloud.es.io:443",
    api_key=(os.getenv("API_KEY_ID"), os.getenv("API_KEY"))
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

