"""Tests verifying data survives across database sessions."""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

import db_ops
from database import get_db
from main import app
from tests.conftest import TestSessionLocal, test_engine
from database import Base


@pytest.mark.asyncio
async def test_data_survives_new_session():
    """Create data in one session, read it back in a fresh session."""
    # Setup
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        # Session 1: Create data
        async with TestSessionLocal() as session1:
            member = await db_ops.create_member(session1, name="Persisted User", cf_handle="test_cf")
            member_id = member.id

            await db_ops.upsert_note(session1, member_id, "100A", "This should persist")

        # Session 2: Verify data
        async with TestSessionLocal() as session2:
            member = await db_ops.get_member(session2, member_id)
            assert member is not None
            assert member.name == "Persisted User"
            assert member.cf_handle == "test_cf"

            notes = await db_ops.get_member_notes(session2, member_id)
            assert len(notes) == 1
            assert notes[0].content == "This should persist"
    finally:
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_member_solved_problems_persist():
    """Simulate a sync and verify solved problems are stored correctly."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        # Session 1: Create member and sync solved problems
        async with TestSessionLocal() as session1:
            member = await db_ops.create_member(session1, name="Solver")
            member_id = member.id

            await db_ops.sync_member_solved(
                session1,
                member_id,
                all_accepted=["100A", "200B", "300C"],
                curated_ids={"100A", "300C"},
                timestamps={"100A": 1700000000, "200B": 1700001000, "300C": 1700002000},
                solve_quality_data={
                    "100A": {"classification": "clean", "wrong_attempts": 0, "time_to_solve_hrs": None, "weight": 1.0},
                    "200B": {"classification": "struggled", "wrong_attempts": 3, "time_to_solve_hrs": 2.5, "weight": 1.0},
                },
            )

        # Session 2: Verify data
        async with TestSessionLocal() as session2:
            curated = await db_ops.get_member_solved_curated(session2, member_id)
            assert sorted(curated) == ["100A", "300C"]

            all_accepted = await db_ops.get_member_all_accepted(session2, member_id)
            assert sorted(all_accepted) == ["100A", "200B", "300C"]

            timestamps = await db_ops.get_member_timestamps(session2, member_id)
            assert timestamps["100A"] == 1700000000
            assert timestamps["300C"] == 1700002000

            sq = await db_ops.get_member_solve_quality(session2, member_id)
            assert sq["100A"]["classification"] == "clean"
            assert sq["200B"]["wrong_attempts"] == 3
    finally:
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_contest_persists_across_sessions():
    """Create a contest in one session, verify in another."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with TestSessionLocal() as session1:
            contest = await db_ops.create_contest(
                session1,
                cf_contest_id=1900,
                contest_name="Test Round",
                date="2024-01-15",
                duration_minutes=120,
                teams=[{"label": "A", "member_ids": [0, 1]}],
                results=[{"problem_index": "A", "problem_name": "Easy", "solved_by_team": "A", "solve_time_minutes": 10}],
                notes="Test",
                created_at="2024-01-15T00:00:00Z",
            )
            contest_id = contest.id

        async with TestSessionLocal() as session2:
            contest = await db_ops.get_contest(session2, contest_id)
            assert contest is not None
            assert contest.contest_name == "Test Round"
            assert contest.teams[0]["label"] == "A"
            assert contest.results[0]["problem_name"] == "Easy"
    finally:
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
