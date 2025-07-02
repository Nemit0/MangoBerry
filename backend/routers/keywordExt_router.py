from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Dict, Any
from dotenv import load_dotenv
import os
import openai

from MangoBerry.backend.keyword_extract import extract_keyword_from_review

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise Exception("OPENAI_API_KEY not set in .env")

openai.api_key = OPENAI_API_KEY

router = APIRouter()

# 리뷰 데이터 입력 포맷
class Review(BaseModel):
    name: str
    one_liner: str
    text: str


@router.post("/api/keywords")
def get_keywords(review: Review):
    keywords = extract_keyword_from_review(review.dict())
    return keywords