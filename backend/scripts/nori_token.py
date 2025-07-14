from elasticsearch import Elasticsearch
import json
import os
from dotenv import load_dotenv  # Correct import

load_dotenv()  # Correct function name

# Create Elasticsearch client
es = Elasticsearch(
    hosts=os.getenv("ES_HOST"),  # e.g., "http://localhost:9200"
    basic_auth=(os.getenv("ES_USER"), os.getenv("ES_PASS"))
)

new_index = "full_restaurant_kor"

settings = {
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
            "name": {
                "type": "text",
                "analyzer": "korean"
            },
            "address": {
                "type": "text",
                "analyzer": "korean"
            },
            "categories": {
                "type": "keyword"
            },
            "id": {
                "type": "keyword"
            },
            "lat": {
                "type": "float"
            },
            "lon": {
                "type": "float"
            },
            "location": {
                "type": "geo_point"
            },
            "r_id": {
                "type": "integer"
            },
            "type": {
                "type": "keyword"
            }
        }
    }
}

if not es.indices.exists(index=new_index):
    es.indices.create(index=new_index, body=settings)
    print(f"Created index '{new_index}' with Nori analyzer.")
else:
    print(f"Index '{new_index}' already exists.")

old_index = "full_restaurant"

reindex_body = {
    "source": {"index": old_index},
    "dest": {"index": new_index}
}

reindex_response = es.reindex(body=reindex_body, wait_for_completion=True)
print("Reindex response:", reindex_response)