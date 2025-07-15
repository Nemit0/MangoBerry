import json

from ..connection.mongodb import user_keywords_collection

from ..services.generate_embedding import embed_small

def main():
    # Fetch all rows from user_keywords_collection
    print("Fetching user keywords from MongoDB…")
    cursor = user_keywords_collection.find({})
    rows = list(cursor)
    print(f"Fetched {len(rows)} user keyword documents.")
    for user in rows:
        print(f"Processing user {user['user_id']}…")
        keywords = user.get("keywords", [])

        keywords = [kw['name'] for kw in keywords if 'name' in kw]
        if not keywords:
            print(f"No keywords found for user {user['user_id']} — skipping.")
            continue
        
        embeddings = embed_small(keywords)
        embedding_map = {kw: embeddings[i] for i, kw in enumerate(keywords)}

        for keyword in user["keywords"]:
            keyword["embedding"] = embedding_map.get(keyword["name"], None)
        
        print(f"Updating user {user['_id']} with embeddings…")

        user_keywords_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"keywords": user["keywords"]}}
        )

if __name__ == "__main__":
    main()
