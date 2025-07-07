from fastapi import APIRouter, Depends, Query, HTTPException, Form
from typing import Optional, List
from sqlalchemy.orm import Session
from ..connection.database import get_db
from ..mysql import models
from ..mysql.models import Users, People

router = APIRouter()


@router.get("/admin_sql")
def admin_people_sql(db: Session = Depends(get_db)):
    people = db.query(models.People).all()
    return [
        {
            k: v for k, v in p.__dict__.items()
            if k != '_sa_instance_state' and k != 'passwd'
        }
        for p in people
    ]

@router.get("/people_sql")
def read_people(user_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    if user_id is not None:
        person = db.query(models.People).filter(models.People.user_id == user_id).first()
        if not person:
            raise HTTPException(status_code=404, detail=f"Person with user_id {user_id} not found.")
        return [{
            "user_id": person.user_id,
            "email": person.email,
            "verified": bool(person.verified)
        }]

    people = db.query(models.People).all()
    return [
        {
            "user_id": p.user_id,
            "email": p.email,
            "verified": bool(p.verified)
        }
        for p in people
    ]

@router.get("/users_sql")
def read_users(
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    # Join Users and People on user_id
    query = db.query(Users, models.People).join(models.People, Users.user_id == models.People.user_id)

    if user_id is not None:
        query = query.filter(Users.user_id == user_id)

    results = query.all()

    if user_id is not None and not results:
        raise HTTPException(status_code=404, detail=f"User with user_id {user_id} not found.")

    return [
        {
            "user_id": user.user_id,
            "email": person.email,
            "verified": bool(person.verified)
        }
        for user, person in results
    ]


@router.post("/login")
def login(
    email: str = Form(...),
    password: str = Form(...),  # Placeholder
    db: Session = Depends(get_db)
):
    # Step 1: Find person by email (regardless of verified)
    person = db.query(People).filter(People.email == email).first()

    if not person or person.verified != 1:
        raise HTTPException(
            status_code=404,
            detail="Login Unsuccessful."
        )

    return {
        "user_id": person.user_id,
        "verified": bool(person.verified)
    }

@router.get("/review_sql")
def read_review_sql(db: Session = Depends(get_db)):
    review = db.query(models.Review).all()
    return review
