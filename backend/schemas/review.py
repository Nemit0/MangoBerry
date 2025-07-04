'''
Defines Pydantic models that I use with FastAPI
to validate, serialize, and deserialize review data when working with my API
'''
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class ReviewCreate(BaseModel):
    user_id: int
    restaurant_id: int
    comments: str
    photo_filenames: Optional[List[str]] = None  # for MySQL
    photo_urls: Optional[List[str]] = None       # for MongoDB
    state_id: int = 1

class ReviewUpdate(BaseModel):
    comments: Optional[str] = None
    photo_filenames: Optional[List[str]] = None
    photo_urls: Optional[List[str]] = None
    state_id: Optional[int] = None
