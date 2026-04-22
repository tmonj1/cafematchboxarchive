from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError  # noqa: F401 — re-exported for callers
import app.config as config


def create_token(payload: dict, expires_minutes: Optional[int] = None) -> str:
    """JWT アクセストークンを生成する。"""
    minutes = expires_minutes if expires_minutes is not None else config.JWT_EXPIRE_MINUTES()
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    data = {**payload, "exp": expire}
    return jwt.encode(data, config.JWT_SECRET(), algorithm="HS256")


def decode_token(token: str) -> dict:
    """JWT を検証してペイロードを返す。無効なら JWTError を raise する。"""
    return jwt.decode(token, config.JWT_SECRET(), algorithms=["HS256"])


from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

_bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """FastAPI Depends として使う。JWT を検証してペイロードを返す。
    無効なら 401 を返す。
    """
    try:
        payload = decode_token(credentials.credentials)
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
