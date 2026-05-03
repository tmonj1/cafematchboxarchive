from pydantic import BaseModel, Field
from typing import Optional, List


class MatchboxCreateRequest(BaseModel):
    name: str
    roman: Optional[str] = ""
    est: Optional[str] = ""
    loc: Optional[str] = ""
    desc: Optional[str] = ""
    tags: Optional[List[str]] = []
    acquired: Optional[str] = ""
    closed: Optional[str] = None
    style: Optional[int] = 0


class MatchboxUpdateRequest(BaseModel):
    name: Optional[str] = None
    roman: Optional[str] = None
    est: Optional[str] = None
    loc: Optional[str] = None
    desc: Optional[str] = None
    tags: Optional[List[str]] = None
    acquired: Optional[str] = None
    closed: Optional[str] = None
    style: Optional[int] = None


class _MatchboxBase(BaseModel):
    matchboxId: str
    userId: str
    name: str
    roman: str
    est: str
    loc: str
    desc: str
    tags: List[str]
    acquired: str
    closed: Optional[str]
    style: int
    imageKeys: List[str]
    imageUrls: List[str] = Field(default_factory=list)
    createdAt: str
    updatedAt: str


class MatchboxListResponse(_MatchboxBase):
    """一覧API用レスポンス。ownerNickname を含まない。"""
    pass


class MatchboxDetailResponse(_MatchboxBase):
    """詳細・作成・更新API用レスポンス。ownerNickname を含む。"""
    ownerNickname: str
