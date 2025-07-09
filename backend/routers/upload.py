from PIL import Image
from fastapi import APIRouter
from pydantic import BaseModel
from ..services.s3 import generate_presigned_url

router = APIRouter()

class UploadURLRequest(BaseModel):
    filename: str

@router.post("/upload-url", tags=["Helpers"])
def get_upload_url(request: UploadURLRequest):
    key = f"user-uploads/{request.filename}"
    url = generate_presigned_url(key)
    return {"upload_url": url, "key": key}

@router.post("/upload_img", tags=["Helpers"])
def upload_img(request: UploadURLRequest):
    pass