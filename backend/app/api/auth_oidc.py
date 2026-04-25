from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from jose import JWTError
from app.auth import oidc as oidc_mod
from app.auth.jwt import create_token
from app.db import users as db_users
from app.models.user import TokenResponse
import app.config as config

router = APIRouter()


class OidcCallbackRequest(BaseModel):
    code: str
    code_verifier: str
    redirect_uri: str
    provider: str


@router.post("/oidc/callback", response_model=TokenResponse)
def oidc_callback(body: OidcCallbackRequest):
    providers = config.OIDC_PROVIDERS()
    if body.provider not in providers:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {body.provider}")

    provider_config = providers[body.provider]

    allowed = provider_config.get("allowed_redirect_uris")
    if not isinstance(allowed, list) or not allowed:
        raise HTTPException(status_code=500, detail="OIDC provider redirect URIs are not configured")
    if body.redirect_uri not in allowed:
        raise HTTPException(status_code=400, detail="redirect_uri not allowed")

    try:
        claims = oidc_mod.exchange_code(
            provider_config=provider_config,
            code=body.code,
            code_verifier=body.code_verifier,
            redirect_uri=body.redirect_uri,
        )
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    email = claims.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="email claim missing from ID token")

    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status_code=400, detail="sub claim missing from ID token")

    display_name = claims.get("name", email)

    # email-index のみで検索する。username による fallback は行わない。
    # username=email のローカルユーザーと紐付けると、第三者が事前に同名の
    # username を登録してアカウントを乗っ取れるため fail-closed とする。
    user = db_users.get_user_by_email(email)
    if user:
        db_users.link_oidc_provider(user["userId"], body.provider, sub)
    else:
        user = db_users.create_oidc_user(email, display_name, body.provider, sub)
        # 同一 email の並列コールバックによる重複作成を防ぐための再チェック。
        # DynamoDB の email-index は GSI のため書き込み後に即時反映されない場合があるが、
        # 楽観的な対策として作成直後に再読し、先行する別ユーザーが存在すれば最古を使う。
        # 完全な冪等化には TransactWriteItems や email 専用テーブルが必要（既知の制限）。
        existing = db_users.get_user_by_email(email)
        if existing and existing["userId"] != user["userId"]:
            # 先行ユーザーに連携してこちらが作ったレコードは孤立するが、
            # username 衝突よりも安全な選択
            db_users.link_oidc_provider(existing["userId"], body.provider, sub)
            user = existing

    token = create_token({"sub": user["userId"], "username": user["username"]})
    return {"access_token": token, "token_type": "bearer"}
