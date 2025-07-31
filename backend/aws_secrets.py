import json
import os
import sys
from typing import Optional, Dict

import boto3
from botocore.exceptions import BotoCoreError, ClientError


def _println(msg: str) -> None:
    print(f"[secrets] {msg}", file=sys.stderr)


def _redact(value: str, keep: int = 4) -> str:
    if not value:
        return ""
    if len(value) <= keep * 2:
        return "***"
    return value[:keep] + "…" + value[-keep:]


def _env_bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.lower() in ("1", "true", "yes", "y", "on")


def load_and_export_secrets(
    secret_id: Optional[str] = None,
    region: Optional[str] = None,
    override_existing: bool = False,
) -> Dict[str, str]:
    """
    Load JSON secrets from AWS Secrets Manager and export to os.environ.

    Precedence (if a key exists in multiple places):
      - If override_existing=True → Secrets overwrite current env values.
      - Else (default) → DO NOT override existing env.

    Secret discovery:
      - SECRET_ID:   env AWS_SECRET_ID or SECRET_ID or default
      - AWS region:  env AWS_DEFAULT_REGION or region arg

    Returns the dict that was fetched (for diagnostics).
    """

    secret_id = (
        secret_id
        or os.getenv("AWS_SECRET_ID")
        or os.getenv("SECRET_ID")
        or "prod/mangoberry/servicecontainer"
    )
    region = region or os.getenv("AWS_DEFAULT_REGION") or "ap-northeast-2"

    _println(f"Fetching secret '{secret_id}' in region '{region}'…")

    try:
        client = boto3.client("secretsmanager", region_name=region)
        resp = client.get_secret_value(SecretId=secret_id)
    except (BotoCoreError, ClientError) as e:
        _println(f"Failed to fetch secret '{secret_id}': {e}")
        return {}

    secret_str = resp.get("SecretString")
    if not secret_str:
        _println("Secret has no SecretString; nothing to export.")
        return {}

    try:
        data = json.loads(secret_str)
    except json.JSONDecodeError as e:
        _println(f"SecretString is not valid JSON: {e}")
        return {}

    exported = []
    for k, v in data.items():
        if v is None:
            continue
        if (k in os.environ) and (not override_existing):
            continue
        os.environ[k] = str(v)
        exported.append(k)

    if exported:
        preview = ", ".join(f"{k}={_redact(os.getenv(k))}" for k in exported)
        _println(f"Exported {len(exported)} keys → env: {preview}")
    else:
        _println("No keys exported (already present or empty).")

    return data