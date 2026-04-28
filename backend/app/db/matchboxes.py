import uuid
from datetime import datetime, timezone
from typing import Optional, List
from boto3.dynamodb.conditions import Key
from app.db.client import get_dynamodb_resource
from app import config


def _table():
    return get_dynamodb_resource().Table(config.MATCHBOXES_TABLE())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_matchbox(
    user_id: str, name: str, roman: str, est: str, loc: str,
    desc: str, tags: List[str], acquired: str, closed: Optional[str], style: int,
) -> dict:
    now = _now()
    mb = {
        "matchboxId": str(uuid.uuid4()),
        "userId": user_id,
        "name": name,
        "roman": roman,
        "est": est,
        "loc": loc,
        "desc": desc,
        "tags": tags,
        "acquired": acquired,
        "closed": closed,
        "style": style,
        "imageKeys": [],
        "createdAt": now,
        "updatedAt": now,
    }
    _table().put_item(Item=mb)
    return mb


def get_matchbox(matchbox_id: str) -> Optional[dict]:
    resp = _table().get_item(Key={"matchboxId": matchbox_id})
    return resp.get("Item")


def list_matchboxes() -> List[dict]:
    resp = _table().scan()
    return resp.get("Items", [])


def list_matchboxes_by_user(user_id: str) -> List[dict]:
    resp = _table().query(
        IndexName="userId-index",
        KeyConditionExpression=Key("userId").eq(user_id),
    )
    return resp.get("Items", [])


def update_matchbox(matchbox_id: str, updates: dict) -> dict:
    """updates の各キーを DynamoDB で更新して最新の item を返す。"""
    allowed = {"name", "roman", "est", "loc", "desc", "tags", "acquired", "closed", "style"}
    updates = {k: v for k, v in updates.items() if k in allowed and v is not None}
    updates["updatedAt"] = _now()

    expr_parts = []
    attr_values = {}
    attr_names = {}
    for i, (k, v) in enumerate(updates.items()):
        placeholder = f":v{i}"
        name_placeholder = f"#n{i}"
        expr_parts.append(f"{name_placeholder} = {placeholder}")
        attr_values[placeholder] = v
        attr_names[name_placeholder] = k

    resp = _table().update_item(
        Key={"matchboxId": matchbox_id},
        UpdateExpression="SET " + ", ".join(expr_parts),
        ExpressionAttributeValues=attr_values,
        ExpressionAttributeNames=attr_names,
        ReturnValues="ALL_NEW",
    )
    return resp["Attributes"]


def delete_matchbox(matchbox_id: str) -> None:
    _table().delete_item(Key={"matchboxId": matchbox_id})


def add_image_key(matchbox_id: str, key: str) -> None:
    _table().update_item(
        Key={"matchboxId": matchbox_id},
        UpdateExpression="SET imageKeys = list_append(imageKeys, :k), updatedAt = :t",
        ExpressionAttributeValues={":k": [key], ":t": _now()},
    )


def remove_image_key(matchbox_id: str, key: str) -> None:
    mb = get_matchbox(matchbox_id)
    if mb is None:
        return
    new_keys = [k for k in mb.get("imageKeys", []) if k != key]
    _table().update_item(
        Key={"matchboxId": matchbox_id},
        UpdateExpression="SET imageKeys = :keys, updatedAt = :t",
        ExpressionAttributeValues={":keys": new_keys, ":t": _now()},
    )
