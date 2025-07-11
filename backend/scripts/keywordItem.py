from pydantic import BaseModel

class KeywordItem(BaseModel):
    keyword: str
    sentiment: str
    frequency: int