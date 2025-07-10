from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class Review(BaseModel):
    name: str
    one_liner: str
    text: str

class ReviewCreate(BaseModel):
    user_id: int
    restaurant_id: int
    comments: str
    review: str
    photo_filenames: Optional[List[str]] = None  # for MySQL
    photo_urls: Optional[List[str]] = None       # for MongoDB

class ReviewUpdate(BaseModel):
    comments: Optional[str] = None
    review: Optional[str] = None
    photo_filenames: Optional[List[str]] = None
    photo_urls: Optional[List[str]] = None
    state_id: Optional[int] = None
