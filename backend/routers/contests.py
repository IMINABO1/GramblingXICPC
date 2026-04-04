"""Contests router — virtual contest tracking and trends."""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

import db_ops
from database import get_db

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class TeamEntry(BaseModel):
    label: str
    member_ids: list[int]


class ProblemResult(BaseModel):
    problem_index: str
    problem_name: str
    solved_by_team: str | None = None
    solve_time_minutes: int | None = None


class ContestCreate(BaseModel):
    cf_contest_id: int
    contest_name: str
    date: str
    duration_minutes: int
    teams: list[TeamEntry]
    results: list[ProblemResult]
    notes: str = ""


class ContestUpdate(BaseModel):
    contest_name: str | None = None
    date: str | None = None
    duration_minutes: int | None = None
    teams: list[TeamEntry] | None = None
    results: list[ProblemResult] | None = None
    notes: str | None = None


class ContestResponse(BaseModel):
    id: str
    cf_contest_id: int
    contest_name: str
    date: str
    duration_minutes: int
    teams: list[TeamEntry]
    results: list[ProblemResult]
    notes: str
    created_at: str
    total_problems: int
    solved_count: int
    solve_counts_by_team: dict[str, int]


class TrendPoint(BaseModel):
    contest_id: str
    date: str
    contest_name: str
    total_problems: int
    solved_count: int
    solve_counts_by_team: dict[str, int]
    avg_solve_time_minutes: float | None
    avg_solve_times_by_team: dict[str, float]


class TrendsResponse(BaseModel):
    points: list[TrendPoint]
    overall_avg_solves: float
    overall_avg_time: float | None
    recent_avg_solves: float
    recent_avg_time: float | None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _to_response(c_dict: dict[str, Any]) -> ContestResponse:
    results = c_dict.get("results", [])
    solved = [r for r in results if r.get("solved_by_team")]
    counts_by_team: dict[str, int] = {}
    for r in solved:
        team = r["solved_by_team"]
        counts_by_team[team] = counts_by_team.get(team, 0) + 1
    return ContestResponse(
        id=c_dict["id"],
        cf_contest_id=c_dict["cf_contest_id"],
        contest_name=c_dict["contest_name"],
        date=c_dict["date"],
        duration_minutes=c_dict["duration_minutes"],
        teams=[TeamEntry(**t) for t in c_dict["teams"]],
        results=[ProblemResult(**r) for r in results],
        notes=c_dict.get("notes", ""),
        created_at=c_dict["created_at"],
        total_problems=len(results),
        solved_count=len(solved),
        solve_counts_by_team=counts_by_team,
    )


# ---------------------------------------------------------------------------
# Endpoints — /trends MUST come before /{contest_id}
# ---------------------------------------------------------------------------


@router.get("/")
async def list_contests(db: AsyncSession = Depends(get_db)) -> list[ContestResponse]:
    """List all virtual contests, sorted by date descending."""
    contests = await db_ops.get_all_contests(db)
    result = [_to_response(db_ops.contest_to_dict(c)) for c in contests]
    result.sort(key=lambda c: c.date, reverse=True)
    return result


@router.get("/trends")
async def get_trends(db: AsyncSession = Depends(get_db)) -> TrendsResponse:
    """Aggregated trend data across all virtual contests."""
    contests = await db_ops.get_all_contests(db)
    sorted_contests = sorted(
        [db_ops.contest_to_dict(c) for c in contests],
        key=lambda c: c["date"],
    )

    points: list[TrendPoint] = []
    for c in sorted_contests:
        results = c.get("results", [])
        solved = [r for r in results if r.get("solved_by_team")]
        counts_by_team: dict[str, int] = {}
        times_by_team: dict[str, list[int]] = {}
        all_times: list[int] = []

        for r in solved:
            team = r["solved_by_team"]
            counts_by_team[team] = counts_by_team.get(team, 0) + 1
            if r.get("solve_time_minutes") is not None:
                times_by_team.setdefault(team, []).append(r["solve_time_minutes"])
                all_times.append(r["solve_time_minutes"])

        avg_time = sum(all_times) / len(all_times) if all_times else None
        avg_times_by_team = {
            t: sum(ts) / len(ts) for t, ts in times_by_team.items()
        }

        points.append(TrendPoint(
            contest_id=c["id"],
            date=c["date"],
            contest_name=c["contest_name"],
            total_problems=len(results),
            solved_count=len(solved),
            solve_counts_by_team=counts_by_team,
            avg_solve_time_minutes=avg_time,
            avg_solve_times_by_team=avg_times_by_team,
        ))

    all_solves = [p.solved_count for p in points]
    all_avg_times = [p.avg_solve_time_minutes for p in points if p.avg_solve_time_minutes is not None]
    recent = points[-5:] if len(points) >= 5 else points
    recent_solves = [p.solved_count for p in recent]
    recent_times = [p.avg_solve_time_minutes for p in recent if p.avg_solve_time_minutes is not None]

    return TrendsResponse(
        points=points,
        overall_avg_solves=sum(all_solves) / len(all_solves) if all_solves else 0,
        overall_avg_time=sum(all_avg_times) / len(all_avg_times) if all_avg_times else None,
        recent_avg_solves=sum(recent_solves) / len(recent_solves) if recent_solves else 0,
        recent_avg_time=sum(recent_times) / len(recent_times) if recent_times else None,
    )


@router.get("/{contest_id}")
async def get_contest(contest_id: str, db: AsyncSession = Depends(get_db)) -> ContestResponse:
    """Get a single contest's full details."""
    contest = await db_ops.get_contest(db, contest_id)
    if not contest:
        raise HTTPException(status_code=404, detail=f"Contest {contest_id} not found")
    return _to_response(db_ops.contest_to_dict(contest))


@router.post("/")
async def create_contest(body: ContestCreate, db: AsyncSession = Depends(get_db)) -> ContestResponse:
    """Log a new virtual contest."""
    now = datetime.now(timezone.utc).isoformat()
    contest = await db_ops.create_contest(
        db,
        cf_contest_id=body.cf_contest_id,
        contest_name=body.contest_name,
        date=body.date,
        duration_minutes=body.duration_minutes,
        teams=[t.model_dump() for t in body.teams],
        results=[r.model_dump() for r in body.results],
        notes=body.notes,
        created_at=now,
    )
    return _to_response(db_ops.contest_to_dict(contest))


@router.put("/{contest_id}")
async def update_contest(
    contest_id: str, body: ContestUpdate, db: AsyncSession = Depends(get_db)
) -> ContestResponse:
    """Update a virtual contest entry."""
    contest = await db_ops.get_contest(db, contest_id)
    if not contest:
        raise HTTPException(status_code=404, detail=f"Contest {contest_id} not found")

    updates: dict[str, Any] = {}
    if body.contest_name is not None:
        updates["contest_name"] = body.contest_name
    if body.date is not None:
        updates["date"] = body.date
    if body.duration_minutes is not None:
        updates["duration_minutes"] = body.duration_minutes
    if body.teams is not None:
        updates["teams"] = [t.model_dump() for t in body.teams]
    if body.results is not None:
        updates["results"] = [r.model_dump() for r in body.results]
    if body.notes is not None:
        updates["notes"] = body.notes

    contest = await db_ops.update_contest(db, contest, **updates)
    return _to_response(db_ops.contest_to_dict(contest))


@router.delete("/{contest_id}")
async def delete_contest(contest_id: str, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Delete a virtual contest entry."""
    deleted = await db_ops.delete_contest(db, contest_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Contest {contest_id} not found")
    return {"status": "deleted", "id": contest_id}
