import csv
from elasticsearch import Elasticsearch
import os

# Connect to Elasticsearch
client = Elasticsearch(
    "https://2ae07f7bf36d47cc9da14549c264281b.us-central1.gcp.cloud.es.io:443",
    api_key="MnZmV241Y0JYMlJVdEl6TkpIQjU6dmlCQ1JHMjZjVVlRSVNxdXJncFk0QQ=="
)

index_name = "restaurant"
print("current working directory", os.getcwd())

# Read CSV and insert each row into Elasticsearch
with open("MangoBerry/backend/info.csv", newline='', encoding="utf-8") as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        try:
            doc = {
                "r_id": int(row["r_id"]),
                "id": row["id"],
                "name": row["name"],
                "type": row["type"],
                "lat": float(row["lat"]),
                "lon": float(row["lon"]),
                "location": {
                    "lat": float(row["lat"]),
                    "lon": float(row["lon"])
                }
            }
            response = client.index(index=index_name, document=doc)
            print(f"Inserted: {row['name']} | ID: {response['_id']}")
        except Exception as e:
            print(f"Failed to insert row: {row} — {e}")

