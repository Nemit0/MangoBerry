from fastapi import APIRouter

from ..services.keyword_extract import extract_keyword_from_review
from ..schemas.review import Review

router = APIRouter()

@router.post("/api/keywords", tags=["Keyword"])
def get_keywords(review: Review):
    keywords = extract_keyword_from_review(review.model_dump())
    return keywords