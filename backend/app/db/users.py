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
