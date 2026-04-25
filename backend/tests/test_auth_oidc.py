from unittest.mock import patch
import pytest


FAKE_CLAIMS = {"sub": "oidc-sub-001", "email": "user@example.com", "name": "OIDC User"}
REDIRECT_URI = "http://localhost:5173/oidc-callback"
OIDC_PROVIDERS_ENV = (
    '{"keycloak":{"client_id":"cma-frontend","client_secret":"",'
    '"issuer":"http://keycloak.test/realms/cma",'
    f'"allowed_redirect_uris":["{REDIRECT_URI}"]}}}}'
)


@pytest.fixture
def oidc_env(monkeypatch):
    monkeypatch.setenv("OIDC_PROVIDERS", OIDC_PROVIDERS_ENV)


@pytest.mark.asyncio
async def test_oidc_callback_creates_new_user(client, oidc_env):
    with patch("app.api.auth_oidc.oidc_mod.exchange_code", return_value=FAKE_CLAIMS):
        resp = await client.post("/api/auth/oidc/callback", json={
            "code": "auth_code",
            "code_verifier": "verifier",
            "redirect_uri": REDIRECT_URI,
            "provider": "keycloak",
        })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_oidc_callback_links_existing_user(client, oidc_env):
    """同じemailで2回ログインすると同一ユーザーのJWTが返る。"""
    with patch("app.api.auth_oidc.oidc_mod.exchange_code", return_value=FAKE_CLAIMS):
        resp1 = await client.post("/api/auth/oidc/callback", json={
            "code": "code1",
            "code_verifier": "v1",
            "redirect_uri": REDIRECT_URI,
            "provider": "keycloak",
        })
        resp2 = await client.post("/api/auth/oidc/callback", json={
            "code": "code2",
            "code_verifier": "v2",
            "redirect_uri": REDIRECT_URI,
            "provider": "keycloak",
        })

    import base64
    import json as json_mod

    def decode_jwt_sub(token):
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return json_mod.loads(base64.b64decode(payload))["sub"]

    sub1 = decode_jwt_sub(resp1.json()["access_token"])
    sub2 = decode_jwt_sub(resp2.json()["access_token"])
    assert sub1 == sub2  # 同一ユーザーID


@pytest.mark.asyncio
async def test_oidc_callback_unknown_provider(client, oidc_env):
    resp = await client.post("/api/auth/oidc/callback", json={
        "code": "code",
        "code_verifier": "v",
        "redirect_uri": REDIRECT_URI,
        "provider": "unknown_op",
    })
    assert resp.status_code == 400
    assert "Unknown provider" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_oidc_callback_token_endpoint_error(client, oidc_env):
    with patch("app.api.auth_oidc.oidc_mod.exchange_code",
               side_effect=ValueError("Token endpoint error: 400 Bad Request")):
        resp = await client.post("/api/auth/oidc/callback", json={
            "code": "bad_code",
            "code_verifier": "v",
            "redirect_uri": REDIRECT_URI,
            "provider": "keycloak",
        })
    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_oidc_callback_invalid_jwt(client, oidc_env):
    from jose import JWTError
    with patch("app.api.auth_oidc.oidc_mod.exchange_code",
               side_effect=JWTError("bad signature")):
        resp = await client.post("/api/auth/oidc/callback", json={
            "code": "code",
            "code_verifier": "v",
            "redirect_uri": REDIRECT_URI,
            "provider": "keycloak",
        })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_oidc_callback_missing_email(client, oidc_env):
    claims_no_email = {"sub": "oidc-sub-002", "name": "No Email User"}
    with patch("app.api.auth_oidc.oidc_mod.exchange_code", return_value=claims_no_email):
        resp = await client.post("/api/auth/oidc/callback", json={
            "code": "code",
            "code_verifier": "v",
            "redirect_uri": REDIRECT_URI,
            "provider": "keycloak",
        })
    assert resp.status_code == 400
    assert "email" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_oidc_callback_missing_sub(client, oidc_env):
    """subクレームがない場合は400を返す。"""
    claims_no_sub = {"email": "user@example.com", "name": "No Sub User"}
    with patch("app.api.auth_oidc.oidc_mod.exchange_code", return_value=claims_no_sub):
        resp = await client.post("/api/auth/oidc/callback", json={
            "code": "code",
            "code_verifier": "v",
            "redirect_uri": REDIRECT_URI,
            "provider": "keycloak",
        })
    assert resp.status_code == 400
    assert "sub" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_oidc_callback_links_local_user_by_username(client, oidc_env):
    """username=emailのローカルユーザーがOIDCログインで連携される。"""
    from passlib.context import CryptContext
    from app.db import users as db_users

    _pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
    email = "localuser@example.com"
    db_users.create_user(email, _pwd.hash("password123"))

    with patch("app.api.auth_oidc.oidc_mod.exchange_code",
               return_value={"sub": "oidc-sub-local", "email": email, "name": "Local User"}):
        resp = await client.post("/api/auth/oidc/callback", json={
            "code": "code",
            "code_verifier": "v",
            "redirect_uri": REDIRECT_URI,
            "provider": "keycloak",
        })
    assert resp.status_code == 200

    user = db_users.get_user_by_username(email)
    assert user is not None
    assert any(p["provider"] == "keycloak" for p in user.get("oidcProviders", []))


@pytest.mark.asyncio
async def test_oidc_callback_invalid_redirect_uri(client, oidc_env):
    """allowed_redirect_uris に含まれない redirect_uri は 400 を返す。"""
    resp = await client.post("/api/auth/oidc/callback", json={
        "code": "code",
        "code_verifier": "v",
        "redirect_uri": "http://evil.example.com/callback",
        "provider": "keycloak",
    })
    assert resp.status_code == 400
    assert "redirect_uri" in resp.json()["detail"]
