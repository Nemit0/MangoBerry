import sqlite3
import os
import json

from pathlib import Path
from tqdm import tqdm

from ..connection.mongodb import restaurant_keywords_collection
from ..services.generate_embedding import embed_small

LAST_KEYWORD_ID = 8749
SQLITE_DB_PATH = Path(__file__).parent.parent.parent / ".test" / "data" / "backup" / "seoul_restaurants.sqlite"

UPLOAD_KEYWORDS = False 

def main():
    connection = sqlite3.connect(SQLITE_DB_PATH)
    cursor = connection.cursor()

    print("Fetching keywords from SQLite database...")
    cursor.execute("SELECT * FROM keywords WHERE k_id > ?", (LAST_KEYWORD_ID,))
    rows = cursor.fetchall()
    print(f"Fetched {len(rows)} new keywords.")

    # parse a single keyword for sample
    sample_row = rows[0] if rows else None
    print(f"Sample row: {sample_row}")
    print(len(sample_row))
    if sample_row:
        sample_keyword = {
            "k_id": sample_row[0],
            "b_id": sample_row[1],
            "r_id": sample_row[2],
            "name": sample_row[3],
            "title": sample_row[4],
            "keywords": json.loads(sample_row[5]) if sample_row[5] else []
        }
        print(f"Sample keyword: {sample_keyword}")

    # prepare mongodb documents
    sample_row = restaurant_keywords_collection.find_one({"k_id": LAST_KEYWORD_ID})
    if sample_row:
        print(f"Sample MongoDB document: {sample_row}")
    
    # insert a sample document for sanity check
    sample_doc = {
        "k_id": LAST_KEYWORD_ID + 1,
        "b_id": sample_row["b_id"] if sample_row else None,
        "r_id": sample_row["r_id"] if sample_row else None,
        "name": "Sample Keyword",
        "title": "Sample Title",
        "keywords": ["sample", "keyword"]
    }
    print(f"Sample document to insert: {sample_doc}")

    if UPLOAD_KEYWORDS:
        print("Uploading keywords to MongoDB...")
        # Insert new keywords into MongoDB
        restaurant_keywords_collection.insert_many([
            {
                "k_id": row[0],
                "b_id": row[1],
                "r_id": row[2],
                "name": row[3],
                "title": row[4],
                "keywords": json.loads(row[5]) if row[5] else []
            } for row in rows
        ])
        print(f"Uploaded {len(rows)} new keywords to MongoDB.")
    
    # delete the inserted sample document
    if UPLOAD_KEYWORDS:
        print("Deleting sample document from MongoDB...")
        restaurant_keywords_collection.delete_one({"k_id": LAST_KEYWORD_ID + 1})
        print("Sample document deleted.")

    if not rows or not UPLOAD_KEYWORDS:
        print("No new keywords to upload or upload is disabled.")
        return
    
    # Get all keywords from MongoDB
    print("Fetching all keywords from MongoDB...")
    existing_keywords = list(restaurant_keywords_collection.find({"k_id": {"$gt": LAST_KEYWORD_ID}}))
    print(f"Found {len(existing_keywords)} existing keywords in MongoDB.")

    # update the rows with new keywords
    
    
    # Generate embeddings for the keywords
    print("Generating embeddings for keywords...")
    for row in tqdm(rows):
        keywords = json.loads(row[5]) if row[5] else []
        if not keywords:
            continue
        
        embeddings = embed_small(keywords)
        row["keywords"] = [
            {
                "keyword": keywords[i],
                "embedding": embeddings[i].tolist() if embeddings[i] is not None else None
            } for i in range(len(keywords))
        ]
    
    # 
    

if __name__ == "__main__":
    main()