import sqlite3
import os
import sys
import json
from pathlib import Path
from tqdm import tqdm
from tqdm.asyncio import tqdm_asyncio   # kept: you may still want async later

from ..connection.mongodb import restaurant_keywords_collection
from ..services.generate_embedding import embed_small

# ────────────────────────────────────────────────────────────────────────────────
# CONSTANTS (unchanged)
LAST_KEYWORD_ID = 8749
SQLITE_DB_PATH = (
    Path(__file__).parent.parent.parent
    / ".test"
    / "data"
    / "backup"
    / "seoul_restaurants.sqlite"
)
UPLOAD_KEYWORDS = True        # ← set to True to perform the MongoDB update
BATCH_SIZE = 512              # openai text-embedding-3-small max = 512 inputs

# ────────────────────────────────────────────────────────────────────────────────
def main() -> None:
    # 1. 𝗟𝗼𝗮𝗱 𝗻𝗲𝘄 𝗿𝗼𝘄𝘀 𝗳𝗿𝗼𝗺 SQLite
    connection = sqlite3.connect(SQLITE_DB_PATH)
    cursor = connection.cursor()

    print("Fetching keywords from SQLite database…")
    cursor.execute("SELECT * FROM keywords WHERE k_id > ?", (LAST_KEYWORD_ID,))
    rows = cursor.fetchall()
    print(f"Fetched {len(rows)} new keywords.")

    # optional sanity samples (kept)
    sample_row = rows[0] if rows else None
    if sample_row:
        sample_keyword = {
            "k_id": sample_row[0],
            "b_id": sample_row[1],
            "r_id": sample_row[2],
            "name": sample_row[3],
            "title": sample_row[4],
            "keywords": json.loads(sample_row[5]) if sample_row[5] else [],
        }
        print(f"Sample keyword row: {sample_keyword}")

    if not rows:
        print("Nothing new to process — exiting.")
        return

    if not UPLOAD_KEYWORDS:
        print("UPLOAD_KEYWORDS == False → dry-run only — exiting.")
        return

    # 2. 𝗧𝗿𝗮𝗻𝘀𝗳𝗼𝗿𝗺 rows → list[dict] for easier handling
    new_rows = [
        {
            "k_id": row[0],
            "b_id": row[1],
            "r_id": row[2],
            "name": row[3],
            "title": row[4],
            "keywords": json.loads(row[5]) if row[5] else [],
        }
        for row in rows
    ]

    # ────────────────────────────────────────────────────────────────────────
    # 3. 𝗙𝗲𝘁𝗰𝗵 𝗲𝘅𝗶𝘀𝘁𝗶𝗻𝗴 MongoDB docs once; build a fast lookup map
    from pymongo import UpdateOne

    print("Loading existing restaurant keyword docs from MongoDB…")
    existing_docs = list(restaurant_keywords_collection.find({}, {"_id": 0}))
    rmap: dict[int, dict] = {doc["r_id"]: doc for doc in existing_docs}
    print(f"Loaded {len(rmap)} existing docs.")

    # ────────────────────────────────────────────────────────────────────────
    # 4. 𝗠𝗲𝗿𝗴𝗲 𝗸𝗲𝘆𝘄𝗼𝗿𝗱𝘀 𝗶𝗻-𝗺𝗲𝗺𝗼𝗿𝘆 (keywords array only)
    for row in tqdm(new_rows, desc="Merging keywords"):
        r_id = row["r_id"]
        kw_strings = row["keywords"]

        # fetch or create a minimal schema-compliant document
        doc = rmap.get(r_id)
        if doc is None:
            doc = {"r_id": r_id, "keywords": []}
            rmap[r_id] = doc

        # build index {keyword→obj} for O(1) access
        kw_index = {item["keyword"]: item for item in doc["keywords"]}

        # merge/update
        for kw in kw_strings:
            if kw in kw_index:
                kw_index[kw]["frequency"] += 1
            else:
                kw_index[kw] = {"keyword": kw, "frequency": 1}  # embedding later

        # write back flattened list
        doc["keywords"] = list(kw_index.values())
    
    # ────────────────────────────────────────────────────────────────────────
    # 4.5 𝗦𝗮𝗻𝗶𝘁𝘆 𝗰𝗵𝗲𝗰𝗸: print some merged documents

    print("\nSample of merged documents:")
    for r_id, doc in list(rmap.items())[:5]:  # show first 5 documents
        print(f"r_id: {r_id}, keywords: {len(doc['keywords'])}")
        for kw in doc["keywords"][:3]:  # show first 3 keywords
            print(f"  - {kw['keyword']} (freq: {kw['frequency']})")
            if "embedding" in kw and kw["embedding"] is not None:
                print(f"    Embedding: {kw['embedding'][:5]}...")
    print(f"Total documents processed: {len(rmap)}")

    # ────────────────────────────────────────────────────────────────────────
    # 5. 𝗖𝗼𝗺𝗽𝗶𝗹𝗲 𝗸𝗲𝘆𝘄𝗼𝗿𝗱𝘀 𝗻𝗲𝗲𝗱𝗶𝗻𝗴 𝗲𝗺𝗯𝗲𝗱𝗱𝗶𝗻𝗴𝘀
    pending = []
    for d in rmap.values():
        for kw_obj in d["keywords"]:
            if "embedding" not in kw_obj or kw_obj["embedding"] is None:
                pending.append(kw_obj["keyword"])

    # unique while preserving order
    seen = set()
    unique_pending = [k for k in pending if not (k in seen or seen.add(k))]
    print(f"{len(unique_pending)} embeddings to generate…")

    # ────────────────────────────────────────────────────────────────────────
    # 5.5 𝗦𝗮𝗻𝗶𝘁𝘆 𝗰𝗵𝗲𝗰𝗸: print some pending keywords

    print("\nSample of pending keywords for embedding:")
    for kw in unique_pending[:10]:  # show first 10 keywords
        print(f"  - {kw}")
    print(f"Total unique pending keywords: {len(unique_pending)}")

    # sys.exit(0)

    # ────────────────────────────────────────────────────────────────────────
    # 6. 𝗚𝗲𝗻𝗲𝗿𝗮𝘁𝗲 𝗲𝗺𝗯𝗲𝗱𝗱𝗶𝗻𝗴𝘀
    BATCH_SIZE = 512
    emb_map: dict[str, list[float]] = {}
    for start in tqdm(range(0, len(unique_pending), BATCH_SIZE), desc="Embedding"):
        batch = unique_pending[start:start + BATCH_SIZE]
        vectors = embed_small(batch)
        emb_map.update({kw: list(vec) for kw, vec in zip(batch, vectors)})

    # attach embeddings
    for d in rmap.values():
        for kw_obj in d["keywords"]:
            if "embedding" not in kw_obj or kw_obj["embedding"] is None:
                kw_obj["embedding"] = emb_map.get(kw_obj["keyword"])

    # ────────────────────────────────────────────────────────────────────────
    # 6.5 Print some documents to be updated for sanity check
    print("\nSample of updated documents:")
    for r_id, doc in list(rmap.items())[:5]:  # show first 5 documents
        print(f"r_id: {r_id}, keywords: {len(doc['keywords'])}")
        for kw in doc["keywords"][:3]:  # show first 3 keywords
            print(f"  - {kw['keyword']} (freq: {kw['frequency']})")
            if kw.get("embedding"):
                print(f"    Embedding: {kw['embedding'][:5]}...")   

    # ────────────────────────────────────────────────────────────────────────
    # 7. 𝗕𝘂𝗹𝗸-𝘂𝗽𝘀𝗲𝗿𝘁 𝗯𝗮𝗰𝗸 𝘁𝗼 MongoDB (only keywords field)
    print("Writing back to MongoDB…")
    ops = [
        UpdateOne(
            {"r_id": d["r_id"]},
            {"$set": {"keywords": d["keywords"]}},
            upsert=True,
        )
        for d in rmap.values()
    ]
    if ops:
        result = restaurant_keywords_collection.bulk_write(ops, ordered=False)
        print("Bulk write complete:", result.bulk_api_result)
    else:
        print("No changes detected.")


# ────────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    main()
