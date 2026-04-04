"""Tests for notes CRUD endpoints."""

import pytest
from httpx import AsyncClient


async def _add_member(client: AsyncClient, name: str = "TestUser") -> int:
    resp = await client.post("/api/team/", json={"name": name})
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_save_note(client: AsyncClient):
    member_id = await _add_member(client)
    resp = await client.post("/api/notes/", json={
        "member_id": member_id,
        "problem_id": "1352C",
        "content": "Used BFS approach, watch for edge cases",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["member_id"] == member_id
    assert data["problem_id"] == "1352C"
    assert "BFS" in data["content"]
    assert "id" in data


@pytest.mark.asyncio
async def test_upsert_note(client: AsyncClient):
    member_id = await _add_member(client)
    # Create
    await client.post("/api/notes/", json={
        "member_id": member_id,
        "problem_id": "455A",
        "content": "First attempt",
    })
    # Update
    resp = await client.post("/api/notes/", json={
        "member_id": member_id,
        "problem_id": "455A",
        "content": "Revised approach using DP",
    })
    assert resp.status_code == 200
    assert resp.json()["content"] == "Revised approach using DP"

    # Should still be just one note
    resp = await client.get(f"/api/notes/member/{member_id}")
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_get_member_notes(client: AsyncClient):
    member_id = await _add_member(client)
    await client.post("/api/notes/", json={
        "member_id": member_id, "problem_id": "1A", "content": "Note 1"
    })
    await client.post("/api/notes/", json={
        "member_id": member_id, "problem_id": "2B", "content": "Note 2"
    })

    resp = await client.get(f"/api/notes/member/{member_id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_delete_note(client: AsyncClient):
    member_id = await _add_member(client)
    create_resp = await client.post("/api/notes/", json={
        "member_id": member_id, "problem_id": "100A", "content": "Will delete"
    })
    note_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/notes/{note_id}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "deleted"

    resp = await client.get(f"/api/notes/member/{member_id}")
    assert resp.json() == []


@pytest.mark.asyncio
async def test_delete_note_not_found(client: AsyncClient):
    resp = await client.delete("/api/notes/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_member_problem_note(client: AsyncClient):
    member_id = await _add_member(client)
    await client.post("/api/notes/", json={
        "member_id": member_id, "problem_id": "500C", "content": "Specific note"
    })

    resp = await client.get(f"/api/notes/member/{member_id}/problem/500C")
    assert resp.status_code == 200
    assert resp.json()["content"] == "Specific note"


@pytest.mark.asyncio
async def test_get_member_problem_note_not_found(client: AsyncClient):
    member_id = await _add_member(client)
    resp = await client.get(f"/api/notes/member/{member_id}/problem/nonexistent")
    assert resp.status_code == 200
    assert resp.json() is None
