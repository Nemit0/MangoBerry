from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

app = FastAPI()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/people")
def read_people(db: Session = Depends(get_db)):
    people = db.query(models.People).all()
    return [
        {
            k: v for k, v in p.__dict__.items()
            if k != '_sa_instance_state' and k != 'passwd'
        }
        for p in people
    ]

@app.get("/users")
def read_users(db: Session = Depends(get_db)):
    users = db.query(models.Users).all()
    return users

@app.get("/restaurant")
def read_restaurant(db: Session = Depends(get_db)):
    restaurant = db.query(models.Restaurant).all()
    return restaurant

@app.get("/review")
def read_review(db: Session = Depends(get_db)):
    review = db.query(models.Review).all()
    return review