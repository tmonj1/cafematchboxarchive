from unittest.mock import patch, MagicMock
import pytest
from app.auth import oidc as oidc_mod


@pytest.fixture(autouse=True)
def clear_jwks_cache():
    """各テスト前にJWKSキャッシュをクリアする。"""
    oidc_mod._jwks_cache.clear()
    yield
    oidc_mod._jwks_cache.clear()


FAKE_ISSUER = "http://keycloak.test/realms/cma"
FAKE_OPENID_CONFIG = {
    "token_endpoint": "http://keycloak.test/realms/cma/protocol/openid-connect/token",
    "jwks_uri": "http://keycloak.test/realms/cma/protocol/openid-connect/certs",
}
FAKE_JWKS = {"keys": [{"kty": "RSA", "kid": "test-key"}]}
FAKE_CLAIMS = {"sub": "user-001", "email": "user@example.com", "name": "Test User", "iss": FAKE_ISSUER}
PROVIDER_CONFIG = {"client_id": "cma-frontend", "client_secret": "", "issuer": FAKE_ISSUER}


def _make_get_side_effect():
    """httpx.get の side_effect を生成する（openid-config → JWKS の順）。"""
    def side_effect(url, **kwargs):
        m = MagicMock()
        m.raise_for_status = MagicMock()
        if "openid-configuration" in url:
            m.json.return_value = FAKE_OPENID_CONFIG
        else:
            m.json.return_value = FAKE_JWKS
        return m
    return side_effect


def test_exchange_code_new_user_success():
    mock_post = MagicMock()
    mock_post.return_value.is_success = True
    mock_post.return_value.json.return_value = {"id_token": "fake.id.token"}

    with patch("app.auth.oidc.httpx.get", side_effect=_make_get_side_effect()), \
         patch("app.auth.oidc.httpx.post", mock_post), \
         patch("app.auth.oidc.jwt.decode", return_value=FAKE_CLAIMS):
        result = oidc_mod.exchange_code(
            provider_config=PROVIDER_CONFIG,
            code="auth_code_123",
            code_verifier="verifier_abc",
            redirect_uri="http://localhost:5173/oidc-callback",
        )

    assert result["email"] == "user@example.com"
    assert result["sub"] == "user-001"


def test_exchange_code_token_endpoint_error():
    mock_post = MagicMock()
    mock_post.return_value.is_success = False
    mock_post.return_value.status_code = 400
    mock_post.return_value.text = "Bad Request"

    with patch("app.auth.oidc.httpx.get", side_effect=_make_get_side_effect()), \
         patch("app.auth.oidc.httpx.post", mock_post):
        with pytest.raises(ValueError, match="Token endpoint error"):
            oidc_mod.exchange_code(
                provider_config=PROVIDER_CONFIG,
                code="bad_code",
                code_verifier="verifier",
                redirect_uri="http://localhost:5173/oidc-callback",
            )


def test_exchange_code_missing_id_token():
    mock_post = MagicMock()
    mock_post.return_value.is_success = True
    mock_post.return_value.json.return_value = {}  # id_token なし

    with patch("app.auth.oidc.httpx.get", side_effect=_make_get_side_effect()), \
         patch("app.auth.oidc.httpx.post", mock_post):
        with pytest.raises(ValueError, match="id_token not found"):
            oidc_mod.exchange_code(
                provider_config=PROVIDER_CONFIG,
                code="code",
                code_verifier="verifier",
                redirect_uri="http://localhost:5173/oidc-callback",
            )


def test_exchange_code_invalid_jwt():
    from jose import JWTError
    mock_post = MagicMock()
    mock_post.return_value.is_success = True
    mock_post.return_value.json.return_value = {"id_token": "invalid.jwt.token"}

    with patch("app.auth.oidc.httpx.get", side_effect=_make_get_side_effect()), \
         patch("app.auth.oidc.httpx.post", mock_post), \
         patch("app.auth.oidc.jwt.decode", side_effect=JWTError("bad signature")):
        with pytest.raises(JWTError):
            oidc_mod.exchange_code(
                provider_config=PROVIDER_CONFIG,
                code="code",
                code_verifier="verifier",
                redirect_uri="http://localhost:5173/oidc-callback",
            )


def test_jwks_cache_is_reused():
    """2回目の呼び出しでJWKSキャッシュが使われることを確認。"""
    get_call_count = [0]

    def counting_get(url, **kwargs):
        m = MagicMock()
        m.raise_for_status = MagicMock()
        if "openid-configuration" in url:
            m.json.return_value = FAKE_OPENID_CONFIG
        else:
            get_call_count[0] += 1
            m.json.return_value = FAKE_JWKS
        return m

    mock_post = MagicMock()
    mock_post.return_value.is_success = True
    mock_post.return_value.json.return_value = {"id_token": "fake.id.token"}

    with patch("app.auth.oidc.httpx.get", side_effect=counting_get), \
         patch("app.auth.oidc.httpx.post", mock_post), \
         patch("app.auth.oidc.jwt.decode", return_value=FAKE_CLAIMS):
        oidc_mod.exchange_code(PROVIDER_CONFIG, "code1", "v1", "http://localhost:5173/oidc-callback")
        oidc_mod.exchange_code(PROVIDER_CONFIG, "code2", "v2", "http://localhost:5173/oidc-callback")

    assert get_call_count[0] == 1  # JWKSフェッチは1回のみ
