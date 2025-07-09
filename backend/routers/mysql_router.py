import hashlib
from random import randint
from typing import List, Optional
from datetime import date
from warnings import warn

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext
from email_validator import validate_email, EmailNotValidError

from ..connection.database import get_db
from ..mysql import models
from ..mysql.models import People, Users

router = APIRouter()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> bytes:
    """Return bcrypt hash as bytes – ready for VARBINARY(60)."""
    return pwd_ctx.hash(plain).encode("ascii")

def verify_password(plain: str, stored: bytes) -> bool:
    """Check *plain* against stored bcrypt hash (bytes)."""
    return pwd_ctx.verify(plain, stored.decode("ascii"))

def _sha256_hex(password: str) -> bytes:
    """
    Returns the lowercase hex digest of SHA-256 as *bytes* (64 bytes long),
    matching the BINARY(64) storage format.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest().encode("ascii")

@router.get("/admin_sql", tags=["Admin"])
def admin_people_sql(db: Session = Depends(get_db)):
    people = db.query(People).all()
    return [
        {
            k: v
            for k, v in p.__dict__.items()
            if k not in {"_sa_instance_state", "passwd"}
        }
        for p in people
    ]

@router.get("/people_sql", tags=["Admin"])
def read_people(user_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    if user_id is not None:
        person = db.query(People).filter(People.user_id == user_id).first()
        if not person:
            raise HTTPException(status_code=404, detail="Person not found")
        return {
            "user_id": person.user_id,
            "email": person.email,
            "verified": bool(person.verified),
        }

    # no filter → list
    return [
        {
            "user_id": p.user_id,
            "email": p.email,
            "verified": bool(p.verified),
        }
        for p in db.query(People).all()
    ]

@router.get("/users_sql", tags=["Admin"])
def read_users(user_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    qry = (
        db.query(Users, People)
        .join(People, Users.user_id == People.user_id)
        .filter(Users.user_id == user_id if user_id is not None else True)
    )
    rows = qry.all()
    if user_id is not None and not rows:
        raise HTTPException(status_code=404, detail="User not found")

    return [
        {
            "user_id": u.user_id,
            "email": p.email,
            "follower_count": u.follower_count,
            "following_count": u.following_count,
            "verified": bool(p.verified),
        }
        for u, p in rows
    ]

class LoginInput(BaseModel):
    email: str
    password: str

@router.post("/login", tags=["Auth"])
def login(creds: LoginInput, db: Session = Depends(get_db)):
    """bcrypt-based login verification."""
    person: People | None = (db.query(People)
                               .filter(People.email == creds.email)
                               .first())

    if (not person or person.verified != 1) or (not verify_password(creds.password, person.passwd)):
        raise HTTPException(401, "Invalid credentials")

    return {"user_id": person.user_id,
            "login": True,
            "verified": True}

# User Registration api

class RegisterInput(BaseModel):
    """Incoming JSON for /register."""
    email:       EmailStr                 # use Pydantic's validated e-mail type
    password:    str
    display_name:str
    bday:        date | None = None       # let Pydantic parse 'YYYY-MM-DD'
    gender:      str | None = Field(
        default=None,
        pattern=r"^(M|F|O)$"               # optional simple validation
    )
    verified:    bool | None = False      # ignored on creation

@router.post("/register/check_nickname", tags=["Registration"])
def check_nickname(nickname: str, db: Session = Depends(get_db)):
    """
    Check if the nickname is already taken.
    Returns True if available, False if taken.
    """
    exists = db.query(People).filter(People.nickname == nickname).first()
    return {"available": exists is None}

@router.post("/register/check_email", tags=["Registration"])
def check_email(email: EmailStr, db: Session = Depends(get_db)):
    """
    Check if the email is already registered.
    Returns True if available, False if taken.
    """
    exists = db.query(People).filter(People.email == email).first()
    return {"available": exists is None}

@router.post("/register", tags=["Registration"])
def register_user(creds: RegisterInput, db: Session = Depends(get_db)):
    """Create a People + Users record; e-mail must be unique."""
    # Check uniqueness
    if db.query(People).filter(People.email == creds.email).first():
        raise HTTPException(400, "E-mail already registered")

    # Validate e-mail format (email-validator raises on error)
    try:
        validate_email(creds.email)
    except EmailNotValidError as e:
        raise HTTPException(400, str(e))

    # Insert into People
    person = People(
        email     = creds.email,
        passwd    = hash_password(creds.password),
        bday      = creds.bday,           # already a date-object (or None)
        gender    = creds.gender,
        nickname  = creds.display_name,
        verified  = False                 # ← TODO: flip after out-of-band confirmation
    )

    # flip verified to True as verification is not implemented
    person.verified = True
    warn("User email verification is not implemented yet, setting verified to True by default.",
         DeprecationWarning, stacklevel=2)

    db.add(person)
    db.commit()           # flushes & assigns auto-inc PK
    db.refresh(person)    # populate person.user_id

    # Insert into Users (depends on People PK)
    user = Users(
        user_id         = person.user_id,
        word_cloud      = "[]",
        profile_image   = "",
        follower_count  = 0,
        following_count = 0,
        state_id        = randint(231, 10_000)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Return payload
    return {
        "user_id"     : person.user_id,
        "email"       : person.email,
        "verified"    : person.verified,
        "display_name": person.nickname,
    }

# API to delete a user
@router.delete("/delete_user/{user_id}", tags=["Admin"])
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    Delete a user by user_id.
    This will delete both People and Users records.
    """
    person = db.query(People).filter(People.user_id == user_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete the associated Users record
    user = db.query(Users).filter(Users.user_id == user_id).first()
    if user:
        db.delete(user)

    # Delete the People record
    db.delete(person)
    db.commit()

    return {"detail": "User deleted successfully"}

@router.get("/review_sql", tags=["Reviews"])
def read_review_sql(db: Session = Depends(get_db)):
    warn("This should recieve additional arguments to filter reviews, such as user_id or restaurant_ids",)
    return db.query(models.Review).all()

# ──────────────────────────────────────────────────────────────────────────
# One-shot maintenance script
# ──────────────────────────────────────────────────────────────────────────
def _reset_all_passwords(db: Session,
                         new_plaintext: str = "mangoberry") -> int:
    """Bulk-update all People.passwd to bcrypt(new_plaintext)."""
    new_hash = hash_password(new_plaintext)
    rows = db.query(People).all()
    for row in rows:
        row.passwd = new_hash
    db.commit()
    return len(rows)

if __name__ == "__main__":
    """
    Run directly:
    $ python -m backend.routers.mysql_router
    All passwords => "mangoberry" (bcrypt).
    """
    from ..connection.database import SessionLocal  # avoid circular import
    with SessionLocal() as session:
        n = _reset_all_passwords(session)
        print(f"Updated {n} passwords → bcrypt('mangoberry')")