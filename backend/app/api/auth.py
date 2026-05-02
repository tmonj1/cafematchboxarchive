from fastapi import APIRouter, HTTPException, Depends
from passlib.context import CryptContext
from app.models.user import UserRegisterRequest, UserLoginRequest, UserResponse, TokenResponse, UpdateProfileRequest
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
    if not user or not user.get("passwordHash") or not _pwd.verify(body.password, user["passwordHash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": user["userId"], "username": user["username"], "nickname": user.get("nickname", "")})
    return {"access_token": token, "token_type": "bearer"}


@router.put("/account/profile", response_model=TokenResponse)
def update_profile(body: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    user = db_users.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    nickname = body.nickname if body.nickname is not None else user.get("nickname", "")
    try:
        db_users.update_user_profile(user_id, nickname)
    except ValueError:
        raise HTTPException(status_code=404, detail="User not found")
    token = create_token({"sub": user_id, "username": user["username"], "nickname": nickname})
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
