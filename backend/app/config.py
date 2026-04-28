import os
import json


def get(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


# JWT
JWT_SECRET = lambda: get("JWT_SECRET", "dev-secret")
JWT_EXPIRE_MINUTES = lambda: int(get("JWT_EXPIRE_MINUTES", "1440"))

# DynamoDB
DYNAMODB_ENDPOINT = lambda: get("DYNAMODB_ENDPOINT", "")
AWS_ACCESS_KEY_ID = lambda: get("AWS_ACCESS_KEY_ID", "dummy")
AWS_SECRET_ACCESS_KEY = lambda: get("AWS_SECRET_ACCESS_KEY", "dummy")
AWS_DEFAULT_REGION = lambda: get("AWS_DEFAULT_REGION", "ap-northeast-1")

# S3
S3_ENDPOINT = lambda: get("S3_ENDPOINT", "")
S3_BUCKET = lambda: get("S3_BUCKET", "cafematchbox-images")
S3_ACCESS_KEY = lambda: get("S3_ACCESS_KEY", "minioadmin")
S3_SECRET_KEY = lambda: get("S3_SECRET_KEY", "minioadmin")

# OIDC
OIDC_PROVIDERS = lambda: json.loads(get("OIDC_PROVIDERS", "{}"))

# CORS
CORS_ORIGINS = lambda: [o.strip() for o in get("CORS_ORIGINS", "http://localhost:5173").split(",")]
