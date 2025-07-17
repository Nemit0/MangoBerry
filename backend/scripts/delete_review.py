import requests

BACKEND = "http://127.0.0.1:8000"
# SEARCH_ENDPOINT = f"{BACKEND}/search_review_es"
# DELETE_ENDPOINT = f"{BACKEND}/reviews"
# HEADERS = {"accept": "application/json"}
BACKEND = "http://10.241.144.46:8000"
DELETE_ENDPOINT = f"{BACKEND}/reviews"
HEADERS = {"accept": "application/json"}

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