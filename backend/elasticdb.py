from elasticsearch import Elasticsearch

client = Elasticsearch(
    "https://2ae07f7bf36d47cc9da14549c264281b.us-central1.gcp.cloud.es.io:443",
    api_key="MnZmV241Y0JYMlJVdEl6TkpIQjU6dmlCQ1JHMjZjVVlRSVNxdXJncFk0QQ=="
)
index_name = "restaurant"
mappings = {
    "properties": {
        "text": {
            "type": "text"
        }
    }
}
mapping_response = client.indices.put_mapping(index=index_name, body=mappings)
print(mapping_response)