'''
Defines Pydantic models that I use with FastAPI
to validate, serialize, and deserialize review data when working with my API
'''
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# common fields for reviews
class ReviewBase(BaseModel):
    user_id: int
    restaurant_id: int
    comments: str
    photo_link: Optional[str] = None
    state_id: Optional[int] = 1

# what clients send to create
class ReviewCreate(ReviewBase):
    pass

# what clients send to update
class ReviewUpdate(BaseModel):
    comments: Optional[str] = None
    photo_link: Optional[str] = None
    state_id: Optional[int] = None

# what server returns to clients
class ReviewResponse(ReviewBase):
    review_id: int
    created_at: datetime

    class Config:
        orm_mode = True
