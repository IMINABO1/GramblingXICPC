"""Team router — team member management and CF handle sync."""

from itertools import combinations
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

import db_ops
from database import get_db
from services.handle_sync import sync_all, sync_member
from services.team_profiles import (
    MemberProfile,
    compute_profiles,
    load_problems,
    team_coverage,
)

router = APIRouter()


class MemberCreate(BaseModel):
    name: str
    cf_handle: str | None = None
    lc_handle: str | None = None


class MemberUpdate(BaseModel):
    name: str | None = None
    cf_handle: str | None = None
    lc_handle: str | None = None


class ActiveUpdate(BaseModel):
    active: bool


class MemberResponse(BaseModel):
    id: int
    name: str
    active: bool
    cf_handle: str | None
    lc_handle: str | None
    solved_curated: list[str]
    solved_count: int
    total_accepted: int
    last_synced: str | None
    lc_total_solved: int
    lc_synced: str | None


class SyncResponse(BaseModel):
    member_id: int
    cf_handle: str
    new_solved: list[str]
    total_solved: int
    total_accepted: int
    last_synced: str


def _member_to_response(m_dict: dict[str, Any]) -> MemberResponse:
    lc_data = m_dict.get("lc_data") or {}
    return MemberResponse(
        id=m_dict["id"],
        name=m_dict["name"],
        active=m_dict.get("active", True),
        cf_handle=m_dict.get("cf_handle"),
        lc_handle=m_dict.get("lc_handle"),
        solved_curated=m_dict.get("solved_curated", []),
        solved_count=len(m_dict.get("solved_curated", [])),
        total_accepted=len(m_dict.get("all_accepted", [])),
        last_synced=m_dict.get("last_synced"),
        lc_total_solved=lc_data.get("difficulty_stats", {}).get("All", 0),
        lc_synced=lc_data.get("lc_synced"),
    )


@router.get("/")
async def list_members(db: AsyncSession = Depends(get_db)) -> list[MemberResponse]:
    """List all team members with solve stats."""
    members = await db_ops.get_all_members(db)
    return [_member_to_response(db_ops.member_to_dict(m)) for m in members]


@router.post("/")
async def add_member(body: MemberCreate, db: AsyncSession = Depends(get_db)) -> MemberResponse:
    """Add a new team member."""
    member = await db_ops.create_member(
        db,
        name=body.name,
        cf_handle=body.cf_handle.strip() if body.cf_handle else None,
        lc_handle=body.lc_handle.strip() if body.lc_handle else None,
    )
    return _member_to_response(db_ops.member_to_dict(member))


@router.delete("/{member_id}")
async def remove_member(member_id: int, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Remove a team member."""
    deleted = await db_ops.delete_member(db, member_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Member {member_id} not found")
    return {"status": "removed", "id": str(member_id)}


@router.patch("/{member_id}/active")
async def toggle_member_active(
    member_id: int, body: ActiveUpdate, db: AsyncSession = Depends(get_db)
) -> MemberResponse:
    """Set a member's active/inactive status."""
    member = await db_ops.get_member(db, member_id)
    if not member:
        raise HTTPException(status_code=404, detail=f"Member {member_id} not found")
    member = await db_ops.update_member(db, member, active=body.active)
    return _member_to_response(db_ops.member_to_dict(member))


@router.get("/{member_id}")
async def get_member(member_id: int, db: AsyncSession = Depends(get_db)) -> MemberResponse:
    """Get a single team member's details."""
    member = await db_ops.get_member(db, member_id)
    if not member:
        raise HTTPException(status_code=404, detail=f"Member {member_id} not found")
    return _member_to_response(db_ops.member_to_dict(member))


@router.put("/{member_id}")
async def update_member(
    member_id: int, update: MemberUpdate, db: AsyncSession = Depends(get_db)
) -> MemberResponse:
    """Update a team member's name and/or CF handle."""
    member = await db_ops.get_member(db, member_id)
    if not member:
        raise HTTPException(status_code=404, detail=f"Member {member_id} not found")

    updates: dict[str, Any] = {}
    if update.name is not None:
        updates["name"] = update.name
    if update.cf_handle is not None:
        updates["cf_handle"] = update.cf_handle.strip() or None
    if update.lc_handle is not None:
        updates["lc_handle"] = update.lc_handle.strip() or None

    member = await db_ops.update_member(db, member, **updates)
    return _member_to_response(db_ops.member_to_dict(member))


@router.post("/{member_id}/sync")
async def sync_member_handle(member_id: int, db: AsyncSession = Depends(get_db)) -> SyncResponse:
    """Trigger a CF submission sync for a single member."""
    try:
        result = await sync_member(db, member_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"CF API error: {e}")
    return SyncResponse(**result)


@router.post("/sync-all")
async def sync_all_members(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    """Sync all members that have CF handles set."""
    return await sync_all(db)


@router.post("/{member_id}/sync-lc")
async def sync_member_lc(member_id: int, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Trigger a LeetCode skill sync for a single member."""
    from services.lc_sync import sync_lc_member

    try:
        result = await sync_lc_member(db, member_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LeetCode API error: {e}")
    return result


@router.post("/sync-all-lc")
async def sync_all_lc(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    """Sync LC data for all members that have LC handles set."""
    from services.lc_sync import sync_lc_all

    return await sync_lc_all(db)


# ---------------------------------------------------------------------------
# Team composition planner
# ---------------------------------------------------------------------------

class TeamSuggestion(BaseModel):
    team_a: list[int]
    team_b: list[int]
    alternates: list[int]
    score: float
    team_a_coverage: dict[str, float]
    team_b_coverage: dict[str, float]


class ComposeResponse(BaseModel):
    profiles: list[MemberProfile]
    suggestion: TeamSuggestion


def _suggest_split(profiles: list[MemberProfile]) -> TeamSuggestion:
    """Brute-force all C(n,3)*C(n-3,3)/2 splits, return the best one."""
    ids = [p.id for p in profiles]
    best_score = -1.0
    best: tuple[list[int], list[int], list[int]] = ([], [], [])

    for team_a in combinations(ids, 3):
        remaining = [i for i in ids if i not in team_a]
        for team_b in combinations(remaining, 3):
            if team_a[0] > team_b[0]:
                continue
            alternates = [i for i in remaining if i not in team_b]
            cov_a = team_coverage(list(team_a), profiles)
            cov_b = team_coverage(list(team_b), profiles)
            score = min(sum(cov_a.values()), sum(cov_b.values()))
            if score > best_score:
                best_score = score
                best = (list(team_a), list(team_b), alternates)

    team_a, team_b, alternates = best
    return TeamSuggestion(
        team_a=team_a,
        team_b=team_b,
        alternates=alternates,
        score=best_score,
        team_a_coverage=team_coverage(team_a, profiles),
        team_b_coverage=team_coverage(team_b, profiles),
    )


@router.post("/compose")
async def compose_teams(db: AsyncSession = Depends(get_db)) -> ComposeResponse:
    """Analyze member strengths and suggest balanced 2-team split."""
    members = await db_ops.get_all_members(db)
    member_dicts = [db_ops.member_to_dict(m) for m in members]
    problems = load_problems()
    profiles = compute_profiles(member_dicts, problems)
    suggestion = _suggest_split(profiles)
    return ComposeResponse(profiles=profiles, suggestion=suggestion)
