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

    # email-index で検索し、なければ username=email のローカルユーザーも確認する
    user = db_users.get_user_by_email(email) or db_users.get_user_by_username(email)
    if user:
        db_users.link_oidc_provider(user["userId"], body.provider, sub)
    else:
        user = db_users.create_oidc_user(email, display_name, body.provider, sub)

    token = create_token({"sub": user["userId"], "username": user["username"]})
    return {"access_token": token, "token_type": "bearer"}
