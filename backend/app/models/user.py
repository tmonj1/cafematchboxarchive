from pydantic import BaseModel
from typing import Optional


class UserRegisterRequest(BaseModel):
    username: str
    password: str


class UserLoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    userId: str
    username: str
    nickname: Optional[str] = None
    bio: Optional[str] = None
    createdAt: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UpdateProfileRequest(BaseModel):
    nickname: Optional[str] = None
