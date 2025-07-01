import sqlite3
from elasticsearch import Elasticsearch, helpers
import os
from dotenv import load_dotenv
import json

load_dotenv()

# Elasticsearch connection
es = Elasticsearch(
    os.getenv("ES_HOST"),
    basic_auth=(os.getenv("ES_USER"), os.getenv("ES_PASS"))
)

# Function to extract categories
def extract_categories(type_str):
    if not type_str:
        return []
    try:
        trimmed = type_str.replace("음식점 >", "").strip()
        parts = []
        for part in trimmed.split(">"):
            parts.extend(p.strip() for p in part.split(","))
        return list(set(parts))
    except:
        return []

# Connect to SQLite
conn = sqlite3.connect("MangoBerry/backend/clean_copy.sqlite")
cursor = conn.cursor()

# Fetch rows
cursor.execute("SELECT r_id, id, name, type, lat, lon, address FROM restaurants;")
rows = cursor.fetchall()


# Format documents
documents = []
for row in rows:
    r_id, rid, name, r_type, lat, lon, address = row

    # Skip invalid coordinates
    if lat is None or lon is None:
        print(f"Skipping {name}: lat/lon missing")
        continue

    # Validate and build document
    try:
        categories = extract_categories(r_type)
        doc = {
            "r_id": int(r_id),
            "id": str(rid),
            "name": name,
            "type": r_type,
            "categories": categories,
            "lat": float(lat),
            "lon": float(lon),
            "location": {"lat": float(lat), "lon": float(lon)},
            "address": address
        }
        documents.append(doc)
    except Exception as e:
        print(f"Skipping row due to error: {e}")

index_name = "full_restaurant"

# Build bulk actions
actions = [
    {
        "_index": index_name,
        "_id": doc["r_id"],
        "_source": doc
    }
    for doc in documents
]

# Preview first document
print("First document preview:")
print(json.dumps(actions[0], ensure_ascii=False, indent=2))

# Try uploading a single document to test
try:
    res = es.index(index=index_name, id=actions[0]["_id"], document=actions[0]["_source"])
    print("Single document insert test passed.")
except Exception as e:
    print("Error inserting single document:")
    print(e)
    exit()

# Bulk upload with error collection
try:
    success, errors = helpers.bulk(es, actions, raise_on_error=False)
    print(f"Successfully uploaded {success} documents.")
    if errors:
        print("Some documents failed to upload:")
        for error in errors:
            print(json.dumps(error, indent=2))
except Exception as e:
    print("Bulk upload failed:")
    print(e)
