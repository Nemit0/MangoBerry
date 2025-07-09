from elasticsearch import Elasticsearch
import os

'''
<Some vocabularies>
    Elasticsearch:Relational db
    index         table
    document      row
    field         column
    mapping       schema

<Field types>
    text: full-text search
    keyword: exact matches
'''

# Ensure connection is successful
if not es_client.ping():
    raise ValueError("Connection to Elasticsearch failed. Check your credentials and host.")

client = Elasticsearch(
    "https://2ae07f7bf36d47cc9da14549c264281b.us-central1.gcp.cloud.es.io:443",
    api_key=os.getenv("API_KEY")
)
index_name = "restaurant"

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

if not client.indices.exists(index=index_name):
    response = client.indices.create(index=index_name, body=mappings)
    print("Index created:", response)
else:
    print("Index already exists.")