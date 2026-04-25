import uuid
from datetime import datetime, timezone
from typing import Optional
from app.db.client import get_dynamodb_resource


TABLE_NAME = "users"


def _table():
    return get_dynamodb_resource().Table(TABLE_NAME)


def create_user(username: str, password_hash: str, bio: str = "") -> dict:
    """新規ユーザーを作成して返す。"""
    user = {
        "userId": str(uuid.uuid4()),
        "username": username,
        "passwordHash": password_hash,
        "bio": bio,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    _table().put_item(Item=user)
    return user


def get_user_by_username(username: str) -> Optional[dict]:
    """username で検索してユーザーを返す。見つからなければ None。"""
    resp = _table().query(
        IndexName="username-index",
        KeyConditionExpression="username = :u",
        ExpressionAttributeValues={":u": username},
    )
    items = resp.get("Items", [])
    return items[0] if items else None


def get_user_by_id(user_id: str) -> Optional[dict]:
    """userId でユーザーを返す。見つからなければ None。"""
    resp = _table().get_item(Key={"userId": user_id})
    return resp.get("Item")


def delete_user(user_id: str) -> None:
    """ユーザーを削除する。"""
    _table().delete_item(Key={"userId": user_id})


def get_user_by_email(email: str) -> Optional[dict]:
    """email で検索してユーザーを返す。見つからなければ None。"""
    resp = _table().query(
        IndexName="email-index",
        KeyConditionExpression="email = :e",
        ExpressionAttributeValues={":e": email},
    )
    items = resp.get("Items", [])
    return items[0] if items else None


def create_oidc_user(email: str, display_name: str, provider: str, sub: str) -> dict:
    """OIDCユーザーを新規作成して返す。"""
    user = {
        "userId": str(uuid.uuid4()),
        "username": email,
        "email": email,
        "displayName": display_name,
        "passwordHash": None,
        "bio": "",
        "oidcProviders": [{"provider": provider, "sub": sub}],
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    _table().put_item(Item=user)
    return user


def link_oidc_provider(user_id: str, provider: str, sub: str) -> None:
    """既存ユーザーにOIDCプロバイダーを連携する。既に連携済みならスキップ。"""
    user = get_user_by_id(user_id)
    if not user:
        return
    providers = user.get("oidcProviders", [])
    if any(p["provider"] == provider and p["sub"] == sub for p in providers):
        return
    providers.append({"provider": provider, "sub": sub})
    _table().update_item(
        Key={"userId": user_id},
        UpdateExpression="SET oidcProviders = :p",
        ExpressionAttributeValues={":p": providers},
    )
