import hashlib
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from passlib.context import CryptContext

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

@router.get("/admin_sql")
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

@router.get("/people_sql")
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

@router.get("/users_sql")
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
            "verified": bool(p.verified),
        }
        for u, p in rows
    ]

class LoginInput(BaseModel):
    email: str
    password: str


@router.post("/login")
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

@router.get("/review_sql")
def read_review_sql(db: Session = Depends(get_db)):
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