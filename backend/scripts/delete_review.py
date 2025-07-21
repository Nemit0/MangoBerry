import requests

# API setup
BACKEND = "http://10.241.144.46:8000"
DELETE_ENDPOINT = f"{BACKEND}/reviews"
HEADERS = {"accept": "application/json"}

def delete_review_by_id(review_id: int):
    """
    Sends a DELETE request to remove a review by its ID.
    """
    try:
        res = requests.delete(f"{DELETE_ENDPOINT}/{review_id}", headers=HEADERS)
        res.raise_for_status()
        print(f"[DELETED] review_id={review_id}")
    except requests.HTTPError as e:
        print(f"[ERROR] Failed to delete review_id={review_id}: {e.response.status_code} {e.response.text}")
    except Exception as e:
        print(f"[ERROR] Unexpected error for review_id={review_id}: {e}")

def main():
    """
    Iterates through a range of review IDs and attempts to delete each one.
    """
    for review_id in range(0, 500):
        delete_review_by_id(review_id)

if __name__ == "__main__":
    main()