import json, os, sys
import boto3
from botocore.exceptions import BotoCoreError, ClientError

def set_env_from_secret(secret_id: str, region: str) -> None:
    client = boto3.client("secretsmanager", region_name=region)
    try:
        resp = client.get_secret_value(SecretId=secret_id)
    except (BotoCoreError, ClientError) as e:
        print(f"[boot] Failed to fetch secret '{secret_id}': {e}", file=sys.stderr)
        sys.exit(1)

    secret_str = resp.get("SecretString")
    if not secret_str:
        print(f"[boot] Secret {secret_id} has no SecretString.", file=sys.stderr)
        sys.exit(1)

    try:
        data = json.loads(secret_str)
    except json.JSONDecodeError as e:
        print(f"[boot] SecretString is not valid JSON: {e}", file=sys.stderr)
        sys.exit(1)

    # Export each key to env if not already set (env > secret for emergency override)
    for k, v in data.items():
        os.environ.setdefault(k, str(v))

    # Recommended: do NOT use static AWS keys from the secret; rely on the role.
    for k in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        if k in os.environ:
            del os.environ[k]

    # Minimal required keys for your app (adjust as needed)
    required = ["SECRET_KEY", "ALGORITHM", "ACCESS_TOKEN_EXPIRE_MINUTES", "SQL_URL"]
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        print(f"[boot] Missing required keys in secret: {missing}", file=sys.stderr)
        sys.exit(1)

def main():
    secret_id = os.environ.get("SECRET_ID")
    region    = os.environ.get("AWS_REGION", "ap-northeast-2")
    if not secret_id:
        print("[boot] SECRET_ID env not set; cannot fetch secrets.", file=sys.stderr)
        sys.exit(1)

    set_env_from_secret(secret_id, region)

    # Default uvicorn target; can be overridden with UVICORN_* env
    host = os.environ.get("UVICORN_HOST", "0.0.0.0")
    port = os.environ.get("UVICORN_PORT", "8000")
    app  = os.environ.get("UVICORN_APP",  "backend.main:app")

    os.execvp("uvicorn", ["uvicorn", app, "--host", host, "--port", port])

if __name__ == "__main__":
    main()