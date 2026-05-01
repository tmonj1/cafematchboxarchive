import uuid
from typing import BinaryIO
import app.config as config
from app.db.client import get_s3_client

CONTENT_TYPE_TO_EXT = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
}


def upload_image(user_id: str, matchbox_id: str, file_data: BinaryIO, content_type: str) -> str:
    """S3 に画像をアップロードしてオブジェクトキーを返す。"""
    ext = CONTENT_TYPE_TO_EXT.get(content_type, "jpg")
    key = f"{user_id}/{matchbox_id}/{uuid.uuid4()}.{ext}"
    client = get_s3_client()
    client.upload_fileobj(
        file_data,
        config.S3_BUCKET(),
        key,
        ExtraArgs={"ContentType": content_type},
    )
    return key


def delete_image(key: str) -> None:
    """S3 からオブジェクトを削除する。"""
    client = get_s3_client()
    client.delete_object(Bucket=config.S3_BUCKET(), Key=key)


def get_image_url(key: str) -> str:
    """署名付き URL を生成して返す（有効期限 1 時間）。
    開発時（S3_ENDPOINT が設定されている場合）は直接 URL を返す。
    """
    endpoint = config.S3_ENDPOINT()
    if endpoint:
        # MinIO 開発環境: ブラウザからアクセス可能な公開エンドポイントを使用
        public_endpoint = config.S3_PUBLIC_ENDPOINT()
        return f"{public_endpoint}/{config.S3_BUCKET()}/{key}"
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": config.S3_BUCKET(), "Key": key},
        ExpiresIn=3600,
    )
