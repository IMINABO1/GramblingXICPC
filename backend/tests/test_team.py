"""Tests for team member CRUD endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_members_empty(client: AsyncClient):
    resp = await client.get("/api/team/")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_add_member(client: AsyncClient):
    resp = await client.post("/api/team/", json={
        "name": "Alice",
        "cf_handle": "alice_cf",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Alice"
    assert data["cf_handle"] == "alice_cf"
    assert data["active"] is True
    assert data["solved_curated"] == []
    assert data["solved_count"] == 0


@pytest.mark.asyncio
async def test_get_member(client: AsyncClient):
    await client.post("/api/team/", json={"name": "Bob"})
    resp = await client.get("/api/team/0")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Bob"


@pytest.mark.asyncio
async def test_get_member_not_found(client: AsyncClient):
    resp = await client.get("/api/team/999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_member(client: AsyncClient):
    await client.post("/api/team/", json={"name": "Charlie"})
    resp = await client.put("/api/team/0", json={"name": "Charles", "cf_handle": "charles_cf"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Charles"
    assert data["cf_handle"] == "charles_cf"


@pytest.mark.asyncio
async def test_toggle_active(client: AsyncClient):
    await client.post("/api/team/", json={"name": "Dana"})
    resp = await client.patch("/api/team/0/active", json={"active": False})
    assert resp.status_code == 200
    assert resp.json()["active"] is False

    resp = await client.patch("/api/team/0/active", json={"active": True})
    assert resp.json()["active"] is True


@pytest.mark.asyncio
async def test_remove_member(client: AsyncClient):
    await client.post("/api/team/", json={"name": "Eve"})
    resp = await client.delete("/api/team/0")
    assert resp.status_code == 200
    assert resp.json()["status"] == "removed"

    resp = await client.get("/api/team/")
    assert resp.json() == []


@pytest.mark.asyncio
async def test_remove_member_not_found(client: AsyncClient):
    resp = await client.delete("/api/team/999")
    assert resp.status_code == 404
