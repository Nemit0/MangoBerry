from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import create_session, Session
from random import randint
from collections import Counter

from ..connection.mysqldb import get_db, Review, Restaurant, Users
from ..connection.mongodb import photo_collection, review_keywords_collection, user_keywords_collection
from ..connection.elasticdb import es_client as es

from ..schemas.review import ReviewCreate, ReviewUpdate

from ..services.utilities import random_prime_in_range

router = APIRouter()

'''
Helper functions
'''
def update_user_keywords(user_id: int, pos_keywords: list, neg_keywords: list):
    keyword_doc = user_keywords_collection.find_one({"user_id": user_id}) or {"user_id": user_id, "keywords": []}
    existing_keywords = {kw["name"]: kw for kw in keyword_doc["keywords"]}

    pos_counter = Counter(pos_keywords)
    neg_counter = Counter(neg_keywords)

    for kw, freq in pos_counter.items():
        if kw in existing_keywords and existing_keywords[kw]["sentiment"] == "positive":
            existing_keywords[kw]["frequency"] += freq
        else:
            existing_keywords[kw] = {"name": kw, "sentiment": "positive", "frequency": freq}

    for kw, freq in neg_counter.items():
        if kw in existing_keywords and existing_keywords[kw]["sentiment"] == "negative":
            existing_keywords[kw]["frequency"] += freq
        else:
            existing_keywords[kw] = {"name": kw, "sentiment": "negative", "frequency": freq}

    user_keywords_collection.update_one(
        {"user_id": user_id},
        {"$set": {"keywords": list(existing_keywords.values())}},
        upsert=True
    )

def subtract_user_keywords(user_id: int, pos_keywords: list, neg_keywords: list):
    doc = user_keywords_collection.find_one({"user_id": user_id})
    if not doc:
        return

    # Create a dictionary from current keywords
    keyword_map = {kw["name"]: kw for kw in doc.get("keywords", [])}

    # Subtract frequencies for positive keywords
    for kw in pos_keywords:
        if kw in keyword_map and keyword_map[kw]["sentiment"] == "positive":
            keyword_map[kw]["frequency"] -= 1

    # Subtract frequencies for negative keywords
    for kw in neg_keywords:
        if kw in keyword_map and keyword_map[kw]["sentiment"] == "negative":
            keyword_map[kw]["frequency"] -= 1

    # Remove keywords with frequency <= 0
    updated_keywords = [kw for kw in keyword_map.values() if kw["frequency"] > 0]

    # Update MongoDB document
    user_keywords_collection.update_one(
        {"user_id": user_id},
        {"$set": {"keywords": updated_keywords}},
        upsert=True
    )

@router.get("/review_sql", tags=["Reviews"])
def read_review_sql(db: Session = Depends(get_db)):
    return db.query(Review).all()


'''
create, update, and delete review APIs
'''
@router.post("/reviews", tags=["Reviews"])
def create_review(payload: ReviewCreate, db: Session = Depends(get_db)):

    filenames_str = ",".join(payload.photo_filenames) if payload.photo_filenames else None

    # Get user and restaurant state_id
    u_state_id = db.query(Users.state_id).filter(Users.user_id == payload.user_id).first()
    r_state_id = db.query(Restaurant.state_id).filter(Restaurant.restaurant_id == payload.restaurant_id).first()

    print(f"User state_id: {u_state_id}, Restaurant state_id: {r_state_id}")

    # Calculate combined state_id
    if u_state_id and r_state_id:
        state_id = u_state_id[0] * r_state_id[0]

    try:
        # Save to MySQL
        new_review = Review(
            user_id=payload.user_id,
            restaurant_id=payload.restaurant_id,
            comments=payload.comments,
            review=payload.review,
            photo_filenames=filenames_str,
            state_id=state_id if 'state_id' in locals() else 1
        )
        db.add(new_review)
        db.commit()
        db.refresh(new_review)
        review_id = new_review.review_id

        # Save photo URLs to MongoDB
        if payload.photo_urls:
            photo_collection.insert_one({
                "review_id": review_id,
                "photo_urls": payload.photo_urls
            })
        
        # Save keyword data to MongoDB
        if payload.positive_keywords or payload.negative_keywords:
            review_keywords_collection.insert_one({
            "review_id": review_id,
            "positive_keywords": payload.positive_keywords or [],
            "negative_keywords": payload.negative_keywords or []
        })
            update_user_keywords(
                user_id=payload.user_id,
                pos_keywords=payload.positive_keywords or [],
                neg_keywords=payload.negative_keywords or []
            )

        # Index in Elasticsearch
        es.index(index="user_review_kor", id=review_id, document={
            "review_id": review_id,
            "user_id": payload.user_id,
            "restaurant_id": payload.restaurant_id,
            "comments": payload.comments,
            "review": payload.review 
        })

        return {
            "message": "Review created", 
            "review_id": review_id,
            "state_id": state_id if 'state_id' in locals() else 1
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.put("/reviews/{review_id}", tags=["Reviews"])
def update_review(review_id: int, payload: ReviewUpdate, db: Session = Depends(get_db)):
    try:
        review = db.query(Review).filter(Review.review_id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")

        # Update MySQL fields if provided
        if payload.comments is not None:
            review.comments = payload.comments
        if payload.review is not None:
            review.review = payload.review
        if payload.photo_filenames is not None:
            review.photo_filenames = ",".join(payload.photo_filenames)
        if payload.state_id is not None:
            review.state_id = payload.state_id
        
        r_state_id = db.query(Restaurant.state_id).filter(Restaurant.restaurant_id == review.restaurant_id).first()
        u_state_id = db.query(Users.state_id).filter(Users.user_id == review.user_id).first()

        new_state_id = r_state_id[0] * u_state_id[0] if r_state_id and u_state_id else 1

        if new_state_id != review.state_id:
            review.state_id = new_state_id

        db.commit()

        # Update MongoDB
        if payload.photo_urls is not None:
            photo_collection.update_one(
                {"review_id": review_id},
                {"$set": {"photo_urls": payload.photo_urls}},
                upsert=True
            )

        # Fetch previous review keywords
        prev_keywords = review_keywords_collection.find_one({"review_id": review_id}) or {
            "positive_keywords": [],
            "negative_keywords": []
        }

        # Update review_keywords in MongoDB
        keyword_update = {}
        if payload.positive_keywords is not None:
            keyword_update["positive_keywords"] = payload.positive_keywords
        if payload.negative_keywords is not None:
            keyword_update["negative_keywords"] = payload.negative_keywords

        if keyword_update:
            review_keywords_collection.update_one(
                {"review_id": review_id},
                {"$set": keyword_update},
                upsert=True
            )

        # Update user_keywords collection
        subtract_user_keywords(
            review.user_id,
            prev_keywords.get("positive_keywords", []),
            prev_keywords.get("negative_keywords", [])
        )
        update_user_keywords(
            user_id=review.user_id,
            pos_keywords=payload.positive_keywords or [],
            neg_keywords=payload.negative_keywords or []
        )
 

        # Update Elasticsearch
        es.update(index="user_review_kor", id=review_id, body={
            "doc": {
                "comments": payload.comments,
                "review": payload.review,
                "photo_filenames": review.photo_filenames
            }
        })

        return {"message": "Review updated", "review_id": review_id}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/reviews/{review_id}", tags=["Reviews"])
def delete_review(review_id: int, db: Session = Depends(get_db)):
    try:
        # Step 1: Find review (MySQL)
        review = db.query(Review).filter(Review.review_id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")

        # Step 2: Get keywords from MongoDB before deleting them
        review_kw = review_keywords_collection.find_one({"review_id": review_id})
        pos_keywords = review_kw.get("positive_keywords", []) if review_kw else []
        neg_keywords = review_kw.get("negative_keywords", []) if review_kw else []

        # Step 3: Delete from MySQL
        db.delete(review)
        db.commit()

        # Step 4: Delete from MongoDB
        photo_collection.delete_one({"review_id": review_id})
        review_keywords_collection.delete_one({"review_id": review_id})

        # Step 5: Subtract keyword frequencies from user_keywords
        subtract_user_keywords(
            user_id=review.user_id,
            pos_keywords=pos_keywords,
            neg_keywords=neg_keywords
        )

        # Step 6: Delete from Elasticsearch
        es.delete(index="user_review_kor", id=str(review_id), ignore=[404])

        return {"message": f"Review {review_id} deleted successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
