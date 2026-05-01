import pytest
from app.db.matchboxes import (
    create_matchbox, get_matchbox, list_matchboxes,
    list_matchboxes_by_user, update_matchbox, delete_matchbox,
    add_image_key, remove_image_key,
)


@pytest.fixture
def sample_matchbox(aws_mock):
    return create_matchbox(
        user_id="user-1",
        name="純喫茶 テスト",
        roman="TEST",
        est="1965",
        loc="東京都千代田区",
        desc="テスト用",
        tags=["純喫茶", "老舗"],
        acquired="1990年",
        closed=None,
        style=0,
    )


def test_create_matchbox(aws_mock):
    mb = create_matchbox(user_id="u1", name="喫茶テスト", roman="TEST",
                         est="1970", loc="", desc="", tags=[], acquired="", closed=None, style=1)
    assert mb["name"] == "喫茶テスト"
    assert mb["userId"] == "u1"
    assert "matchboxId" in mb
    assert mb["imageKeys"] == []


def test_get_matchbox(sample_matchbox):
    found = get_matchbox(sample_matchbox["matchboxId"])
    assert found is not None
    assert found["name"] == "純喫茶 テスト"


def test_get_matchbox_not_found(aws_mock):
    assert get_matchbox("nonexistent-id") is None


def test_list_matchboxes(aws_mock):
    create_matchbox(user_id="u1", name="A", roman="A", est="", loc="", desc="", tags=[], acquired="", closed=None, style=0)
    create_matchbox(user_id="u2", name="B", roman="B", est="", loc="", desc="", tags=[], acquired="", closed=None, style=1)
    items = list_matchboxes()
    assert len(items) == 2


def test_list_matchboxes_by_user(aws_mock):
    create_matchbox(user_id="u1", name="A", roman="A", est="", loc="", desc="", tags=[], acquired="", closed=None, style=0)
    create_matchbox(user_id="u1", name="B", roman="B", est="", loc="", desc="", tags=[], acquired="", closed=None, style=1)
    create_matchbox(user_id="u2", name="C", roman="C", est="", loc="", desc="", tags=[], acquired="", closed=None, style=2)
    items = list_matchboxes_by_user("u1")
    assert len(items) == 2
    assert all(m["userId"] == "u1" for m in items)


def test_update_matchbox(sample_matchbox):
    updated = update_matchbox(sample_matchbox["matchboxId"], {"name": "更新後", "tags": ["ジャズ"]})
    assert updated["name"] == "更新後"
    assert updated["tags"] == ["ジャズ"]


def test_delete_matchbox(sample_matchbox):
    delete_matchbox(sample_matchbox["matchboxId"])
    assert get_matchbox(sample_matchbox["matchboxId"]) is None


def test_add_and_remove_image_key(sample_matchbox):
    mb_id = sample_matchbox["matchboxId"]
    add_image_key(mb_id, "user-1/matchbox-1/photo.jpg")
    mb = get_matchbox(mb_id)
    assert "user-1/matchbox-1/photo.jpg" in mb["imageKeys"]

    remove_image_key(mb_id, "user-1/matchbox-1/photo.jpg")
    mb = get_matchbox(mb_id)
    assert "user-1/matchbox-1/photo.jpg" not in mb["imageKeys"]


@pytest.mark.asyncio
async def test_list_matchboxes_public(client):
    resp = await client.get("/api/matchboxes")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_create_matchbox(auth_client):
    resp = await auth_client.post("/api/matchboxes", json={
        "name": "純喫茶 テスト", "roman": "TEST", "est": "1965",
        "loc": "東京都", "desc": "説明", "tags": ["純喫茶"], "acquired": "1990年",
        "closed": None, "style": 0,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "純喫茶 テスト"
    assert "matchboxId" in data


@pytest.mark.asyncio
async def test_get_matchbox_api(auth_client):
    created = (await auth_client.post("/api/matchboxes", json={
        "name": "A", "roman": "A", "est": "", "loc": "", "desc": "",
        "tags": [], "acquired": "", "closed": None, "style": 0,
    })).json()
    resp = await auth_client.get(f"/api/matchboxes/{created['matchboxId']}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "A"


@pytest.mark.asyncio
async def test_get_matchbox_not_found_api(client):
    resp = await client.get("/api/matchboxes/nonexistent-id")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_my_matchboxes(auth_client):
    await auth_client.post("/api/matchboxes", json={
        "name": "A", "roman": "A", "est": "", "loc": "", "desc": "",
        "tags": [], "acquired": "", "closed": None, "style": 0,
    })
    resp = await auth_client.get("/api/matchboxes/mine")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["name"] == "A"


@pytest.mark.asyncio
async def test_update_matchbox_api(auth_client):
    created = (await auth_client.post("/api/matchboxes", json={
        "name": "Before", "roman": "B", "est": "", "loc": "", "desc": "",
        "tags": [], "acquired": "", "closed": None, "style": 0,
    })).json()
    resp = await auth_client.put(
        f"/api/matchboxes/{created['matchboxId']}",
        json={"name": "After"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "After"


@pytest.mark.asyncio
async def test_update_matchbox_forbidden(auth_client):
    created = (await auth_client.post("/api/matchboxes", json={
        "name": "Private", "roman": "P", "est": "", "loc": "", "desc": "",
        "tags": [], "acquired": "", "closed": None, "style": 0,
    })).json()
    # 認証なし（Authorization ヘッダーなし）で更新を試みる
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as unauth:
        resp = await unauth.put(f"/api/matchboxes/{created['matchboxId']}", json={"name": "Hacked"})
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_delete_matchbox_api(auth_client):
    created = (await auth_client.post("/api/matchboxes", json={
        "name": "ToDelete", "roman": "D", "est": "", "loc": "", "desc": "",
        "tags": [], "acquired": "", "closed": None, "style": 0,
    })).json()
    resp = await auth_client.delete(f"/api/matchboxes/{created['matchboxId']}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_image_urls_in_create_matchbox(auth_client):
    resp = await auth_client.post("/api/matchboxes", json={
        "name": "New", "roman": "N", "est": "", "loc": "", "desc": "",
        "tags": [], "acquired": "", "closed": None, "style": 0,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "imageUrls" in data
    assert len(data["imageUrls"]) == len(data["imageKeys"])


@pytest.mark.asyncio
async def test_image_urls_in_update_matchbox(auth_client):
    created = (await auth_client.post("/api/matchboxes", json={
        "name": "Before", "roman": "B", "est": "", "loc": "", "desc": "",
        "tags": [], "acquired": "", "closed": None, "style": 0,
    })).json()
    resp = await auth_client.put(
        f"/api/matchboxes/{created['matchboxId']}",
        json={"name": "After"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "imageUrls" in data
    assert len(data["imageUrls"]) == len(data["imageKeys"])


@pytest.mark.asyncio
async def test_image_urls_in_list_matchboxes(auth_client):
    await auth_client.post("/api/matchboxes", json={
        "name": "A", "roman": "A", "est": "", "loc": "", "desc": "",
        "tags": [], "acquired": "", "closed": None, "style": 0,
    })
    resp = await auth_client.get("/api/matchboxes")
    assert resp.status_code == 200
    for item in resp.json():
        assert "imageUrls" in item
        assert len(item["imageUrls"]) == len(item["imageKeys"])


@pytest.mark.asyncio
async def test_image_urls_in_get_matchbox(auth_client):
    created = (await auth_client.post("/api/matchboxes", json={
        "name": "B", "roman": "B", "est": "", "loc": "", "desc": "",
        "tags": [], "acquired": "", "closed": None, "style": 0,
    })).json()
    resp = await auth_client.get(f"/api/matchboxes/{created['matchboxId']}")
    assert resp.status_code == 200
    data = resp.json()
    assert "imageUrls" in data
    assert len(data["imageUrls"]) == len(data["imageKeys"])


@pytest.mark.asyncio
async def test_image_urls_in_list_my_matchboxes(auth_client):
    await auth_client.post("/api/matchboxes", json={
        "name": "C", "roman": "C", "est": "", "loc": "", "desc": "",
        "tags": [], "acquired": "", "closed": None, "style": 0,
    })
    resp = await auth_client.get("/api/matchboxes/mine")
    assert resp.status_code == 200
    for item in resp.json():
        assert "imageUrls" in item
        assert len(item["imageUrls"]) == len(item["imageKeys"])


@pytest.mark.asyncio
async def test_image_urls_contain_key(auth_client):
    """imageUrls の各URLがimageKeysの対応するキーを含むことを検証する（get・list・mine）。"""
    import io
    mb = (await auth_client.post("/api/matchboxes", json={
        "name": "URL Test", "roman": "UT", "est": "", "loc": "", "desc": "",
        "tags": [], "acquired": "", "closed": None, "style": 0,
    })).json()
    mb_id = mb["matchboxId"]

    fake = io.BytesIO(b"\xff\xd8\xff\xe0" + b"\x00" * 10)
    upload_resp = (await auth_client.post(
        f"/api/matchboxes/{mb_id}/images",
        files={"file": ("test.jpg", fake, "image/jpeg")},
    )).json()
    image_key = upload_resp["key"]

    # GET /matchboxes/{id}
    get_data = (await auth_client.get(f"/api/matchboxes/{mb_id}")).json()
    assert len(get_data["imageUrls"]) == 1
    assert image_key in get_data["imageUrls"][0]

    # GET /matchboxes
    list_data = (await auth_client.get("/api/matchboxes")).json()
    target = next(m for m in list_data if m["matchboxId"] == mb_id)
    assert len(target["imageUrls"]) == 1
    assert image_key in target["imageUrls"][0]

    # GET /matchboxes/mine
    mine_data = (await auth_client.get("/api/matchboxes/mine")).json()
    target_mine = next(m for m in mine_data if m["matchboxId"] == mb_id)
    assert len(target_mine["imageUrls"]) == 1
    assert image_key in target_mine["imageUrls"][0]
