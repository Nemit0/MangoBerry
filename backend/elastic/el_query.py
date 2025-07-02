from elasticsearch import Elasticsearch
import sys

sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
import os

load_dotenv()

client = Elasticsearch(
    "https://2ae07f7bf36d47cc9da14549c264281b.us-central1.gcp.cloud.es.io:443",
    api_key=os.getenv("API_KEY")
)

def extract_categories(type_str):
    parts = [p.strip() for p in type_str.split(">")]
    categories = []
    for p in parts[1:]:
        categories.extend([cat.strip() for cat in p.split(",")])
    return [cat for cat in categories if cat]

def get_query(name=None, food_type=None, location=None, category=None):
    must = []
    if name:
        must.append({"match_phrase_prefix": {"name": name}})
    if food_type:
        must.append({"wildcard": {"type": f"*{food_type}*"}})
    if location:
        must.append({"match": {"location": location}})
    if category:
        must.append({"term": {"categories": category}})
    return {
        "query": {
            "bool": {
                "must": must
            }
        }
    }

params = {
    "food_type": "",
    "category": "베이커리",
    "name": "",
    "location": ""
}
query = get_query(**params)
response = client.search(index="restaurant", body=query, size=50)

for hit in response["hits"]["hits"]:
    doc = hit["_source"]
    print(f"{doc['name']} — {doc.get('categories')} — {doc['location']}")
