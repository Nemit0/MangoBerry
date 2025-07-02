from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from elasticsearch import Elasticsearch
from mysql.models import Review, Users, Restaurant
from schemas.review import ReviewCreate, ReviewUpdate, ReviewResponse
from connection.database import get_db
import os
from dotenv import load_dotenv


load_dotenv()
es = Elasticsearch(os.getenv("ES_HOST"),
    basic_auth=(os.getenv("ES_USER"), os.getenv("ES_PASS")))  

router = APIRouter()

@router.post("/reviews", response_model=ReviewResponse)
def create_review(review: ReviewCreate, db: Session = Depends(get_db)):

    user = db.query(Users).filter(Users.user_id == review.user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    restaurant = db.query(Restaurant).filter(Restaurant.restaurant_id == review.restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    db_review = Review(**review.dict())
    db.add(db_review)
    db.commit()
    db.refresh(db_review)

    es.index(index="user_review", id=db_review.review_id, body={
        "review_id": db_review.review_id,
        "user_id": db_review.user_id,
        "restaurant_id": db_review.restaurant_id,
        "restaurant_name": restaurant.name,
        "comments": db_review.comments,
        "photo_link": db_review.photo_link,
        "created_at": db_review.created_at.isoformat(),
    })
    
    return db_review 

@router.put("/reviews/{review_id}", response_model=ReviewResponse)
def update_review(review_id: int, update: ReviewUpdate, db: Session = Depends(get_db)):
    db_review = db.query(Review).filter(Review.review_id == review_id).first()
    if not db_review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    for key, value in update.dict(exclude_unset=True).items():
        setattr(db_review, key, value)

    db.commit()
    db.refresh(db_review)
    return db_review 

