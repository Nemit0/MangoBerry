import mimetypes
import io
from pathlib import Path
from botocore.exceptions import ClientError
from typing import Optional
from ..connection.mysqldb import get_db
from ..connection.s3 import s3, s3_client, STORAGE_CLASS, BUCKET_NAME, ACL

def guess_content_type(filename_or_key: str | None, default: str = "application/octet-stream") -> str:
    """
    Best-effort MIME-type resolver.

    1. If *filename_or_key* is supplied, use built-in `mimetypes`.
    2. Fallback to *default* if detection fails.

    FastAPI will usually pass `UploadFile.content_type`, so callers can
    skip this and forward that field directly.
    """
    if filename_or_key:
        mime, _ = mimetypes.guess_type(filename_or_key)
        if mime:
            return mime
    return default

def upload_bytes(data: bytes, key: str, content_type: Optional[str] = None) -> None:
    """
    **New helper**: upload an in-memory bytes object (e.g. an image blob
    received from FastAPI) straight to S3.

    Parameters
    ----------
    data
        Raw bytes to be stored.
    key
        Destination object key (e.g. "user-uploads/abc123.png").
    content_type
        MIME type; if *None*, we try to guess from *key*.
    """
    if content_type is None:
        content_type = guess_content_type(key)

    extra_args = {"StorageClass": STORAGE_CLASS, "ContentType": content_type}
    if ACL:
        extra_args["ACL"] = ACL

    print(f"→ Uploading {len(data)} bytes ⇒ s3://{BUCKET_NAME}/{key}")
    file_obj = io.BytesIO(data)
    s3.Bucket(BUCKET_NAME).upload_fileobj(file_obj, key, ExtraArgs=extra_args)

def upload_single_file(local_path: Path, key: str) -> None:
    content_type, _ = mimetypes.guess_type(local_path.as_posix())
    extra_args = {"StorageClass": STORAGE_CLASS}
    if ACL:                       # only include if not None
        extra_args["ACL"] = ACL
    if content_type:
        extra_args["ContentType"] = content_type
    print(f"→ Uploading {local_path} ⇒ s3://{BUCKET_NAME}/{key}")
    s3.Bucket(BUCKET_NAME).upload_file(
        Filename=str(local_path),
        Key=key,
        ExtraArgs=extra_args,
    )
    
def generate_presigned_url(key: str, expires_in: int = 3600) -> str:
    """
    Return a one-hour URL that lets OTHER people upload directly (HTTP PUT).
    Use-case: frontend or another service sends file straight to S3.
    """
    try:
        url = s3_client.generate_presigned_url(
            "put_object",
            Params={"Bucket": BUCKET_NAME, "Key": key},
            ExpiresIn=expires_in,
        )
    except ClientError as err:
        raise RuntimeError(f"Could not create presigned URL: {err}") from err
    return url