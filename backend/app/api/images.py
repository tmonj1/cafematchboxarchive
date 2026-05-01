from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, status
from app.db import matchboxes as db
from app.storage.s3 import upload_image, delete_image, get_image_url
from app.auth.jwt import get_current_user

router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"}
MAX_IMAGES = 9


@router.post("/{matchbox_id}/images")
async def upload_matchbox_image(
    matchbox_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    mb = db.get_matchbox(matchbox_id)
    if mb is None:
        raise HTTPException(status_code=404, detail="Matchbox not found")
    if mb["userId"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")
    if len(mb.get("imageKeys", [])) >= MAX_IMAGES:
        raise HTTPException(status_code=400, detail="Maximum 9 images per matchbox")

    key = upload_image(
        user_id=current_user["sub"],
        matchbox_id=matchbox_id,
        file_data=file.file,
        content_type=file.content_type,
    )
    db.add_image_key(matchbox_id, key)
    return {"key": key, "url": get_image_url(key)}


@router.delete("/{matchbox_id}/images/{image_key:path}", status_code=204)
def delete_matchbox_image(
    matchbox_id: str,
    image_key: str,
    current_user: dict = Depends(get_current_user),
):
    mb = db.get_matchbox(matchbox_id)
    if mb is None:
        raise HTTPException(status_code=404, detail="Matchbox not found")
    if mb["userId"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if image_key not in mb.get("imageKeys", []):
        raise HTTPException(status_code=404, detail="Image not found")

    delete_image(image_key)
    db.remove_image_key(matchbox_id, image_key)
