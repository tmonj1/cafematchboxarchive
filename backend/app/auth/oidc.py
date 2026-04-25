import time
import httpx
from jose import jwt, JWTError  # noqa: F401 — JWTError を再エクスポート

# JWKS キャッシュ: {jwks_uri: (jwks_dict, fetched_at)}
_jwks_cache: dict = {}
_CACHE_TTL = 3600  # 1時間


def _get_openid_config(provider_config: dict) -> dict:
    """OPの OpenID Configuration を取得する。

    discovery_url が指定されていればそちらを使用（Docker 内部ホスト名等）。
    なければ issuer から導出する。
    """
    base = provider_config.get("discovery_url") or provider_config["issuer"]
    url = base.rstrip("/") + "/.well-known/openid-configuration"
    resp = httpx.get(url, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _get_jwks(jwks_uri: str) -> dict:
    """JWKS を取得する。TTL付きメモリキャッシュで過剰なHTTPリクエストを防ぐ。"""
    cached = _jwks_cache.get(jwks_uri)
    if cached and time.time() - cached[1] < _CACHE_TTL:
        return cached[0]
    resp = httpx.get(jwks_uri, timeout=10)
    resp.raise_for_status()
    jwks = resp.json()
    _jwks_cache[jwks_uri] = (jwks, time.time())
    return jwks


def exchange_code(
    provider_config: dict,
    code: str,
    code_verifier: str,
    redirect_uri: str,
) -> dict:
    """authorization_code を OP の token_endpoint で交換し、検証済み ID トークンのクレームを返す。

    Args:
        provider_config: {"client_id": str, "client_secret": str, "issuer": str}
        code: 認可コード
        code_verifier: PKCE コードベリファイア
        redirect_uri: 認可リクエスト時に使用したリダイレクトURI

    Returns:
        IDトークンのペイロード dict

    Raises:
        ValueError: token_endpoint エラー、id_token 未包含
        JWTError: IDトークンの署名・iss・aud・exp 検証失敗
    """
    oidc_config = _get_openid_config(provider_config)
    token_endpoint = oidc_config["token_endpoint"]
    jwks_uri = oidc_config["jwks_uri"]

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": provider_config["client_id"],
        "code_verifier": code_verifier,
    }
    if provider_config.get("client_secret"):
        data["client_secret"] = provider_config["client_secret"]

    resp = httpx.post(token_endpoint, data=data, timeout=10)
    if not resp.is_success:
        raise ValueError(f"Token endpoint error: {resp.status_code} {resp.text}")

    token_response = resp.json()
    id_token = token_response.get("id_token")
    if not id_token:
        raise ValueError("id_token not found in token response")
    access_token = token_response.get("access_token")

    jwks = _get_jwks(jwks_uri)
    # python-jose は JWKS dict を渡すと kid で自動的に適切な鍵を選択する
    # access_token が存在する場合のみ渡して at_hash クレームを検証する
    decode_kwargs: dict = {
        "algorithms": ["RS256"],
        "audience": provider_config["client_id"],
        "issuer": provider_config["issuer"],
    }
    if access_token:
        decode_kwargs["access_token"] = access_token
    payload = jwt.decode(id_token, jwks, **decode_kwargs)
    return payload
