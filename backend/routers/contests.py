"""Contests router — virtual contest tracking and trends."""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

DATA_DIR = Path(__file__).parent.parent / "data"
CONTESTS_FILE = DATA_DIR / "contests.json"

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


def load_contests() -> dict[str, Any]:
    if not CONTESTS_FILE.exists():
        return {"contests": []}
    with open(CONTESTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_contests(data: dict[str, Any]) -> None:
    with open(CONTESTS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _find_contest(data: dict[str, Any], contest_id: str) -> dict[str, Any]:
    for c in data["contests"]:
        if c["id"] == contest_id:
            return c
    raise HTTPException(status_code=404, detail=f"Contest {contest_id} not found")


def _to_response(c: dict[str, Any]) -> ContestResponse:
    results = c.get("results", [])
    solved = [r for r in results if r.get("solved_by_team")]
    counts_by_team: dict[str, int] = {}
    for r in solved:
        team = r["solved_by_team"]
        counts_by_team[team] = counts_by_team.get(team, 0) + 1
    return ContestResponse(
        id=c["id"],
        cf_contest_id=c["cf_contest_id"],
        contest_name=c["contest_name"],
        date=c["date"],
        duration_minutes=c["duration_minutes"],
        teams=[TeamEntry(**t) for t in c["teams"]],
        results=[ProblemResult(**r) for r in results],
        notes=c.get("notes", ""),
        created_at=c["created_at"],
        total_problems=len(results),
        solved_count=len(solved),
        solve_counts_by_team=counts_by_team,
    )


# ---------------------------------------------------------------------------
# Endpoints — /trends MUST come before /{contest_id}
# ---------------------------------------------------------------------------


@router.get("/")
async def list_contests() -> list[ContestResponse]:
    """List all virtual contests, sorted by date descending."""
    data = load_contests()
    contests = [_to_response(c) for c in data["contests"]]
    contests.sort(key=lambda c: c.date, reverse=True)
    return contests


@router.get("/trends")
async def get_trends() -> TrendsResponse:
    """Aggregated trend data across all virtual contests."""
    data = load_contests()
    sorted_contests = sorted(data["contests"], key=lambda c: c["date"])

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
async def get_contest(contest_id: str) -> ContestResponse:
    """Get a single contest's full details."""
    data = load_contests()
    c = _find_contest(data, contest_id)
    return _to_response(c)


@router.post("/")
async def create_contest(body: ContestCreate) -> ContestResponse:
    """Log a new virtual contest."""
    data = load_contests()
    now = datetime.now(timezone.utc).isoformat()
    entry = {
        "id": uuid.uuid4().hex[:8],
        "cf_contest_id": body.cf_contest_id,
        "contest_name": body.contest_name,
        "date": body.date,
        "duration_minutes": body.duration_minutes,
        "teams": [t.model_dump() for t in body.teams],
        "results": [r.model_dump() for r in body.results],
        "notes": body.notes,
        "created_at": now,
    }
    data["contests"].append(entry)
    save_contests(data)
    return _to_response(entry)


@router.put("/{contest_id}")
async def update_contest(contest_id: str, body: ContestUpdate) -> ContestResponse:
    """Update a virtual contest entry."""
    data = load_contests()
    c = _find_contest(data, contest_id)
    if body.contest_name is not None:
        c["contest_name"] = body.contest_name
    if body.date is not None:
        c["date"] = body.date
    if body.duration_minutes is not None:
        c["duration_minutes"] = body.duration_minutes
    if body.teams is not None:
        c["teams"] = [t.model_dump() for t in body.teams]
    if body.results is not None:
        c["results"] = [r.model_dump() for r in body.results]
    if body.notes is not None:
        c["notes"] = body.notes
    save_contests(data)
    return _to_response(c)


@router.delete("/{contest_id}")
async def delete_contest(contest_id: str) -> dict[str, str]:
    """Delete a virtual contest entry."""
    data = load_contests()
    before = len(data["contests"])
    data["contests"] = [c for c in data["contests"] if c["id"] != contest_id]
    if len(data["contests"]) == before:
        raise HTTPException(status_code=404, detail=f"Contest {contest_id} not found")
    save_contests(data)
    return {"status": "deleted", "id": contest_id}
