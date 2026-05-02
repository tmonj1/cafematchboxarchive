import pytest
from app.auth.jwt import create_token, decode_token
from app.db.users import (
    create_user, get_user_by_username, get_user_by_id, delete_user,
    get_user_by_email, create_oidc_user, link_oidc_provider,
)


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


@pytest.mark.asyncio
async def test_update_profile_nickname(auth_client):
    resp = await auth_client.put("/api/auth/account/profile", json={"nickname": "テストニックネーム"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    # JWTにnicknameが含まれることを確認
    payload = decode_token(data["access_token"])
    assert payload["nickname"] == "テストニックネーム"
    # DynamoDBにnicknameが永続化されたことを確認
    from app.db.users import get_user_by_id
    user = get_user_by_id(payload["sub"])
    assert user is not None
    assert user["nickname"] == "テストニックネーム"


@pytest.mark.asyncio
async def test_update_profile_empty_nickname(auth_client):
    resp = await auth_client.put("/api/auth/account/profile", json={"nickname": ""})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_update_profile_nickname_too_long(auth_client):
    resp = await auth_client.put("/api/auth/account/profile", json={"nickname": "a" * 31})
    assert resp.status_code == 422


def test_get_user_by_email_not_found(aws_mock):
    result = get_user_by_email("nobody@example.com")
    assert result is None


def test_create_oidc_user(aws_mock):
    user = create_oidc_user(
        email="alice@example.com",
        display_name="Alice",
        provider="keycloak",
        sub="sub-001",
    )
    assert user["username"] == "alice@example.com"
    assert user["email"] == "alice@example.com"
    assert user["displayName"] == "Alice"
    assert user["passwordHash"] is None
    assert user["oidcProviders"] == {"keycloak": "sub-001"}
    assert "userId" in user


def test_get_user_by_email_found(aws_mock):
    create_oidc_user("bob@example.com", "Bob", "keycloak", "sub-002")
    user = get_user_by_email("bob@example.com")
    assert user is not None
    assert user["email"] == "bob@example.com"


def test_link_oidc_provider_adds_new_provider(aws_mock):
    user = create_oidc_user("carol@example.com", "Carol", "keycloak", "sub-003")
    link_oidc_provider(user["userId"], "github", "gh-003")
    updated = get_user_by_id(user["userId"])
    assert updated["oidcProviders"] == {"keycloak": "sub-003", "github": "gh-003"}


def test_link_oidc_provider_skips_duplicate(aws_mock):
    user = create_oidc_user("dave@example.com", "Dave", "keycloak", "sub-004")
    link_oidc_provider(user["userId"], "keycloak", "sub-004")  # 同じプロバイダー・sub
    updated = get_user_by_id(user["userId"])
    assert updated["oidcProviders"] == {"keycloak": "sub-004"}  # 重複なし


def test_link_oidc_provider_rejects_different_sub(aws_mock):
    """異なる sub が登録済みの場合は ValueError を送出する（アカウント乗っ取り防止）。"""
    user = create_oidc_user("eve@example.com", "Eve", "keycloak", "sub-005")
    with pytest.raises(ValueError, match="already linked to a different sub"):
        link_oidc_provider(user["userId"], "keycloak", "sub-999")
