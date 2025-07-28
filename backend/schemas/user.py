from pydantic import BaseModel, EmailStr, Field
from datetime import date

class LoginInput(BaseModel):
    email: str
    password: str

class RegisterInput(BaseModel):
    """Incoming JSON for /register."""
    email:       EmailStr
    password:    str
    display_name:str
    bday:        date | None = None
    gender:      str | None = Field(
        default=None,
        pattern=r"^(M|F|O)$"
    )
    verified:    bool | None = False
 
class Token(BaseModel):
    """Response model for JWT authentication token."""
    access_token: str
    token_type: str
    user_id: int | None = None
