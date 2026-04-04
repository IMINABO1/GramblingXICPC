"""Tests for tags CRUD endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_tag(client: AsyncClient):
    resp = await client.post("/api/tags/", json={
        "name": "dp-trick",
        "color": "#ff0000",
        "created_by": 0,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "dp-trick"
    assert data["color"] == "#ff0000"
    assert data["problem_count"] == 0


@pytest.mark.asyncio
async def test_duplicate_tag_rejected(client: AsyncClient):
    await client.post("/api/tags/", json={"name": "greedy", "created_by": 0})
    resp = await client.post("/api/tags/", json={"name": "Greedy", "created_by": 0})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_list_tags(client: AsyncClient):
    await client.post("/api/tags/", json={"name": "math", "created_by": 0})
    await client.post("/api/tags/", json={"name": "graphs", "created_by": 0})
    resp = await client.get("/api/tags/")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_update_tag(client: AsyncClient):
    create_resp = await client.post("/api/tags/", json={"name": "old-name", "created_by": 0})
    tag_id = create_resp.json()["id"]

    resp = await client.put(f"/api/tags/{tag_id}", json={"name": "new-name"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "new-name"


@pytest.mark.asyncio
async def test_add_problem_tags(client: AsyncClient):
    create_resp = await client.post("/api/tags/", json={"name": "binary-search", "created_by": 0})
    tag_id = create_resp.json()["id"]

    resp = await client.post("/api/tags/problem/1352C", json={"tag_ids": [tag_id]})
    assert resp.status_code == 200
    assert resp.json()["tag_count"] == 1


@pytest.mark.asyncio
async def test_remove_problem_tag(client: AsyncClient):
    create_resp = await client.post("/api/tags/", json={"name": "strings", "created_by": 0})
    tag_id = create_resp.json()["id"]

    await client.post("/api/tags/problem/455A", json={"tag_ids": [tag_id]})
    resp = await client.delete(f"/api/tags/problem/455A/{tag_id}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "removed"


@pytest.mark.asyncio
async def test_delete_tag_cascades(client: AsyncClient):
    create_resp = await client.post("/api/tags/", json={"name": "temp-tag", "created_by": 0})
    tag_id = create_resp.json()["id"]

    await client.post("/api/tags/problem/100A", json={"tag_ids": [tag_id]})

    resp = await client.delete(f"/api/tags/{tag_id}")
    assert resp.status_code == 200

    # Problem should have no tags now
    resp = await client.get("/api/tags/problem/100A")
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_problems_by_tag(client: AsyncClient):
    create_resp = await client.post("/api/tags/", json={"name": "impl", "created_by": 0})
    tag_id = create_resp.json()["id"]

    await client.post("/api/tags/problem/1A", json={"tag_ids": [tag_id]})
    await client.post("/api/tags/problem/2B", json={"tag_ids": [tag_id]})

    resp = await client.get(f"/api/tags/by-tag/{tag_id}")
    assert resp.status_code == 200
    assert sorted(resp.json()) == ["1A", "2B"]
