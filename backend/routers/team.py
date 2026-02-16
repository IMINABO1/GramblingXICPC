"""Team router — team member management and CF handle sync."""

from itertools import combinations
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.handle_sync import load_team, save_team, sync_all, sync_member
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


def _member_to_response(m: dict[str, Any]) -> MemberResponse:
    lc_data = m.get("lc_data") or {}
    return MemberResponse(
        id=m["id"],
        name=m["name"],
        active=m.get("active", True),
        cf_handle=m.get("cf_handle"),
        lc_handle=m.get("lc_handle"),
        solved_curated=m.get("solved_curated", []),
        solved_count=len(m.get("solved_curated", [])),
        total_accepted=len(m.get("all_accepted", [])),
        last_synced=m.get("last_synced"),
        lc_total_solved=lc_data.get("difficulty_stats", {}).get("All", 0),
        lc_synced=lc_data.get("lc_synced"),
    )


def _find_member(team: dict[str, Any], member_id: int) -> dict[str, Any]:
    for m in team["members"]:
        if m["id"] == member_id:
            return m
    raise HTTPException(status_code=404, detail=f"Member {member_id} not found")


@router.get("/")
async def list_members() -> list[MemberResponse]:
    """List all team members with solve stats."""
    team = load_team()
    return [_member_to_response(m) for m in team["members"]]


@router.post("/")
async def add_member(body: MemberCreate) -> MemberResponse:
    """Add a new team member."""
    team = load_team()
    existing_ids = [m["id"] for m in team["members"]]
    new_id = max(existing_ids) + 1 if existing_ids else 0
    new_member: dict[str, Any] = {
        "id": new_id,
        "name": body.name,
        "active": True,
        "cf_handle": body.cf_handle.strip() if body.cf_handle else None,
        "lc_handle": body.lc_handle.strip() if body.lc_handle else None,
        "solved_curated": [],
        "all_accepted": [],
        "last_synced": None,
    }
    team["members"].append(new_member)
    save_team(team)
    return _member_to_response(new_member)


@router.delete("/{member_id}")
async def remove_member(member_id: int) -> dict[str, str]:
    """Remove a team member."""
    team = load_team()
    before = len(team["members"])
    team["members"] = [m for m in team["members"] if m["id"] != member_id]
    if len(team["members"]) == before:
        raise HTTPException(status_code=404, detail=f"Member {member_id} not found")
    save_team(team)
    return {"status": "removed", "id": str(member_id)}


@router.patch("/{member_id}/active")
async def toggle_member_active(member_id: int, body: ActiveUpdate) -> MemberResponse:
    """Set a member's active/inactive status."""
    team = load_team()
    member = _find_member(team, member_id)
    member["active"] = body.active
    save_team(team)
    return _member_to_response(member)


@router.get("/{member_id}")
async def get_member(member_id: int) -> MemberResponse:
    """Get a single team member's details."""
    team = load_team()
    member = _find_member(team, member_id)
    return _member_to_response(member)


@router.put("/{member_id}")
async def update_member(member_id: int, update: MemberUpdate) -> MemberResponse:
    """Update a team member's name and/or CF handle."""
    team = load_team()
    member = _find_member(team, member_id)

    if update.name is not None:
        member["name"] = update.name
    if update.cf_handle is not None:
        member["cf_handle"] = update.cf_handle.strip() or None
    if update.lc_handle is not None:
        member["lc_handle"] = update.lc_handle.strip() or None

    save_team(team)
    return _member_to_response(member)


@router.post("/{member_id}/sync")
async def sync_member_handle(member_id: int) -> SyncResponse:
    """Trigger a CF submission sync for a single member."""
    try:
        result = sync_member(member_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"CF API error: {e}")
    return SyncResponse(**result)


@router.post("/sync-all")
async def sync_all_members() -> list[dict[str, Any]]:
    """Sync all members that have CF handles set."""
    return sync_all()


@router.post("/{member_id}/sync-lc")
async def sync_member_lc(member_id: int) -> dict[str, Any]:
    """Trigger a LeetCode skill sync for a single member."""
    from services.lc_sync import sync_lc_member

    try:
        result = sync_lc_member(member_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LeetCode API error: {e}")
    return result


@router.post("/sync-all-lc")
async def sync_all_lc() -> list[dict[str, Any]]:
    """Sync LC data for all members that have LC handles set."""
    from services.lc_sync import sync_lc_all

    return sync_lc_all()


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
            # Avoid counting symmetric splits (team_a, team_b) and (team_b, team_a)
            if team_a[0] > team_b[0]:
                continue
            alternates = [i for i in remaining if i not in team_b]
            cov_a = team_coverage(list(team_a), profiles)
            cov_b = team_coverage(list(team_b), profiles)
            # Score = min total coverage of the two teams (maximize the weaker team)
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
async def compose_teams() -> ComposeResponse:
    """Analyze member strengths and suggest balanced 2-team split."""
    team = load_team()
    problems = load_problems()
    profiles = compute_profiles(team["members"], problems)
    suggestion = _suggest_split(profiles)
    return ComposeResponse(profiles=profiles, suggestion=suggestion)
