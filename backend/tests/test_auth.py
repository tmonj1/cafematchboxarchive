import pytest
from app.auth.jwt import create_token, decode_token
from app.db.users import create_user, get_user_by_username, get_user_by_id, delete_user


def test_create_and_decode_token():
    payload = {"sub": "user-123", "username": "alice"}
    token = create_token(payload)
    decoded = decode_token(token)
    assert decoded["sub"] == "user-123"
    assert decoded["username"] == "alice"


def test_decode_invalid_token():
    from app.auth.jwt import JWTError
    with pytest.raises(JWTError):
        decode_token("invalid.token.here")


def test_create_user(aws_mock):
    user = create_user("alice", "hashed_password_here")
    assert user["username"] == "alice"
    assert "userId" in user
    assert "createdAt" in user


def test_get_user_by_username(aws_mock):
    create_user("bob", "hash")
    user = get_user_by_username("bob")
    assert user is not None
    assert user["username"] == "bob"


def test_get_user_by_username_not_found(aws_mock):
    result = get_user_by_username("nobody")
    assert result is None


def test_delete_user(aws_mock):
    user = create_user("carol", "hash")
    delete_user(user["userId"])
    assert get_user_by_id(user["userId"]) is None


@pytest.mark.asyncio
async def test_register_success(client):
    resp = await client.post("/api/auth/register", json={"username": "alice", "password": "pass123"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "alice"
    assert "userId" in data


@pytest.mark.asyncio
async def test_register_duplicate_username(client):
    await client.post("/api/auth/register", json={"username": "alice", "password": "pass123"})
    resp = await client.post("/api/auth/register", json={"username": "alice", "password": "other"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post("/api/auth/register", json={"username": "alice", "password": "pass123"})
    resp = await client.post("/api/auth/login", json={"username": "alice", "password": "pass123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/auth/register", json={"username": "alice", "password": "pass123"})
    resp = await client.post("/api/auth/login", json={"username": "alice", "password": "wrong"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_account(auth_client):
    resp = await auth_client.delete("/api/auth/account")
    assert resp.status_code == 204
