import io
import pytest
from app.storage.s3 import upload_image, delete_image, get_image_url


def test_upload_image(aws_mock):
    data = io.BytesIO(b"fake-image-content")
    key = upload_image(
        user_id="u1", matchbox_id="m1",
        file_data=data, content_type="image/jpeg",
    )
    assert key.startswith("u1/m1/")
    assert key.endswith(".jpg")


def test_delete_image(aws_mock):
    data = io.BytesIO(b"fake")
    key = upload_image(user_id="u1", matchbox_id="m1", file_data=data, content_type="image/jpeg")
    delete_image(key)  # should not raise


def test_get_image_url(aws_mock):
    data = io.BytesIO(b"fake")
    key = upload_image(user_id="u1", matchbox_id="m1", file_data=data, content_type="image/jpeg")
    url = get_image_url(key)
    assert key in url


@pytest.mark.asyncio
async def test_upload_image_api(auth_client):
    # まずマッチ箱を作成
    mb = (await auth_client.post("/api/matchboxes", json={
        "name": "Photo Test", "roman": "PT", "est": "", "loc": "", "desc": "",
        "tags": [], "acquired": "", "closed": None, "style": 0,
    })).json()
    mb_id = mb["matchboxId"]

    # 画像をアップロード
    fake_image = io.BytesIO(b"\xff\xd8\xff\xe0" + b"\x00" * 100)  # JPEG magic bytes
    resp = await auth_client.post(
        f"/api/matchboxes/{mb_id}/images",
        files={"file": ("test.jpg", fake_image, "image/jpeg")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "key" in data
    assert "url" in data

    # matchbox の imageKeys に追加されていることを確認
    mb_resp = await auth_client.get(f"/api/matchboxes/{mb_id}")
    assert data["key"] in mb_resp.json()["imageKeys"]


@pytest.mark.asyncio
async def test_upload_image_max_9(auth_client):
    mb = (await auth_client.post("/api/matchboxes", json={
        "name": "Full", "roman": "F", "est": "", "loc": "", "desc": "",
        "tags": [], "acquired": "", "closed": None, "style": 0,
    })).json()
    mb_id = mb["matchboxId"]

    for i in range(9):
        fake = io.BytesIO(b"\xff\xd8\xff\xe0" + bytes([i]) * 10)
        await auth_client.post(
            f"/api/matchboxes/{mb_id}/images",
            files={"file": (f"img{i}.jpg", fake, "image/jpeg")},
        )

    # 10枚目は拒否
    extra = io.BytesIO(b"\xff\xd8\xff\xe0" + b"\x99" * 10)
    resp = await auth_client.post(
        f"/api/matchboxes/{mb_id}/images",
        files={"file": ("extra.jpg", extra, "image/jpeg")},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_delete_image_api(auth_client):
    mb = (await auth_client.post("/api/matchboxes", json={
        "name": "Del", "roman": "D", "est": "", "loc": "", "desc": "",
        "tags": [], "acquired": "", "closed": None, "style": 0,
    })).json()
    mb_id = mb["matchboxId"]

    fake = io.BytesIO(b"\xff\xd8\xff\xe0" + b"\x00" * 10)
    upload_resp = (await auth_client.post(
        f"/api/matchboxes/{mb_id}/images",
        files={"file": ("del.jpg", fake, "image/jpeg")},
    )).json()

    from urllib.parse import quote
    encoded_key = quote(upload_resp["key"], safe="")
    resp = await auth_client.delete(f"/api/matchboxes/{mb_id}/images/{encoded_key}")
    assert resp.status_code == 204
