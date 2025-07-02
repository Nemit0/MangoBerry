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
conn = sqlite3.connect("MangoBerry/backend/seoul_restaurants.sqlite")
cursor = conn.cursor()

# Fetch all columns
cursor.execute("SELECT r_id, id, name, type, lat, lon FROM restaurants;")
rows = cursor.fetchall()

# Format documents
documents = []
for row in rows:
    r_id, rid, name, r_type, lat, lon = row
    if lat is None or lon is None:
        continue

    categories = extract_categories(r_type)

    doc = {
        "r_id": r_id,
        "id": rid,
        "name": name,
        "type": r_type,
        "categories": categories,
        "lat": lat,
        "lon": lon,
        "location": {
            "lat": lat,
            "lon": lon
        }
    }
    documents.append(doc)

# Connect to Elasticsearch
es = Elasticsearch(
    "https://2ae07f7bf36d47cc9da14549c264281b.us-central1.gcp.cloud.es.io:443",
    api_key=(os.getenv("API_KEY_ID"), os.getenv("API_KEY"))
)


# Define the mapping you need
mappings = {
    "mappings": {
        "properties": {
            "r_id": {"type": "integer"},
            "id": {"type": "keyword"},
            "name": {"type": "text"},
            "type": {"type": "keyword"},
            "categories": {"type": "keyword"},
            "lat": {"type": "float"},
            "lon": {"type": "float"},
            "location": {"type": "geo_point"}
        }
    }
}

index_name = "full_restaurant"

# Delete existing index to avoid type conflicts
if es.indices.exists(index=index_name):
    es.indices.delete(index=index_name)

# Create new index with exact mapping
es.indices.create(index=index_name, body=mappings)

# Upload documents with r_id as unique _id
actions = [
    {
        "_index": index_name,
        "_id": doc["r_id"],
        "_source": doc
    }
    for doc in documents
]

helpers.bulk(es, actions)

print(f"Uploaded {len(documents)} documents to Elasticsearch index '{index_name}' with your exact mapping.")
