from ..services.keyword_extract import extract_keyword_from_review
from ..schemas.review import Review

from .common_imports import *

router = APIRouter()

@router.post("/analyze_review", tags=["Keyword"])
def analyze_review(review: Review):
    keywords = extract_keyword_from_review(review.model_dump())
    return keywords
