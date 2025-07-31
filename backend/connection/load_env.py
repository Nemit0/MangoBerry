import os
from pathlib import Path
from dotenv import load_dotenv

# 1) Attempt to pull from AWS Secrets Manager first (non-fatal on failure)
try:
    from ..aws_secrets import load_and_export_secrets
    print("[env] Attempting to load secrets from AWS Secrets Manager…")
    loaded_count = load_and_export_secrets()
    if isinstance(loaded_count, int):
        print(f"[env] AWS secrets load complete (keys set: {loaded_count}).")
    else:
        print("[env] AWS secrets load complete.")
except Exception as e:
    print(f"[env] Skipping AWS secrets (non-fatal): {e}")

# 2) Load a .env file if it exists
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=str(ENV_PATH), override=False)
    print(f"[env] Loaded .env from {ENV_PATH} (existing env keys preserved).")
else:
    print(f"[env] No .env found at {ENV_PATH}, continuing.")

# 3) Apply defaults ONLY if still missing
os.environ.setdefault("ES_HOST", "http://10.0.25.18:9200")
os.environ.setdefault("ES_USER", "elastic")
os.environ.setdefault("ES_PASS", "mangoberry")

os.environ.setdefault(
    "MONGO_URI",
    "mongodb://mangoberry:mangoberry@10.0.25.18:27017/?authSource=customer_info",
)
os.environ.setdefault(
    "SQL_URL",
    "mysql+pymysql://mangoberry:mangoberry@10.0.25.18:3306/MangoBerry",
)

os.environ.setdefault("AWS_DEFAULT_REGION", "ap-northeast-2")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "120")
def _dbg(k: str) -> str:
    return "set" if k in os.environ and os.environ.get(k) else "missing"

print(
    "[env] Summary:"
    f" ES_HOST={_dbg('ES_HOST')}, ES_USER={_dbg('ES_USER')}, ES_PASS={_dbg('ES_PASS')},"
    f" MONGO_URI={_dbg('MONGO_URI')}, SQL_URL={_dbg('SQL_URL')},"
    f" AWS_DEFAULT_REGION={_dbg('AWS_DEFAULT_REGION')},"
    f" OPENAI_API_KEY={_dbg('OPENAI_API_KEY')}, KAKAO_MAP_APP_KEY={_dbg('KAKAO_MAP_APP_KEY')},"
    f" SECRET_KEY={_dbg('SECRET_KEY')}"
)