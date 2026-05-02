from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from app.models.matchbox import (
    MatchboxCreateRequest, MatchboxUpdateRequest,
    MatchboxListResponse, MatchboxDetailResponse,
)
from app.db import matchboxes as db
from app.db import users as users_db
from app.storage.s3 import get_image_url
from app.auth.jwt import get_current_user

router = APIRouter()


def _with_urls(mb: dict) -> dict:
    mb["imageUrls"] = [get_image_url(k) for k in mb.get("imageKeys", [])]
    return mb


def _resolve_owner_nickname(user: dict) -> str:
    """nickname → displayName（OIDCユーザーのみ持つ）の順でフォールバック。
    username はメールアドレスになり得るため公開しない。"""
    if user.get("nickname"):
        return user["nickname"]
    if user.get("displayName"):
        return user["displayName"]
    return "ユーザー"


def _with_owner(mb: dict) -> dict:
    user = users_db.get_user_by_id(mb["userId"])
    mb["ownerNickname"] = _resolve_owner_nickname(user) if user else "ユーザー"
    return mb


@router.get("", response_model=List[MatchboxListResponse])
def list_matchboxes(tag: Optional[str] = None, q: Optional[str] = None):
    """全マッチ箱一覧（公開）。tag・q でフィルタ可。"""
    items = db.list_matchboxes()
    if tag:
        items = [m for m in items if tag in m.get("tags", [])]
    if q:
        q_lower = q.lower()
        items = [
            m for m in items
            if q_lower in m.get("name", "").lower()
            or q_lower in m.get("loc", "").lower()
            or q_lower in m.get("roman", "").lower()
        ]
    return [_with_urls(m) for m in items]


@router.get("/mine", response_model=List[MatchboxDetailResponse])
def list_my_matchboxes(current_user: dict = Depends(get_current_user)):
    """認証ユーザー自身のマッチ箱一覧。ownerNickname を付与する（EditScreen で使用）。"""
    user = users_db.get_user_by_id(current_user["sub"])
    owner_nickname = _resolve_owner_nickname(user) if user else "ユーザー"
    result = []
    for m in db.list_matchboxes_by_user(current_user["sub"]):
        m_with_urls = _with_urls(m)
        m_with_urls["ownerNickname"] = owner_nickname
        result.append(m_with_urls)
    return result


@router.get("/{matchbox_id}", response_model=MatchboxDetailResponse)
def get_matchbox(matchbox_id: str):
    mb = db.get_matchbox(matchbox_id)
    if mb is None:
        raise HTTPException(status_code=404, detail="Matchbox not found")
    return _with_owner(_with_urls(mb))


@router.post("", response_model=MatchboxDetailResponse, status_code=201)
def create_matchbox(body: MatchboxCreateRequest, current_user: dict = Depends(get_current_user)):
    return _with_owner(_with_urls(db.create_matchbox(
        user_id=current_user["sub"],
        name=body.name, roman=body.roman or "", est=body.est or "",
        loc=body.loc or "", desc=body.desc or "", tags=body.tags or [],
        acquired=body.acquired or "", closed=body.closed, style=body.style or 0,
    )))


@router.put("/{matchbox_id}", response_model=MatchboxDetailResponse)
def update_matchbox(
    matchbox_id: str,
    body: MatchboxUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    mb = db.get_matchbox(matchbox_id)
    if mb is None:
        raise HTTPException(status_code=404, detail="Matchbox not found")
    if mb["userId"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return _with_owner(_with_urls(db.update_matchbox(matchbox_id, body.model_dump(exclude_none=True))))


@router.delete("/{matchbox_id}", status_code=204)
def delete_matchbox(matchbox_id: str, current_user: dict = Depends(get_current_user)):
    mb = db.get_matchbox(matchbox_id)
    if mb is None:
        raise HTTPException(status_code=404, detail="Matchbox not found")
    if mb["userId"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    from app.storage.s3 import delete_image
    for key in mb.get("imageKeys", []):
        delete_image(key)
    db.delete_matchbox(matchbox_id)
