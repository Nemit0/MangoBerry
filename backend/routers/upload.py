from fastapi import APIRouter
from pydantic import BaseModel
from services.s3 import generate_presigned_url

router = APIRouter()

class UploadURLRequest(BaseModel):
    filename: str

@router.post("/upload-url")
def get_upload_url(request: UploadURLRequest):
    key = f"user-uploads/{request.filename}"
    url = generate_presigned_url(key)
    return {"upload_url": url, "key": key}