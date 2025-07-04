import argparse
import concurrent.futures
import mimetypes
import os
from pathlib import Path
from typing import Iterable
from dotenv import load_dotenv
import boto3
from botocore.exceptions import ClientError
from tqdm import tqdm
import sys
from typing import Optional

load_dotenv()

BUCKET_NAME: str = "mangoberry-bucket"
REGION_NAME: Optional[str] = os.getenv("AWS_DEFAULT_REGION", "ap-northeast-2")
ACL: Optional[str] = None
STORAGE_CLASS: str = "STANDARD"

session = boto3.Session(region_name=REGION_NAME)
s3 = session.resource("s3")
s3_client = session.client("s3")

# ---------------------------------------------------------------------------#
# 1. Small or medium file (<5 GB) – single call                               #
# ---------------------------------------------------------------------------#
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
    
# ---------------------------------------------------------------------------#
# 2. Big file (≥5 GB) – multipart + tqdm progress bar                         #
# ---------------------------------------------------------------------------#
def upload_large_file_multipart(local_path: Path, key: str, part_size_mb: int = 64) -> None:
    """
    Multipart upload with automatic retries and a nice progress bar.
    """
    config = boto3.s3.transfer.TransferConfig(
        multipart_threshold=5 * 1024 ** 3,           # 5 GB threshold (S3 limit)
        multipart_chunksize=part_size_mb * 1024 ** 2,
        max_concurrency=os.cpu_count() or 4,
        use_threads=True,
    )
    file_size = local_path.stat().st_size
    progress = tqdm(total=file_size, unit="B", unit_scale=True, desc=local_path.name)
    def _progress_hook(bytes_amount: int) -> None:
        progress.update(bytes_amount)
    extra_args = {"ACL": ACL, "StorageClass": STORAGE_CLASS}
    print(f"→ Multipart uploading {local_path} ({file_size/1e6:.1f} MB) ⇒ s3://{BUCKET_NAME}/{key}")
    s3.Bucket(BUCKET_NAME).upload_file(
        Filename=str(local_path),
        Key=key,
        ExtraArgs=extra_args,
        Callback=_progress_hook,
        Config=config,
    )
    progress.close()

# ---------------------------------------------------------------------------#
# 3. Generate a pre-signed URL so someone else can PUT without credentials   #
# ---------------------------------------------------------------------------#
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
# ---------------------------------------------------------------------------#
# 5. Minimal CLI entry-point (so you can test quickly)                        #
# ---------------------------------------------------------------------------#
def main() -> None:
    local_single_file = Path("MangoBerry/backend/final_logo.png")
    # Upload a single small file
    upload_single_file(local_single_file, "test/single/final_logo.jpg")
if __name__ == "__main__":
    main()
