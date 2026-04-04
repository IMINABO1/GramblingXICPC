"""Tests for contest CRUD endpoints."""

import pytest
from httpx import AsyncClient

SAMPLE_CONTEST = {
    "cf_contest_id": 1900,
    "contest_name": "Codeforces Round 900",
    "date": "2024-03-15",
    "duration_minutes": 120,
    "teams": [
        {"label": "Team A", "member_ids": [0, 1, 2]},
        {"label": "Team B", "member_ids": [3, 4, 5]},
    ],
    "results": [
        {"problem_index": "A", "problem_name": "Easy Problem", "solved_by_team": "Team A", "solve_time_minutes": 5},
        {"problem_index": "B", "problem_name": "Medium Problem", "solved_by_team": "Team B", "solve_time_minutes": 30},
        {"problem_index": "C", "problem_name": "Hard Problem", "solved_by_team": None, "solve_time_minutes": None},
    ],
    "notes": "Good practice round",
}


@pytest.mark.asyncio
async def test_create_contest(client: AsyncClient):
    resp = await client.post("/api/contests/", json=SAMPLE_CONTEST)
    assert resp.status_code == 200
    data = resp.json()
    assert data["contest_name"] == "Codeforces Round 900"
    assert data["total_problems"] == 3
    assert data["solved_count"] == 2
    assert data["solve_counts_by_team"]["Team A"] == 1
    assert data["solve_counts_by_team"]["Team B"] == 1
    assert "id" in data


@pytest.mark.asyncio
async def test_list_contests(client: AsyncClient):
    await client.post("/api/contests/", json=SAMPLE_CONTEST)
    resp = await client.get("/api/contests/")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_update_contest(client: AsyncClient):
    create_resp = await client.post("/api/contests/", json=SAMPLE_CONTEST)
    contest_id = create_resp.json()["id"]

    resp = await client.put(f"/api/contests/{contest_id}", json={
        "contest_name": "Updated Name",
        "notes": "Updated notes",
    })
    assert resp.status_code == 200
    assert resp.json()["contest_name"] == "Updated Name"
    assert resp.json()["notes"] == "Updated notes"


@pytest.mark.asyncio
async def test_delete_contest(client: AsyncClient):
    create_resp = await client.post("/api/contests/", json=SAMPLE_CONTEST)
    contest_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/contests/{contest_id}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "deleted"

    resp = await client.get("/api/contests/")
    assert resp.json() == []


@pytest.mark.asyncio
async def test_delete_contest_not_found(client: AsyncClient):
    resp = await client.delete("/api/contests/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_trends_empty(client: AsyncClient):
    resp = await client.get("/api/contests/trends")
    assert resp.status_code == 200
    data = resp.json()
    assert data["points"] == []
    assert data["overall_avg_solves"] == 0


@pytest.mark.asyncio
async def test_get_trends_with_data(client: AsyncClient):
    await client.post("/api/contests/", json=SAMPLE_CONTEST)
    resp = await client.get("/api/contests/trends")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["points"]) == 1
    assert data["points"][0]["solved_count"] == 2
