from elasticsearch import Elasticsearch
from dotenv import load_dotenv
import os

load_dotenv()

client = Elasticsearch(
    "https://2ae07f7bf36d47cc9da14549c264281b.us-central1.gcp.cloud.es.io:443",
    api_key=os.getenv("API_KEY")
)

index_name = "restaurant"

# Step 1: Delete the index
if client.indices.exists(index=index_name):
    client.indices.delete(index=index_name)
    print(f"Deleted index: {index_name}")
else:
    print(f"ℹIndex '{index_name}' does not exist.")
