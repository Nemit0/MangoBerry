from elasticsearch import Elasticsearch

client = Elasticsearch(
    "https://2ae07f7bf36d47cc9da14549c264281b.us-central1.gcp.cloud.es.io:443",
    api_key="MnZmV241Y0JYMlJVdEl6TkpIQjU6dmlCQ1JHMjZjVVlRSVNxdXJncFk0QQ=="
)

index_name = "restaurant"

# Step 1: Delete the index
if client.indices.exists(index=index_name):
    client.indices.delete(index=index_name)
    print(f"Deleted index: {index_name}")
else:
    print(f"ℹIndex '{index_name}' does not exist.")
