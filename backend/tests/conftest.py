import os
import pytest
import boto3
from moto import mock_aws
from httpx import AsyncClient, ASGITransport


@pytest.fixture(autouse=True)
def set_test_env(monkeypatch):
    """テスト用環境変数を設定する。moto が正しく動作するように endpoint は空にする。"""
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_DEFAULT_REGION", "ap-northeast-1")
    monkeypatch.setenv("DYNAMODB_ENDPOINT", "")
    monkeypatch.setenv("S3_ENDPOINT", "")
    monkeypatch.setenv("S3_BUCKET", "test-bucket")
    monkeypatch.setenv("S3_ACCESS_KEY", "testing")
    monkeypatch.setenv("S3_SECRET_KEY", "testing")
    monkeypatch.setenv("JWT_SECRET", "test-secret-for-testing-only")
    monkeypatch.setenv("JWT_EXPIRE_MINUTES", "60")


@pytest.fixture
def aws_mock():
    """DynamoDB と S3 を moto でモックする。"""
    with mock_aws():
        # DynamoDB テーブル作成
        ddb = boto3.resource("dynamodb", region_name="ap-northeast-1")
        ddb.create_table(
            TableName="users",
            AttributeDefinitions=[
                {"AttributeName": "userId", "AttributeType": "S"},
                {"AttributeName": "username", "AttributeType": "S"},
            ],
            KeySchema=[{"AttributeName": "userId", "KeyType": "HASH"}],
            BillingMode="PAY_PER_REQUEST",
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "username-index",
                    "KeySchema": [{"AttributeName": "username", "KeyType": "HASH"}],
                    "Projection": {"ProjectionType": "ALL"},
                }
            ],
        )
        ddb.create_table(
            TableName="matchboxes",
            AttributeDefinitions=[
                {"AttributeName": "matchboxId", "AttributeType": "S"},
                {"AttributeName": "userId", "AttributeType": "S"},
            ],
            KeySchema=[{"AttributeName": "matchboxId", "KeyType": "HASH"}],
            BillingMode="PAY_PER_REQUEST",
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "userId-index",
                    "KeySchema": [{"AttributeName": "userId", "KeyType": "HASH"}],
                    "Projection": {"ProjectionType": "ALL"},
                }
            ],
        )
        # S3 バケット作成
        s3 = boto3.client("s3", region_name="us-east-1")
        s3.create_bucket(Bucket="test-bucket")
        yield


@pytest.fixture
async def client(aws_mock):
    from app.main import app
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.fixture
async def auth_client(client):
    """登録済みユーザーとして認証済みの client を返す。"""
    await client.post(
        "/api/auth/register",
        json={"username": "testuser", "password": "password123"},
    )
    resp = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "password123"},
    )
    token = resp.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
