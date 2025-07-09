from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import create_session, Session

from ..connection.mysqldb import get_db, Review
from ..connection.mongodb import photo_collection 
from ..connection.elasticdb import es_client as es

from ..schemas.review import ReviewCreate, ReviewUpdate

router = APIRouter()

@router.post("/reviews", tags=["Reviews"])
def create_review(payload: ReviewCreate, db: Session = Depends(get_db)):

    filenames_str = ",".join(payload.photo_filenames) if payload.photo_filenames else None

    try:
        new_review = Review(
            user_id=payload.user_id,
            restaurant_id=payload.restaurant_id,
            comments=payload.comments,
            photo_filenames=filenames_str,
            state_id=1
        )
        db.add(new_review)
        db.commit()
        db.refresh(new_review)
        review_id = new_review.review_id

        # Save photo URLs in Mongo
        if payload.photo_urls:
            photo_collection.insert_one({
                "review_id": review_id,
                "photo_urls": payload.photo_urls
            })

        # Index in Elasticsearch
        es.index(index="user_review", id=review_id, document={
            "review_id": review_id,
            "user_id": payload.user_id,
            "restaurant_id": payload.restaurant_id,
            "comments": payload.comments
        })

        return {"message": "Review created", "review_id": review_id}

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
        if payload.photo_filenames is not None:
            review.photo_filenames = ",".join(payload.photo_filenames)
        if payload.state_id is not None:
            review.state_id = payload.state_id

        db.commit()

        # Update MongoDB photo URLs
        if payload.photo_urls is not None:
            photo_collection.update_one(
                {"review_id": review_id},
                {"$set": {"photo_urls": payload.photo_urls}},
                upsert=True
            )

        # Update Elasticsearch
        es.update(index="user_review", id=review_id, body={
            "doc": {
                "comments": payload.comments,
                "photo_filenames": review.photo_filenames  # optional if you're indexing that
            }
        })

        return {"message": "Review updated", "review_id": review_id}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/reviews/{review_id}", tags=["Reviews"])
def delete_review(review_id: int, db: Session = Depends(get_db)):
    try:
        # Step 1: Delete from MySQL
        review = db.query(Review).filter(Review.review_id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")

        db.delete(review)
        db.commit()

        # Step 2: Delete from MongoDB
        photo_collection.delete_one({"review_id": review_id})

        # Step 3: Delete from Elasticsearch
        es.delete(index="user_review", id=review_id)

        return {"message": f"Review {review_id} deleted successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
