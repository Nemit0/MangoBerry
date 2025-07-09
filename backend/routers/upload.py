from __future__ import annotations

import os
from uuid import uuid4
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..connection.mysqldb import get_db, People, Review
from ..connection.s3 import BUCKET_NAME, REGION_NAME
from ..services.s3 import upload_bytes, guess_content_type

router = APIRouter()

# ────────────────────────────────────────────────────────────
# Configuration – tweak as needed
MAX_SIZE_BYTES = 10 * 1024 * 1024          # 10 MB hard limit
ALLOWED_MIME_PREFIX = "image/"             # simple guard
# ────────────────────────────────────────────────────────────


@router.post("/reviews/{user_id}/images", tags=["Reviews"])
async def upload_review_image(                     # noqa: D401
    user_id: int,
    review_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Receive **one** image file and store it in S3.

    *Path params*
    -------------
    user_id
        Primary-key from *People*.
    review_id
        Primary-key from *Review*.

    *Form data*
    -----------
    file
        The raw image blob. Only `image/*` uploads < 10 MB are permitted.
    """
    # 1) Resolve the uploader’s nickname so we can form the folder name
    person: People | None = db.query(People).filter(People.user_id == user_id).first()
    if person is None:
        raise HTTPException(404, "User not found")
    nickname: str = person.nickname

    # 2) Validate & read the incoming file
    blob: bytes = await file.read()

    if len(blob) > MAX_SIZE_BYTES:
        raise HTTPException(413, "File exceeds 10 MB limit")

    if not file.content_type.startswith(ALLOWED_MIME_PREFIX):
        raise HTTPException(415, "Only image uploads are allowed")

    # 3) Decide on a destination object-key
    _, ext = os.path.splitext(file.filename or "")
    ext = ext.lower() if ext else ".bin"
    object_key = f"review-images/{nickname}/{review_id}/{uuid4().hex}{ext}"

    # 4) Ship the bytes to S3
    content_type = file.content_type or guess_content_type(file.filename)
    upload_bytes(data=blob, key=object_key, content_type=content_type)

    # 5) Append the key to Review.photo_filenames (comma-separated list)
    review: Review | None = db.query(Review).filter(Review.review_id == review_id).first()
    if review is not None:
        photos: List[str] = [p for p in (review.photo_filenames or "").split(",") if p]
        photos.append(object_key)
        review.photo_filenames = ",".join(photos)
        db.commit()
        db.refresh(review)

    # 6) JSON payload back to the caller
    return {
        "ok": True,
        "key": object_key,
        "public_url": f"https://{BUCKET_NAME}.s3.{REGION_NAME}.amazonaws.com/{object_key}",
    }