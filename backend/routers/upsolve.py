"""Upsolve router — derived queue from virtual contests + team solve data."""

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


async def _build_queue(db: AsyncSession) -> list[UpsolveContestGroup]:
    """Build the full upsolve queue from contests + team data."""
    contests = await db_ops.get_all_contests(db)
    members = await db_ops.get_all_members(db)

    # Build member lookup: id -> {name, accepted_set}
    member_lookup: dict[int, dict[str, Any]] = {}
    for m in members:
        m_dict = db_ops.member_to_dict(m)
        member_lookup[m.id] = {
            "name": m.name,
            "accepted": set(m_dict.get("all_accepted", [])),
        }

    groups: list[UpsolveContestGroup] = []

    for contest_obj in contests:
        contest = db_ops.contest_to_dict(contest_obj)
        cf_contest_id = contest["cf_contest_id"]
        dismissed_set = set(contest.get("dismissed_problems", []))

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

    groups.sort(key=lambda g: g.contest_date, reverse=True)
    return groups


# ---------------------------------------------------------------------------
# Endpoints — /stats MUST come before /{...} style routes
# ---------------------------------------------------------------------------


@router.get("/")
async def get_upsolve_queue(db: AsyncSession = Depends(get_db)) -> UpsolveQueueResponse:
    """Full upsolve queue grouped by contest."""
    groups = await _build_queue(db)
    total = sum(g.total_items for g in groups)
    solved = sum(g.total_solved for g in groups)
    return UpsolveQueueResponse(
        contests=groups,
        total_items=total,
        total_solved=solved,
        total_pending=total - solved,
    )


@router.get("/stats")
async def get_upsolve_stats(db: AsyncSession = Depends(get_db)) -> UpsolveStatsResponse:
    """Aggregated upsolve statistics."""
    groups = await _build_queue(db)

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
async def dismiss_problem(body: DismissRequest, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Mark a problem as dismissed from the upsolve queue."""
    contest = await db_ops.dismiss_contest_problem(db, body.contest_id, body.problem_index)
    if contest is None:
        raise HTTPException(status_code=404, detail=f"Contest {body.contest_id} not found")
    return {"status": "dismissed"}


@router.post("/undismiss")
async def undismiss_problem(body: DismissRequest, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Remove a problem from the dismissed list."""
    contest = await db_ops.undismiss_contest_problem(db, body.contest_id, body.problem_index)
    if contest is None:
        raise HTTPException(status_code=404, detail=f"Contest {body.contest_id} not found")
    return {"status": "undismissed"}
