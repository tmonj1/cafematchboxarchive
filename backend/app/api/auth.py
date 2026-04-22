from fastapi import APIRouter, HTTPException, Depends, status
from passlib.context import CryptContext
from app.models.user import UserRegisterRequest, UserLoginRequest, UserResponse, TokenResponse
from app.db import users as db_users
from app.db import matchboxes as db_matchboxes
from app.storage.s3 import delete_image
from app.auth.jwt import create_token, get_current_user

router = APIRouter()
_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/register", response_model=UserResponse, status_code=201)
def register(body: UserRegisterRequest):
    if db_users.get_user_by_username(body.username):
        raise HTTPException(status_code=409, detail="Username already taken")
    user = db_users.create_user(body.username, _pwd.hash(body.password))
    return user


@router.post("/login", response_model=TokenResponse)
def login(body: UserLoginRequest):
    user = db_users.get_user_by_username(body.username)
    if not user or not _pwd.verify(body.password, user["passwordHash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": user["userId"], "username": user["username"]})
    return {"access_token": token, "token_type": "bearer"}


@router.delete("/account", status_code=204)
def delete_account(current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    # 自分のマッチ箱と画像を全て削除
    matchboxes = db_matchboxes.list_matchboxes_by_user(user_id)
    for mb in matchboxes:
        for key in mb.get("imageKeys", []):
            delete_image(key)
        db_matchboxes.delete_matchbox(mb["matchboxId"])
    db_users.delete_user(user_id)
