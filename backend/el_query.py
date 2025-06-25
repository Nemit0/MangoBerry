from elasticsearch import Elasticsearch
import sys

sys.stdout.reconfigure(encoding='utf-8')

client = Elasticsearch(
    "https://2ae07f7bf36d47cc9da14549c264281b.us-central1.gcp.cloud.es.io:443",
    api_key="MnZmV241Y0JYMlJVdEl6TkpIQjU6dmlCQ1JHMjZjVVlRSVNxdXJncFk0QQ=="
)

query = {
    "query": {
        "match": {
            "name": "하늘찬"
        }
    }
}

response = client.search(index="restaurant", body=query)

# Print result names
for hit in response["hits"]["hits"]:
    doc = hit["_source"]
    print(f"{doc['name']} — {doc['type']} - {doc['location']}")
