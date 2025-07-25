import os
import math
from datetime import datetime
from typing import Iterator, List, Dict

from sqlalchemy import create_engine, text
from elasticsearch import Elasticsearch, helpers

from ..connection.elasticdb import es_client

# ───────────────────── config ─────────────────────
MYSQL_DSN = os.getenv(
    "MYSQL_DSN",
    "mysql+pymysql://user:pass@127.0.0.1:3306/yourdb?charset=utf8mb4"
)
ES_URL = os.getenv("ES_URL", "http://localhost:9200")

INDEX_NAME_NEW = "user_review_nickname_v2"
ALIAS_NAME     = "user_review_nickname"
BATCH_SIZE     = 1000

# Optional: set to True if you want to delete ES docs that aren't in MySQL.
DELETE_ORPHANS = True

# ─────────────────── mappings ─────────────────────
MAPPING = {
    "settings": {
        "analysis": {
            "analyzer": {
                # Use standard if you don't have nori plugin
                "korean_text": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase"]
                }
            }
        }
    },
    "mappings": {
        "dynamic": "strict",
        "properties": {
            "review_id":     {"type": "long"},
            "user_id":       {"type": "long"},
            "restaurant_id": {"type": "long"},
            "nickname":      {"type": "keyword"},
            "comments":      {"type": "text", "analyzer": "korean_text"},
            "review":        {"type": "text", "analyzer": "korean_text"},
            "photo_filenames": {"type": "keyword"},
            "created_at":    {
                "type":   "date",
                "format": "strict_date_optional_time||epoch_millis"
            }
        }
    }
}

# ─────────────────── sql query ────────────────────
SQL = """
SELECT
    r.review_id,
    r.user_id,
    r.restaurant_id,
    p.nickname,
    r.comments,
    r.review,
    r.photo_filenames,
    r.created_at
FROM Review r
LEFT JOIN People p ON p.user_id = r.user_id
ORDER BY r.review_id
"""

# ─────────────────── helpers ──────────────────────
def chunk_iterable(iterable, size):
    """Yield lists of length size from iterable."""
    chunk = []
    for item in iterable:
        chunk.append(item)
        if len(chunk) == size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk

def es_create_index_if_needed(es: Elasticsearch, name: str, body: dict):
    if es.indices.exists(index=name):
        print(f"[INFO] Index {name} already exists.")
        return
    es.indices.create(index=name, **body)
    print(f"[OK] Created index {name}")

def es_point_alias(es: Elasticsearch, alias: str, new_index: str):
    # Remove alias from any current index and attach to new_index atomically
    actions = []
    if es.indices.exists_alias(name=alias):
        for old in es.indices.get_alias(name=alias).keys():
            actions.append({"remove": {"index": old, "alias": alias}})
    actions.append({"add": {"index": new_index, "alias": alias}})
    es.indices.update_aliases({"actions": actions})
    print(f"[OK] Alias {alias} -> {new_index}")

def fetch_mysql_rows(engine) -> Iterator[Dict]:
    with engine.connect() as conn:
        result = conn.execution_options(stream_results=True).execute(text(SQL))
        for row in result:
            yield dict(row._mapping)

def transform(row: Dict) -> Dict:
    return {
        "review_id":     int(row["review_id"]),
        "user_id":       int(row["user_id"]),
        "restaurant_id": int(row["restaurant_id"]),
        "nickname":      row["nickname"] or None,
        "comments":      row["comments"] or "",
        "review":        row["review"] or "",
        # split comma-string safely into list (strip spaces)
        "photo_filenames": [
            fn.strip() for fn in (row["photo_filenames"] or "").split(",") if fn.strip()
        ],
        "created_at":    row["created_at"].isoformat() if row["created_at"] else None,
    }

def bulk_index(es: Elasticsearch, index: str, docs: List[Dict]):
    actions = [
        {
            "_op_type": "index",
            "_index": index,
            "_id": d["review_id"],
            "_source": d
        }
        for d in docs
    ]
    helpers.bulk(es, actions, chunk_size=200, request_timeout=120)
    print(f"[OK] Indexed {len(docs)} docs")

def collect_es_ids(es: Elasticsearch, index_or_alias: str) -> set:
    ids = set()
    for page in helpers.scan(es, index=index_or_alias, _source=False, query={"query": {"match_all": {}}}):
        ids.add(int(page["_id"]))
    return ids

def main():
    engine = create_engine(MYSQL_DSN)
    es      = Elasticsearch(ES_URL)

    # 1) Ensure index exists
    es_create_index_if_needed(es, INDEX_NAME_NEW, MAPPING)

    # 2) Bulk insert all rows
    all_ids = set()
    batch = []
    for row in fetch_mysql_rows(engine):
        doc = transform(row)
        all_ids.add(doc["review_id"])
        batch.append(doc)
        if len(batch) >= BATCH_SIZE:
            bulk_index(es, INDEX_NAME_NEW, batch)
            batch.clear()
    if batch:
        bulk_index(es, INDEX_NAME_NEW, batch)

    # 3) Delete orphans (docs in ES but not in MySQL)
    if DELETE_ORPHANS:
        es_ids = collect_es_ids(es, INDEX_NAME_NEW)
        orphan_ids = es_ids - all_ids
        if orphan_ids:
            print(f"[INFO] Deleting {len(orphan_ids)} orphans...")
            helpers.bulk(es, (
                {"_op_type": "delete", "_index": INDEX_NAME_NEW, "_id": oid}
                for oid in orphan_ids
            ))
        else:
            print("[OK] No orphan docs to delete.")

    # 4) Point alias
    es_point_alias(es, ALIAS_NAME, INDEX_NAME_NEW)
    print("[DONE] Sync complete.")

if __name__ == "__main__":
    main()