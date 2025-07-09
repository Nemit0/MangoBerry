import os
import ast
import sqlite3
import pandas as pd
from collections import defaultdict, Counter
from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)
db = client["customer_info"]
collection = db["keywords"]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sqlite_path = os.path.join(BASE_DIR, "routers", "clean_copy.sqlite")
conn = sqlite3.connect(sqlite_path)
df = pd.read_sql_query("SELECT r_id, keywords FROM keywords", conn)
conn.close()

freq_by_restaurant = defaultdict(Counter)
for _, row in df.iterrows():
    rid = row["r_id"]
    try:
        kws = ast.literal_eval(row["keywords"])
        freq_by_restaurant[rid].update(kws)
    except Exception:
        continue


docs = []
for rid, counter in freq_by_restaurant.items():
    docs.append({
        "r_id": rid,
        "keywords": [
            {"keyword": kw, "frequency": freq}
            for kw, freq in counter.items()
        ]
    })


print("업로드 대상 식당 문서 수:", len(docs))
collection.delete_many({})
if docs:
    result = collection.insert_many(docs)
    print(f"keywords 컬렉션에 {len(result.inserted_ids)}개의 문서를 저장했습니다.")
else:
    print("저장할 문서가 없습니다.")