from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.connection.database import SessionLocal, engine
import backend.mysql.models as models

router = APIRouter()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/people_sql")
def read_people_sql(db: Session = Depends(get_db)):
    people = db.query(models.People).all()
    return [
        {
            k: v for k, v in p.__dict__.items()
            if k != '_sa_instance_state' and k != 'passwd'
        }
        for p in people
    ]

@router.get("/users_sql")
def read_users_sql(db: Session = Depends(get_db)):
    users = db.query(models.Users).all()
    return users

@router.get("/restaurant_sql")
def read_restaurant_sql(db: Session = Depends(get_db)):
    restaurant = db.query(models.Restaurant).all()
    return restaurant

@router.get("/review_sql")
def read_review_sql(db: Session = Depends(get_db)):
    review = db.query(models.Review).all()
    return review
