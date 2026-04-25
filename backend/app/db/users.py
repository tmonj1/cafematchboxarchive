import logging
import uuid
from datetime import datetime, timezone
from typing import Optional
from botocore.exceptions import ClientError
from app.db.client import get_dynamodb_resource

logger = logging.getLogger(__name__)


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
    """email で検索してユーザーを返す。見つからなければ None。

    GSI の Query 結果順は保証されないため、複数件ヒットした場合は
    createdAt で昇順ソートして最古のレコードを返す。
    通常は 1 件のみ返るが、並列コールバックによる重複作成が発生した場合に備える。
    """
    resp = _table().query(
        IndexName="email-index",
        KeyConditionExpression="email = :e",
        ExpressionAttributeValues={":e": email},
    )
    items = resp.get("Items", [])
    if not items:
        return None
    if len(items) > 1:
        logger.warning(
            "get_user_by_email: %d records found for email=%s; returning oldest",
            len(items),
            email,
        )
        items = sorted(items, key=lambda u: u.get("createdAt", ""))
    return items[0]


def create_oidc_user(email: str, display_name: str, provider: str, sub: str) -> dict:
    """OIDCユーザーを新規作成して返す。

    oidcProviders は {provider_name: sub} の Map 形式で保存する。
    """
    user = {
        "userId": str(uuid.uuid4()),
        "username": email,
        "email": email,
        "displayName": display_name,
        "passwordHash": None,
        "bio": "",
        "oidcProviders": {provider: sub},
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    _table().put_item(Item=user)
    return user


def link_oidc_provider(user_id: str, provider: str, sub: str) -> None:
    """既存ユーザーにOIDCプロバイダーを連携する。既に連携済みならスキップ。

    oidcProviders は {provider_name: sub} の Map 形式。
    attribute_not_exists による原子的更新でレースコンディションと重複を防ぐ。
    DynamoDB の contains はリスト内 Map に対して動作しないため Map 形式を採用。
    """
    try:
        _table().update_item(
            Key={"userId": user_id},
            UpdateExpression="SET oidcProviders.#p = :s",
            ConditionExpression="attribute_exists(userId) AND attribute_not_exists(oidcProviders.#p)",
            ExpressionAttributeNames={"#p": provider},
            ExpressionAttributeValues={":s": sub},
        )
    except ClientError as e:
        if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
        # ConditionalCheckFailed の原因を区別する:
        # - userId が存在しない → 不整合なのでエラー
        # - oidcProviders.{provider} が既に存在 → 連携済みのためスキップ
        if get_user_by_id(user_id) is None:
            raise ValueError(f"user not found: {user_id}") from e
