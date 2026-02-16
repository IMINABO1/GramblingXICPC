"""Upsolve router — derived queue from virtual contests + team solve data."""

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .contests import load_contests, save_contests

DATA_DIR = Path(__file__).parent.parent / "data"
TEAM_FILE = DATA_DIR / "team.json"

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _load_team() -> dict[str, Any]:
    with open(TEAM_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class MemberUpsolveStatus(BaseModel):
    member_id: int
    member_name: str
    has_solved: bool


class UpsolveItem(BaseModel):
    contest_id: str
    cf_contest_id: int
    contest_name: str
    contest_date: str
    problem_index: str
    problem_name: str
    problem_cf_id: str
    cf_url: str
    solved_during_contest: bool
    solved_by_team: str | None
    member_statuses: list[MemberUpsolveStatus]
    pending_count: int
    dismissed: bool


class UpsolveContestGroup(BaseModel):
    contest_id: str
    cf_contest_id: int
    contest_name: str
    contest_date: str
    items: list[UpsolveItem]
    total_items: int
    total_solved: int
    total_pending: int


class UpsolveQueueResponse(BaseModel):
    contests: list[UpsolveContestGroup]
    total_items: int
    total_solved: int
    total_pending: int


class MemberUpsolveStatsEntry(BaseModel):
    member_id: int
    member_name: str
    total: int
    solved: int
    pending: int


class ContestUpsolveStatsEntry(BaseModel):
    contest_id: str
    contest_name: str
    total: int
    solved: int
    pct: float


class UpsolveStatsResponse(BaseModel):
    total_items: int
    total_solved: int
    total_pending: int
    completion_pct: float
    per_member: list[MemberUpsolveStatsEntry]
    per_contest: list[ContestUpsolveStatsEntry]


class DismissRequest(BaseModel):
    contest_id: str
    problem_index: str


# ---------------------------------------------------------------------------
# Core computation
# ---------------------------------------------------------------------------


def _build_queue() -> list[UpsolveContestGroup]:
    """Build the full upsolve queue from contests + team data."""
    contests_data = load_contests()
    team_data = _load_team()

    # Build member lookup: id → {name, accepted_set}
    member_lookup: dict[int, dict[str, Any]] = {}
    for m in team_data["members"]:
        member_lookup[m["id"]] = {
            "name": m["name"],
            "accepted": set(m.get("all_accepted", [])),
        }

    groups: list[UpsolveContestGroup] = []

    for contest in contests_data["contests"]:
        cf_contest_id = contest["cf_contest_id"]
        dismissed_set = set(contest.get("dismissed_problems", []))

        # Collect participating member IDs
        participant_ids: list[int] = []
        seen_ids: set[int] = set()
        for team in contest.get("teams", []):
            for mid in team.get("member_ids", []):
                if mid not in seen_ids:
                    participant_ids.append(mid)
                    seen_ids.add(mid)

        if not participant_ids:
            continue

        items: list[UpsolveItem] = []
        group_total = 0
        group_solved = 0

        for result in contest.get("results", []):
            problem_index = result["problem_index"]
            problem_cf_id = f"{cf_contest_id}{problem_index}"
            cf_url = f"https://codeforces.com/contest/{cf_contest_id}/problem/{problem_index}"
            solved_during = result.get("solved_by_team") is not None

            statuses: list[MemberUpsolveStatus] = []
            pending = 0
            solved = 0

            for mid in participant_ids:
                info = member_lookup.get(mid)
                if info is None:
                    continue
                has_solved = problem_cf_id in info["accepted"]
                statuses.append(MemberUpsolveStatus(
                    member_id=mid,
                    member_name=info["name"],
                    has_solved=has_solved,
                ))
                if has_solved:
                    solved += 1
                else:
                    pending += 1

            group_total += len(statuses)
            group_solved += solved

            items.append(UpsolveItem(
                contest_id=contest["id"],
                cf_contest_id=cf_contest_id,
                contest_name=contest["contest_name"],
                contest_date=contest["date"],
                problem_index=problem_index,
                problem_name=result["problem_name"],
                problem_cf_id=problem_cf_id,
                cf_url=cf_url,
                solved_during_contest=solved_during,
                solved_by_team=result.get("solved_by_team"),
                member_statuses=statuses,
                pending_count=pending,
                dismissed=problem_index in dismissed_set,
            ))

        groups.append(UpsolveContestGroup(
            contest_id=contest["id"],
            cf_contest_id=cf_contest_id,
            contest_name=contest["contest_name"],
            contest_date=contest["date"],
            items=items,
            total_items=group_total,
            total_solved=group_solved,
            total_pending=group_total - group_solved,
        ))

    # Sort by date descending
    groups.sort(key=lambda g: g.contest_date, reverse=True)
    return groups


# ---------------------------------------------------------------------------
# Endpoints — /stats MUST come before /{...} style routes
# ---------------------------------------------------------------------------


@router.get("/")
async def get_upsolve_queue() -> UpsolveQueueResponse:
    """Full upsolve queue grouped by contest."""
    groups = _build_queue()
    total = sum(g.total_items for g in groups)
    solved = sum(g.total_solved for g in groups)
    return UpsolveQueueResponse(
        contests=groups,
        total_items=total,
        total_solved=solved,
        total_pending=total - solved,
    )


@router.get("/stats")
async def get_upsolve_stats() -> UpsolveStatsResponse:
    """Aggregated upsolve statistics."""
    groups = _build_queue()

    total = 0
    solved = 0
    member_agg: dict[int, dict[str, Any]] = {}
    contest_stats: list[ContestUpsolveStatsEntry] = []

    for g in groups:
        total += g.total_items
        solved += g.total_solved

        contest_stats.append(ContestUpsolveStatsEntry(
            contest_id=g.contest_id,
            contest_name=g.contest_name,
            total=g.total_items,
            solved=g.total_solved,
            pct=round(g.total_solved / g.total_items * 100, 1) if g.total_items > 0 else 0,
        ))

        for item in g.items:
            for ms in item.member_statuses:
                if ms.member_id not in member_agg:
                    member_agg[ms.member_id] = {
                        "name": ms.member_name,
                        "total": 0,
                        "solved": 0,
                    }
                member_agg[ms.member_id]["total"] += 1
                if ms.has_solved:
                    member_agg[ms.member_id]["solved"] += 1

    per_member = [
        MemberUpsolveStatsEntry(
            member_id=mid,
            member_name=info["name"],
            total=info["total"],
            solved=info["solved"],
            pending=info["total"] - info["solved"],
        )
        for mid, info in sorted(member_agg.items())
    ]

    return UpsolveStatsResponse(
        total_items=total,
        total_solved=solved,
        total_pending=total - solved,
        completion_pct=round(solved / total * 100, 1) if total > 0 else 0,
        per_member=per_member,
        per_contest=contest_stats,
    )


@router.post("/dismiss")
async def dismiss_problem(body: DismissRequest) -> dict[str, str]:
    """Mark a problem as dismissed from the upsolve queue."""
    data = load_contests()
    for c in data["contests"]:
        if c["id"] == body.contest_id:
            dismissed = c.setdefault("dismissed_problems", [])
            if body.problem_index not in dismissed:
                dismissed.append(body.problem_index)
            save_contests(data)
            return {"status": "dismissed"}
    raise HTTPException(status_code=404, detail=f"Contest {body.contest_id} not found")


@router.post("/undismiss")
async def undismiss_problem(body: DismissRequest) -> dict[str, str]:
    """Remove a problem from the dismissed list."""
    data = load_contests()
    for c in data["contests"]:
        if c["id"] == body.contest_id:
            dismissed = c.get("dismissed_problems", [])
            if body.problem_index in dismissed:
                dismissed.remove(body.problem_index)
                c["dismissed_problems"] = dismissed
            save_contests(data)
            return {"status": "undismissed"}
    raise HTTPException(status_code=404, detail=f"Contest {body.contest_id} not found")
