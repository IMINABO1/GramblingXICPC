"""Tests for journals CRUD endpoints."""

import pytest
from httpx import AsyncClient


async def _add_member(client: AsyncClient, name: str = "TestUser") -> int:
    resp = await client.post("/api/team/", json={"name": name})
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_add_entry_creates_journal(client: AsyncClient):
    member_id = await _add_member(client)
    resp = await client.post(
        f"/api/journals/member/{member_id}/topic/dp_basic",
        json={"content": "Learned about knapsack today"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["member_id"] == member_id
    assert data["topic_id"] == "dp_basic"
    assert len(data["entries"]) == 1
    assert data["entries"][0]["content"] == "Learned about knapsack today"


@pytest.mark.asyncio
async def test_add_multiple_entries(client: AsyncClient):
    member_id = await _add_member(client)
    await client.post(
        f"/api/journals/member/{member_id}/topic/graphs",
        json={"content": "Entry 1"},
    )
    resp = await client.post(
        f"/api/journals/member/{member_id}/topic/graphs",
        json={"content": "Entry 2"},
    )
    assert resp.status_code == 200
    assert len(resp.json()["entries"]) == 2


@pytest.mark.asyncio
async def test_get_journal(client: AsyncClient):
    member_id = await _add_member(client)
    await client.post(
        f"/api/journals/member/{member_id}/topic/binary_search",
        json={"content": "Test entry"},
    )
    resp = await client.get(f"/api/journals/member/{member_id}/topic/binary_search")
    assert resp.status_code == 200
    assert resp.json()["topic_id"] == "binary_search"


@pytest.mark.asyncio
async def test_edit_entry(client: AsyncClient):
    member_id = await _add_member(client)
    create_resp = await client.post(
        f"/api/journals/member/{member_id}/topic/dp_basic",
        json={"content": "Original content"},
    )
    entry_id = create_resp.json()["entries"][0]["id"]

    resp = await client.put(
        f"/api/journals/member/{member_id}/topic/dp_basic/entry/{entry_id}",
        json={"content": "Updated content"},
    )
    assert resp.status_code == 200
    updated_entries = resp.json()["entries"]
    assert any(e["content"] == "Updated content" for e in updated_entries)


@pytest.mark.asyncio
async def test_delete_last_entry_removes_journal(client: AsyncClient):
    member_id = await _add_member(client)
    create_resp = await client.post(
        f"/api/journals/member/{member_id}/topic/trees",
        json={"content": "Only entry"},
    )
    entry_id = create_resp.json()["entries"][0]["id"]

    resp = await client.delete(
        f"/api/journals/member/{member_id}/topic/trees/entry/{entry_id}"
    )
    assert resp.status_code == 200

    # Journal should be gone
    resp = await client.get(f"/api/journals/member/{member_id}/topic/trees")
    assert resp.json() is None


@pytest.mark.asyncio
async def test_custom_topics_crud(client: AsyncClient):
    # Create
    resp = await client.post("/api/journals/topics", json={
        "name": "Contest Strategy",
        "icon": "🎯",
        "created_by": 0,
    })
    assert resp.status_code == 200
    topic_id = resp.json()["id"]
    assert resp.json()["name"] == "Contest Strategy"

    # List
    resp = await client.get("/api/journals/topics")
    assert len(resp.json()) == 1

    # Duplicate rejected
    resp = await client.post("/api/journals/topics", json={
        "name": "contest strategy",  # case insensitive
        "created_by": 0,
    })
    assert resp.status_code == 409

    # Delete
    resp = await client.delete(f"/api/journals/topics/{topic_id}")
    assert resp.status_code == 200

    resp = await client.get("/api/journals/topics")
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_member_journals(client: AsyncClient):
    member_id = await _add_member(client)
    await client.post(
        f"/api/journals/member/{member_id}/topic/dp_basic",
        json={"content": "DP notes"},
    )
    await client.post(
        f"/api/journals/member/{member_id}/topic/graphs",
        json={"content": "Graph notes"},
    )

    resp = await client.get(f"/api/journals/member/{member_id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_search_journals(client: AsyncClient):
    member_id = await _add_member(client)
    await client.post(
        f"/api/journals/member/{member_id}/topic/dp_basic",
        json={"content": "Learned about knapsack optimization"},
    )
    await client.post(
        f"/api/journals/member/{member_id}/topic/graphs",
        json={"content": "BFS traversal practice"},
    )

    resp = await client.get("/api/journals/search?q=knapsack")
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) >= 1
    assert any("knapsack" in r["content"] for r in results)
