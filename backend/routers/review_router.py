import datetime
import traceback
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import create_session, Session
from random import randint
from collections import Counter

from ..connection.mysqldb import get_db, Review, Restaurant, Users, People
from ..connection.mongodb import photo_collection, review_keywords_collection, user_keywords_collection, user_rest_score, restaurant_keywords_collection
from ..connection.elasticdb import es_client as es

from ..schemas.review import ReviewCreate, ReviewUpdate

from ..services.utilities import random_prime_in_range
from ..services.generate_embedding import embed_small
from ..services.calc_score import update_user_to_restaurant_score

from .common_imports import *

router = APIRouter()

'''
Helper functions
'''
def update_user_keywords(
    user_id: int,
    pos_keywords: list[str],
    neg_keywords: list[str],
    db: Session
) -> None:
    """
    Update or insert the user's keyword frequencies and embeddings in MongoDB.

    Parameters
    ----------
    user_id : int
        The target user's ID.
    pos_keywords : list[str]
        List of positive sentiment keywords.
    neg_keywords : list[str]
        List of negative sentiment keywords.
    db : Session
        SQLAlchemy session for relational DB updates.
    """
    # Step 1: Clean and count keywords
    pos_keywords = [kw.strip() for kw in pos_keywords if kw and kw.strip()]
    neg_keywords = [kw.strip() for kw in neg_keywords if kw and kw.strip()]

    pos_counter = Counter(pos_keywords)
    neg_counter = Counter(neg_keywords)

    # Step 2: Load existing MongoDB document
    doc = user_keywords_collection.find_one({"user_id": user_id}) or {"user_id": user_id, "keywords": []}
    existing: dict[tuple[str, str], dict] = {
        (kw["name"], kw["sentiment"]): kw for kw in doc["keywords"]
    }

    print(f"pos_keywords: {pos_keywords}")
    print(f"neg_keywords: {neg_keywords}")
    print(f"existing keywords in Mongo: {list(existing.keys())}")

    # Step 3: Identify keywords that need new embeddings
    to_embed = {
        kw for kw in set(pos_counter) | set(neg_counter)
        if (kw, "positive") not in existing and (kw, "negative") not in existing
    }

    embedding_map = {}
    if to_embed:
        try:
            vectors = embed_small(list(to_embed))
            embedding_map = {kw: [round(float(x), 5) for x in vectors[i]] for i, kw in enumerate(to_embed)}
            print(f"embed_small success - embedded {len(embedding_map)} keywords")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Embedding service failed: {exc}") from exc

    print(f"keywords to embed: {to_embed}")

    # Step 4: Update keyword entries in the map
    def upsert(name: str, sentiment: str, delta: int):
        key = (name, sentiment)
        if key in existing:
            existing[key]["frequency"] += delta
        else:
            embed = (
                existing.get((name, "positive"), {}).get("embedding") or
                existing.get((name, "negative"), {}).get("embedding") or
                embedding_map.get(name)
            )
            if embed is None:
                raise HTTPException(
                    status_code=500,
                    detail=f"No embedding available for keyword '{name}'"
                )
            existing[key] = {
                "name": name,
                "sentiment": sentiment,
                "frequency": delta,
                "embedding": embed
            }

    for kw, freq in pos_counter.items():
        upsert(kw, "positive", freq)
    for kw, freq in neg_counter.items():
        upsert(kw, "negative", freq)

    # Step 5: Write back to MongoDB
    try:
        result = user_keywords_collection.update_one(
            {"user_id": user_id},
            {"$set": {"keywords": list(existing.values())}},
            upsert=True
        )
        print(f"MongoDB update acknowledged: {result.acknowledged}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"MongoDB update failed: {exc}") from exc

    # Step 6: Update relational DB (user state_id)
    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.state_id = random_prime_in_range()
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"User {user_id} state_id updated to {user.state_id}")

def update_restaurant_keywords(
        restaurant_id: int, 
        keywords: list[str],
        db: Session
    ) -> None:
    """
    Update the restaurant's keyword document with new keywords.

    Parameters
    ----------
    restaurant_id : int
        Target restaurant.
    keywords : list[str]
        Keywords extracted from the review.
    """
    if not keywords:
        return

    # Count occurrences of each keyword
    keyword_counter = Counter(keywords)

    # Fetch existing keywords for this restaurant
    existing_keywords = (
        restaurant_keywords_collection.find_one({"r_id": restaurant_id})
        or {"r_id": restaurant_id, "keywords": []}
    )

    existing_map = {
        kw["keyword"]: kw for kw in existing_keywords.get("keywords", [])
    }

    print(f"[DEBUG] Before update - Existing keywords for restaurant {restaurant_id}: {existing_map}")
    new_keywords = set(keyword_counter.keys()) - set(existing_map)

    if new_keywords:
        try:
            vectors = embed_small(list(new_keywords))
            embedding_map = {kw: vectors[i] for i, kw in enumerate(new_keywords)}
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Embedding service failed: {exc}",
            ) from exc

    # Update or insert keywords
    for name, freq in keyword_counter.items():
        if name in existing_map:
            existing_map[name]["frequency"] += freq
        else:
            existing_map[name] = {
                "keyword": name,
                "frequency": freq,
                "embedding": embedding_map.get(name)
            }

    # Save updated keywords back to MongoDB
    cleaned_keywords = [
        {
            "keyword": kw["keyword"],
            "frequency": kw["frequency"],
            "embedding": kw.get("embedding")
        }
        for kw in existing_map.values()
    ]

    restaurant_keywords_collection.update_one(
        {"r_id": restaurant_id},
        {"$set": {"keywords": cleaned_keywords}},
        upsert=True,
    )
    # Set a new_state_id for the restaurant
    r_state_id = random_prime_in_range()
    rest_obj = db.query(Restaurant).filter(Restaurant.restaurant_id == restaurant_id).first()
    if rest_obj:
        rest_obj.state_id = r_state_id
        db.add(rest_obj)
        db.flush()
        db.commit()
        db.refresh(rest_obj)
    else:
        raise HTTPException(status_code=404, detail="Restaurant not found")


def subtract_user_keywords(
        user_id: int, 
        pos_keywords: list, 
        neg_keywords: list,
        db: Session
        ) -> None:
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

    # Set a new state_id for the user
    u_state_id = random_prime_in_range()
    user_obj = db.query(Users).filter(Users.user_id == user_id).first()
    if user_obj:
        user_obj.state_id = u_state_id
        db.add(user_obj)
        db.flush()
        db.commit()
        db.refresh(user_obj)
    else:
        raise HTTPException(status_code=404, detail="User not found")

def subtract_restaurant_keywords(
        restaurant_id: int, 
        keywords: list[str],
        db: Session
        ) -> None:
    """
    Subtract keyword frequencies from the restaurant's keyword document.

    Parameters
    ----------
    restaurant_id : int
        Target restaurant.
    keywords : list[str]
        Keywords to subtract.
    """
    if not keywords:
        return

    # Fetch existing keywords for this restaurant
    existing_keywords = (
        review_keywords_collection.find_one({"restaurant_id": restaurant_id})
        or {"restaurant_id": restaurant_id, "keywords": []}
    )

    existing_map = {kw["keyword"]: kw for kw in existing_keywords.get("keywords", [])}

    # Subtract frequencies for each keyword
    for kw in keywords:
        if kw in existing_map:
            existing_map[kw]["frequency"] -= 1

            # Remove keyword if frequency <= 0
            if existing_map[kw]["frequency"] <= 0:
                del existing_map[kw]

    # Save updated keywords back to MongoDB
    review_keywords_collection.update_one(
        {"restaurant_id": restaurant_id},
        {"$set": {"keywords": list(existing_map.values())}},
        upsert=True,
    )

    # Set a new state_id for the restaurant
    r_state_id = random_prime_in_range()
    rest_obj = db.query(Restaurant).filter(Restaurant.restaurant_id == restaurant_id).first()
    if rest_obj:
        rest_obj.state_id = r_state_id
        db.add(rest_obj)
        db.flush()
        db.commit()
        db.refresh(rest_obj)
    else:
        raise HTTPException(status_code=404, detail="Restaurant not found")

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
            if review_id is None:
                print("review_id is None. Skipping MongoDB insert to avoid duplicate key error.")
                raise HTTPException(status_code=500, detail="review_id is None before inserting into MongoDB")
    
            review_keywords_collection.insert_one({
                "review_id": review_id,
                "positive_keywords": payload.positive_keywords or [],
                "negative_keywords": payload.negative_keywords or []
            })
            update_user_keywords(
                user_id=payload.user_id,
                pos_keywords=payload.positive_keywords or [],
                neg_keywords=payload.negative_keywords or [],
                db=db
            )

            unique_keywords = set(payload.positive_keywords + payload.negative_keywords)
            
            update_restaurant_keywords(
                restaurant_id=payload.restaurant_id,
                keywords=list(unique_keywords),
                db=db
            )

        # Fetch nickname from People table
        person = db.query(People).filter(People.user_id == payload.user_id).first()
        nickname = person.nickname if person else None

        # Index in Elasticsearch (with nickname)
        es.index(index="user_review_nickname", id=review_id, document={
            "review_id": review_id,
            "user_id": payload.user_id,
            "nickname": nickname, 
            "restaurant_id": payload.restaurant_id,
            "comments": payload.comments,
            "review": payload.review,
            "created_at": new_review.created_at.isoformat()
        })

        # Lastly, update the user-to-restaurant score
        update_user_to_restaurant_score(
            u_id=payload.user_id,
            r_id=payload.restaurant_id,
            db=db
        )

        return {
            "message": "Review created", 
            "review_id": review_id,
            "state_id": state_id if 'state_id' in locals() else 1
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.put("/update_reviews/{review_id}", tags=["Reviews"])
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
                prev_keywords.get("negative_keywords", []),
                db=db
            )

            # Update restaurant_keywords collection
            subtract_restaurant_keywords(
                restaurant_id=review.restaurant_id,
                keywords=prev_keywords.get("positive_keywords", []) + prev_keywords.get("negative_keywords", []),
                db=db
            )

            update_user_keywords(
                user_id=review.user_id,
                pos_keywords=payload.positive_keywords or [],
                neg_keywords=payload.negative_keywords or [],
                db=db
            )

            update_restaurant_keywords(
                restaurant_id=review.restaurant_id,
                keywords=payload.positive_keywords + payload.negative_keywords if payload.positive_keywords or payload.negative_keywords else [],
                db=db
            )

        # Update score
        update_user_to_restaurant_score(
            u_id=review.user_id,
            r_id=review.restaurant_id,
            db=db
        )

        # Update Elasticsearch
        es.update(index="user_review_nickname", id=review_id, body={
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



@router.delete("/delete_reviews/{review_id}", tags=["Reviews"])
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
            neg_keywords=neg_keywords,
            db=db
        )

        # Step 6: Delete from Elasticsearch
        es.delete_by_query(
            index="user_review_nickname",
            body={
                "query": {
                    "term": {
                        "review_id": review_id  # use the source field
                    }
                }
            },
            refresh=True
        )
        # Step 7: Subtract keywords from restaurant_keywords
        subtract_restaurant_keywords(
            restaurant_id=review.restaurant_id,
            keywords=pos_keywords + neg_keywords,
            db=db
        )

        # Step 8: Update user-to-restaurant score
        update_user_to_restaurant_score(
            u_id=review.user_id,
            r_id=review.restaurant_id,
            db=db
        )

        return {"message": f"Review {review_id} deleted successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

