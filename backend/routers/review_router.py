from collections import Counter
from random import randint
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..connection.mysqldb import (
    get_db,
    Review,
    Restaurant,
    Users,
    People,
)
from ..connection.mongodb import (
    photo_collection,
    review_keywords_collection,
    restaurant_keywords_collection,
    user_keywords_collection,
)
from ..connection.elasticdb import es_client as es
from ..schemas.review import ReviewCreate, ReviewUpdate
from ..services.calc_score import update_user_to_restaurant_score
from ..services.generate_embedding import embed_small
from ..services.utilities import random_prime_in_range

router = APIRouter()


# ───────────────────────────
# helpers
# ───────────────────────────
def _prime_refresh(obj, db: Session) -> None:
    obj.state_id = random_prime_in_range()
    db.add(obj)
    db.commit()
    db.refresh(obj)


def update_user_keywords(
    user_id: int,
    pos_keywords: List[str],
    neg_keywords: List[str],
    db: Session,
) -> None:
    pos = [kw.strip() for kw in pos_keywords if kw and kw.strip()]
    neg = [kw.strip() for kw in neg_keywords if kw and kw.strip()]
    if not (pos or neg):
        return

    pos_cnt, neg_cnt = Counter(pos), Counter(neg)

    doc = user_keywords_collection.find_one({"user_id": user_id}) or {
        "user_id": user_id,
        "keywords": [],
    }
    existing = {
        (k["name"], k["sentiment"]): k for k in doc["keywords"]
    }

    new_terms = {
        kw
        for kw in set(pos_cnt) | set(neg_cnt)
        if (kw, "positive") not in existing and (kw, "negative") not in existing
    }
    embeds = {}
    if new_terms:
        vectors = embed_small(list(new_terms))
        embeds = dict(zip(new_terms, vectors))

    def _upsert(name: str, sentiment: str, delta: int) -> None:
        key = (name, sentiment)
        if key in existing:
            existing[key]["frequency"] += delta
            return
        embed = (
            existing.get((name, "positive"), {}).get("embedding")
            or existing.get((name, "negative"), {}).get("embedding")
            or embeds.get(name)
        )
        if embed is None:
            raise HTTPException(
                500,
                f"no embedding for {name}",
            )
        existing[key] = {
            "name": name,
            "sentiment": sentiment,
            "frequency": delta,
            "embedding": embed,
        }

    for k, f in pos_cnt.items():
        _upsert(k, "positive", f)
    for k, f in neg_cnt.items():
        _upsert(k, "negative", f)

    user_keywords_collection.update_one(
        {"user_id": user_id},
        {"$set": {"keywords": list(existing.values())}},
        upsert=True,
    )

    user = db.query(Users).filter_by(user_id=user_id).first()
    if not user:
        raise HTTPException(404, "user not found")
    _prime_refresh(user, db)


def update_restaurant_keywords(
    restaurant_id: int,
    keywords: List[str],
    db: Session,
) -> None:
    if not keywords:
        return

    cnt = Counter(keywords)
    doc = restaurant_keywords_collection.find_one({"restaurant_id": restaurant_id}) or {
        "restaurant_id": restaurant_id,
        "keywords": [],
    }
    existing = {k["keyword"]: k for k in doc["keywords"]}

    new_terms = set(cnt) - set(existing)
    embeds = {}
    if new_terms:
        vectors = embed_small(list(new_terms))
        embeds = dict(zip(new_terms, vectors))

    for k, f in cnt.items():
        if k in existing:
            existing[k]["frequency"] += f
        else:
            existing[k] = {
                "keyword": k,
                "frequency": f,
                "embedding": embeds.get(k),
            }

    restaurant_keywords_collection.update_one(
        {"restaurant_id": restaurant_id},
        {"$set": {"keywords": list(existing.values())}},
        upsert=True,
    )

    rest = (
        db.query(Restaurant).filter_by(restaurant_id=restaurant_id).first()
    )
    if not rest:
        raise HTTPException(404, "restaurant not found")
    _prime_refresh(rest, db)


def subtract_user_keywords(
    user_id: int,
    pos: List[str],
    neg: List[str],
    db: Session,
) -> None:
    doc = user_keywords_collection.find_one({"user_id": user_id})
    if not doc:
        return

    kw_map = {(k["name"], k["sentiment"]): k for k in doc["keywords"]}

    for k in pos:
        key = (k, "positive")
        if key in kw_map:
            kw_map[key]["frequency"] -= 1
    for k in neg:
        key = (k, "negative")
        if key in kw_map:
            kw_map[key]["frequency"] -= 1

    kw_filtered = [
        v for v in kw_map.values() if v["frequency"] > 0
    ]
    user_keywords_collection.update_one(
        {"user_id": user_id},
        {"$set": {"keywords": kw_filtered}},
        upsert=True,
    )

    user = db.query(Users).filter_by(user_id=user_id).first()
    if user:
        _prime_refresh(user, db)


def subtract_restaurant_keywords(
    restaurant_id: int,
    keywords: List[str],
    db: Session,
) -> None:
    if not keywords:
        return
    doc = restaurant_keywords_collection.find_one(
        {"restaurant_id": restaurant_id}
    ) or {"restaurant_id": restaurant_id, "keywords": []}
    kw_map = {k["keyword"]: k for k in doc["keywords"]}
    for k in keywords:
        if k in kw_map:
            kw_map[k]["frequency"] -= 1
            if kw_map[k]["frequency"] <= 0:
                del kw_map[k]

    restaurant_keywords_collection.update_one(
        {"restaurant_id": restaurant_id},
        {"$set": {"keywords": list(kw_map.values())}},
        upsert=True,
    )

    rest = (
        db.query(Restaurant).filter_by(restaurant_id=restaurant_id).first()
    )
    if rest:
        _prime_refresh(rest, db)


# ───────────────────────────
# endpoints
# ───────────────────────────
@router.get("/review_sql", tags=["Reviews"])
def read_review_sql(db: Session = Depends(get_db)):
    return db.query(Review).all()


@router.post("/reviews", tags=["Reviews"])
def create_review(payload: ReviewCreate, db: Session = Depends(get_db)):
    filenames = ",".join(payload.photo_filenames) if payload.photo_filenames else None

    u_state = db.query(Users.state_id).filter_by(user_id=payload.user_id).scalar()
    r_state = db.query(Restaurant.state_id).filter_by(
        restaurant_id=payload.restaurant_id
    ).scalar()
    combined_state = (u_state or 1) * (r_state or 1)

    review = Review(
        user_id=payload.user_id,
        restaurant_id=payload.restaurant_id,
        comments=payload.comments,
        review=payload.review,
        photo_filenames=filenames,
        state_id=combined_state,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    if payload.photo_urls:
        photo_collection.insert_one(
            {"review_id": review.review_id, "photo_urls": payload.photo_urls}
        )

    if payload.positive_keywords or payload.negative_keywords:
        review_keywords_collection.insert_one(
            {
                "review_id": review.review_id,
                "positive_keywords": payload.positive_keywords or [],
                "negative_keywords": payload.negative_keywords or [],
            }
        )
        update_user_keywords(
            review.user_id,
            payload.positive_keywords or [],
            payload.negative_keywords or [],
            db,
        )
        update_restaurant_keywords(
            review.restaurant_id,
            list(
                set(payload.positive_keywords or []).union(
                    payload.negative_keywords or []
                )
            ),
            db,
        )

    nickname = (
        db.query(People.nickname).filter_by(user_id=payload.user_id).scalar()
    )
    es.index(
        index="user_review_kor",
        id=review.review_id,
        document={
            "review_id": review.review_id,
            "user_id": payload.user_id,
            "nickname": nickname,
            "restaurant_id": payload.restaurant_id,
            "comments": payload.comments,
            "review": payload.review,
            "created_at": review.created_at.isoformat(),
        },
    )

    update_user_to_restaurant_score(
        u_id=payload.user_id,
        r_id=payload.restaurant_id,
        db=db,
    )
    return {"message": "created", "review_id": review.review_id}


@router.put("/reviews/{review_id}", tags=["Reviews"])
def update_review(review_id: int, payload: ReviewUpdate, db: Session = Depends(get_db)):
    review = db.query(Review).filter_by(review_id=review_id).first()
    if not review:
        raise HTTPException(404, "review not found")

    if payload.comments is not None:
        review.comments = payload.comments
    if payload.review is not None:
        review.review = payload.review
    if payload.photo_filenames is not None:
        review.photo_filenames = ",".join(payload.photo_filenames)

    u_state = db.query(Users.state_id).filter_by(user_id=review.user_id).scalar()
    r_state = db.query(Restaurant.state_id).filter_by(
        restaurant_id=review.restaurant_id
    ).scalar()
    review.state_id = (u_state or 1) * (r_state or 1)
    db.commit()

    if payload.photo_urls is not None:
        photo_collection.update_one(
            {"review_id": review_id},
            {"$set": {"photo_urls": payload.photo_urls}},
            upsert=True,
        )

    prev_kw = review_keywords_collection.find_one({"review_id": review_id}) or {
        "positive_keywords": [],
        "negative_keywords": [],
    }

    if payload.positive_keywords is not None or payload.negative_keywords is not None:
        review_keywords_collection.update_one(
            {"review_id": review_id},
            {
                "$set": {
                    "positive_keywords": payload.positive_keywords
                    if payload.positive_keywords is not None
                    else prev_kw["positive_keywords"],
                    "negative_keywords": payload.negative_keywords
                    if payload.negative_keywords is not None
                    else prev_kw["negative_keywords"],
                }
            },
            upsert=True,
        )

        subtract_user_keywords(
            review.user_id,
            prev_kw["positive_keywords"],
            prev_kw["negative_keywords"],
            db,
        )
        subtract_restaurant_keywords(
            review.restaurant_id,
            prev_kw["positive_keywords"] + prev_kw["negative_keywords"],
            db,
        )

        update_user_keywords(
            review.user_id,
            payload.positive_keywords or [],
            payload.negative_keywords or [],
            db,
        )
        update_restaurant_keywords(
            review.restaurant_id,
            (payload.positive_keywords or [])
            + (payload.negative_keywords or []),
            db,
        )

    update_user_to_restaurant_score(review.user_id, review.restaurant_id, db)

    es.update(
        index="user_review_kor",
        id=review_id,
        body={
            "doc": {
                "comments": payload.comments,
                "review": payload.review,
                "photo_filenames": review.photo_filenames,
            }
        },
    )
    return {"message": "updated", "review_id": review_id}


@router.delete("/reviews/{review_id}", tags=["Reviews"])
def delete_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(Review).filter_by(review_id=review_id).first()
    if not review:
        raise HTTPException(404, "review not found")

    kw_doc = review_keywords_collection.find_one({"review_id": review_id}) or {
        "positive_keywords": [],
        "negative_keywords": [],
    }

    db.delete(review)
    db.commit()

    photo_collection.delete_one({"review_id": review_id})
    review_keywords_collection.delete_one({"review_id": review_id})

    subtract_user_keywords(
        review.user_id,
        kw_doc["positive_keywords"],
        kw_doc["negative_keywords"],
        db,
    )
    subtract_restaurant_keywords(
        review.restaurant_id,
        kw_doc["positive_keywords"] + kw_doc["negative_keywords"],
        db,
    )

    es.delete(index="user_review_kor", id=str(review_id), ignore=[404])

    update_user_to_restaurant_score(review.user_id, review.restaurant_id, db)

    return {"message": f"deleted {review_id}"}
