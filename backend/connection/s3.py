import boto3
import os

from typing import Optional
from botocore.exceptions import ClientError

import backend.connection.load_env

BUCKET_NAME: str = "mangoberry-bucket"
REGION_NAME: Optional[str] = os.getenv("AWS_DEFAULT_REGION", "ap-northeast-2")
ACL: Optional[str] = None
STORAGE_CLASS: str = "STANDARD"

session = boto3.Session(region_name=REGION_NAME)
s3 = session.resource("s3")
s3_client = session.client("s3")