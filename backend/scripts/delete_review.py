import requests

BACKEND = "http://127.0.0.1:8000"
# SEARCH_ENDPOINT = f"{BACKEND}/search_review_es"
# DELETE_ENDPOINT = f"{BACKEND}/reviews"
# HEADERS = {"accept": "application/json"}
BACKEND = "http://10.241.144.46:8000"
DELETE_ENDPOINT = f"{BACKEND}/reviews"
HEADERS = {"accept": "application/json"}

# List all user_ids used in your REVIEWS list
# USER_IDS = [5, 6, 7, 8, 9]

# def get_reviews_by_user(user_id: int):
#     try:
#         params = {"user_id": user_id, "size": 100}
#         res = requests.get(SEARCH_ENDPOINT, headers=HEADERS, params=params)
#         res.raise_for_status()
#         return res.json().get("result", [])
#     except Exception as e:
#         print(f"[ERROR] Failed to search reviews for user_id={user_id}: {e}")
#         return []

# def delete_review_by_id(review_id: int):
#     try:
#         res = requests.delete(f"{DELETE_ENDPOINT}/{review_id}", headers=HEADERS)
#         res.raise_for_status()
#         print(f"[DELETED] review_id={review_id}")
#     except Exception as e:
#         print(f"[ERROR] Failed to delete review_id={review_id}: {e}")

# def main():
#     for user_id in USER_IDS:
#         print(f"Searching reviews for user_id={user_id}...")
#         reviews = get_reviews_by_user(user_id)
#         print(f"→ Found {len(reviews)} reviews")
#         for r in reviews:
#             if "review_id" in r:
#                 delete_review_by_id(r["review_id"])
#             else:
#                 print(f"[WARNING] No review_id in: {r}")
# if __name__ == "__main__":
#     main()
def delete_review_by_id(review_id: int):
    try:
        res = requests.delete(f"{DELETE_ENDPOINT}/{review_id}", headers=HEADERS)
        res.raise_for_status()
        print(f"[DELETED] review_id={review_id}")
    except requests.HTTPError as e:
        print(f"[ERROR] Failed to delete review_id={review_id}: {e.response.status_code} {e.response.text}")
    except Exception as e:
        print(f"[ERROR] Unexpected error for review_id={review_id}: {e}")

def main():
    for review_id in range(37, 108):  # 108 is exclusive, so this deletes 37 through 107
        delete_review_by_id(review_id)

if __name__ == "__main__":
    main()