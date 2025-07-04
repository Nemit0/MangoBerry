
from pydantic import BaseModel
from typing import List

class PhotoLinksCreate(BaseModel):
    review_id: int
    photo_links: List[str]
