"""Solve quality router — editorial flag self-reporting."""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.handle_sync import load_team, save_team

router = APIRouter()


class EditorialFlagRequest(BaseModel):
    problem_id: str
    used_editorial: bool
    platform: str = "cf"  # "cf" or "lc"


class EditorialFlagResponse(BaseModel):
    problem_id: str
    platform: str
    used_editorial: bool
    flagged_at: str | None


class SolveQualityEntry(BaseModel):
    classification: str
    wrong_attempts: int
    time_to_solve_hrs: float | None
    weight: float
    editorial_override: bool = False


class SolveQualityResponse(BaseModel):
    member_id: int
    member_name: str
    solve_quality: dict[str, SolveQualityEntry]
    editorial_flags: dict[str, EditorialFlagResponse]


def _find_member(team: dict[str, Any], member_id: int) -> dict[str, Any]:
    for m in team["members"]:
        if m["id"] == member_id:
            return m
    raise HTTPException(status_code=404, detail=f"Member {member_id} not found")


@router.get("/{member_id}")
async def get_solve_quality(member_id: int) -> SolveQualityResponse:
    """Get all solve quality data for a member."""
    team = load_team()
    member = _find_member(team, member_id)

    raw_sq = member.get("solve_quality") or {}
    editorial_flags = member.get("editorial_flags") or {}

    # Build solve quality entries with editorial overrides applied
    entries: dict[str, SolveQualityEntry] = {}
    for pid, sq in raw_sq.items():
        has_override = pid in editorial_flags
        entries[pid] = SolveQualityEntry(
            classification="self_reported_editorial" if has_override else sq["classification"],
            wrong_attempts=sq["wrong_attempts"],
            time_to_solve_hrs=sq.get("time_to_solve_hrs"),
            weight=0.5 if has_override else sq["weight"],
            editorial_override=has_override,
        )

    flag_responses: dict[str, EditorialFlagResponse] = {}
    for pid, flag in editorial_flags.items():
        flag_responses[pid] = EditorialFlagResponse(
            problem_id=pid,
            platform=flag["platform"],
            used_editorial=True,
            flagged_at=flag.get("flagged_at"),
        )

    return SolveQualityResponse(
        member_id=member["id"],
        member_name=member["name"],
        solve_quality=entries,
        editorial_flags=flag_responses,
    )


@router.post("/{member_id}")
async def flag_editorial(member_id: int, req: EditorialFlagRequest) -> EditorialFlagResponse:
    """Mark a problem as 'used editorial'. Overrides auto-detection weight to 0.5."""
    if req.platform not in ("cf", "lc"):
        raise HTTPException(status_code=400, detail="platform must be 'cf' or 'lc'")

    team = load_team()
    member = _find_member(team, member_id)

    if "editorial_flags" not in member or member["editorial_flags"] is None:
        member["editorial_flags"] = {}

    now = datetime.now(timezone.utc).isoformat()

    if req.used_editorial:
        member["editorial_flags"][req.problem_id] = {
            "platform": req.platform,
            "flagged_at": now,
        }
    else:
        # Remove flag if setting used_editorial to false
        member["editorial_flags"].pop(req.problem_id, None)

    save_team(team)

    return EditorialFlagResponse(
        problem_id=req.problem_id,
        platform=req.platform,
        used_editorial=req.used_editorial,
        flagged_at=now if req.used_editorial else None,
    )


@router.delete("/{member_id}/{problem_id}")
async def unflag_editorial(member_id: int, problem_id: str) -> dict[str, str]:
    """Remove the editorial flag for a problem."""
    team = load_team()
    member = _find_member(team, member_id)

    flags = member.get("editorial_flags") or {}
    if problem_id not in flags:
        raise HTTPException(status_code=404, detail=f"No editorial flag for {problem_id}")

    del flags[problem_id]
    member["editorial_flags"] = flags
    save_team(team)

    return {"status": "ok", "problem_id": problem_id}
