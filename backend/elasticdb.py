from elasticsearch import Elasticsearch
import csv

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


client = Elasticsearch(
    "https://2ae07f7bf36d47cc9da14549c264281b.us-central1.gcp.cloud.es.io:443",
    api_key="MnZmV241Y0JYMlJVdEl6TkpIQjU6dmlCQ1JHMjZjVVlRSVNxdXJncFk0QQ=="
)
index_name = "restaurant"

mappings = {
    "mappings": {
        "properties": {
            "r_id": {"type": "integer"},
            "id": {"type": "keyword"},
            "name": {"type": "text"},
            "type": {"type": "text"},
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
