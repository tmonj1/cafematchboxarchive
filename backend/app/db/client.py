import boto3
import app.config as config


def get_dynamodb_resource():
    """DynamoDB boto3 resource を返す。
    環境変数を毎回読むことでテスト時の monkeypatch.setenv が有効になる。
    """
    kwargs = {
        "region_name": config.AWS_DEFAULT_REGION(),
        "aws_access_key_id": config.AWS_ACCESS_KEY_ID(),
        "aws_secret_access_key": config.AWS_SECRET_ACCESS_KEY(),
    }
    endpoint = config.DYNAMODB_ENDPOINT()
    if endpoint:
        kwargs["endpoint_url"] = endpoint
    return boto3.resource("dynamodb", **kwargs)


def get_s3_client():
    """S3/MinIO boto3 client を返す。"""
    kwargs = {
        "region_name": config.AWS_DEFAULT_REGION(),
        "aws_access_key_id": config.S3_ACCESS_KEY(),
        "aws_secret_access_key": config.S3_SECRET_KEY(),
    }
    endpoint = config.S3_ENDPOINT()
    if endpoint:
        kwargs["endpoint_url"] = endpoint
    return boto3.client("s3", **kwargs)
