
from elasticsearch import Elasticsearch, helpers

client = Elasticsearch(
    "https://2ae07f7bf36d47cc9da14549c264281b.us-central1.gcp.cloud.es.io:443",
    api_key="MnZmV241Y0JYMlJVdEl6TkpIQjU6dmlCQ1JHMjZjVVlRSVNxdXJncFk0QQ=="
)
index_name = "restaurant"
all_docs = helpers.scan(client, index=index_name)

# Step 2: Track seen r_id and collect duplicate _id's to delete
seen = set()
to_delete = []

for doc in all_docs:
    r_id = doc["_source"]["r_id"]
    if r_id in seen:
        to_delete.append({"_op_type": "delete", "_index": index_name, "_id": doc["_id"]})
    else:
        seen.add(r_id)

# Step 3: Bulk delete duplicates
if to_delete:
    helpers.bulk(client, to_delete)
    print(f"Deleted {len(to_delete)} duplicates.")
else:
    print("No duplicates found.")

