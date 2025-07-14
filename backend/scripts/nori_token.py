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

# Get and print mapping
mapping = es.indices.get_mapping(index="user_review_kor")
print(json.dumps(mapping.body, indent=2, ensure_ascii=False))