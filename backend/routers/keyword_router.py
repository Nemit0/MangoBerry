from fastapi import HTTPException

from ..services.keyword_extract import extract_keyword_from_review
from ..services.generate_embedding import embed_small
from ..schemas.review import Review
from ..connection.mongodb import user_keywords_collection

from typing import Optional, List

from .common_imports import *

router = APIRouter()

@router.post("/analyze_review", tags=["Keyword"])
def analyze_review(review: Review):
    keywords = extract_keyword_from_review(review.model_dump())
    return keywords

@router.post("/initialize_keywords", tags=["Keyword"])
def initialize_keywords(user_id: str, keywords: Optional[List[str]] = None):
    """
    Initialize keywords for a user.
    This function creates an empty keyword list for the user if it does not exist.
    """
    existing_keywords = user_keywords_collection.find_one({"user_id": user_id})
    
    if existing_keywords:
        return {"message": "Keywords already initialized."}
    
    # If there's no existing keywords, add keywords to user keyword collection with positive sentiment

    if keywords is None:
        raise HTTPException(
            status_code=400,
            detail="Keywords must be provided to initialize.",
        )

    keyword_embeddings = embed_small(keywords)
    keyword_embedding_map = {keyword: embedding for keyword, embedding in zip(keywords, keyword_embeddings)}
    result = [
        {
            "name": keyword,
            "sentiment": "positive",
            "frequency": 1,
            "embedding": keyword_embedding_map[keyword]
        } for keyword in keywords
    ]
    
    user_keywords_collection.insert_one({
        "user_id": user_id,
        "keywords": result
    })
    return {"message": "Keywords initialized successfully."}