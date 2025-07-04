from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from sqlalchemy.orm import Session
from connection.database import get_db
from mysql import models
from mysql.models import Users

router = APIRouter()


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
def read_users(user_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    if user_id is not None:
        user = db.query(Users).filter(Users.user_id == user_id).first()
        if user:
            return [user]  # return as a list to keep response format consistent
        return []  # or raise HTTPException(status_code=404, detail="User not found")
    return db.query(Users).all()

@router.get("/review_sql")
def read_review_sql(db: Session = Depends(get_db)):
    review = db.query(models.Review).all()
    return review
