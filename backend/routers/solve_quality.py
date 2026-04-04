"""Solve quality router — editorial flag self-reporting."""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

import db_ops
from database import get_db

router = APIRouter()


class EditorialFlagRequest(BaseModel):
    problem_id: str
    used_editorial: bool
    platform: str = "cf"


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


@router.get("/{member_id}")
async def get_solve_quality(member_id: int, db: AsyncSession = Depends(get_db)) -> SolveQualityResponse:
    """Get all solve quality data for a member."""
    member = await db_ops.get_member(db, member_id)
    if not member:
        raise HTTPException(status_code=404, detail=f"Member {member_id} not found")

    raw_sq = await db_ops.get_member_solve_quality(db, member_id)
    editorial_flags = await db_ops.get_member_editorial_flags(db, member_id)

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
        member_id=member.id,
        member_name=member.name,
        solve_quality=entries,
        editorial_flags=flag_responses,
    )


@router.post("/{member_id}")
async def flag_editorial(
    member_id: int, req: EditorialFlagRequest, db: AsyncSession = Depends(get_db)
) -> EditorialFlagResponse:
    """Mark a problem as 'used editorial'. Overrides auto-detection weight to 0.5."""
    if req.platform not in ("cf", "lc"):
        raise HTTPException(status_code=400, detail="platform must be 'cf' or 'lc'")

    member = await db_ops.get_member(db, member_id)
    if not member:
        raise HTTPException(status_code=404, detail=f"Member {member_id} not found")

    now = datetime.now(timezone.utc).isoformat()

    if req.used_editorial:
        await db_ops.set_editorial_flag(db, member_id, req.problem_id, platform=req.platform, flagged_at=now)
    else:
        await db_ops.remove_editorial_flag(db, member_id, req.problem_id)

    return EditorialFlagResponse(
        problem_id=req.problem_id,
        platform=req.platform,
        used_editorial=req.used_editorial,
        flagged_at=now if req.used_editorial else None,
    )


@router.delete("/{member_id}/{problem_id}")
async def unflag_editorial(
    member_id: int, problem_id: str, db: AsyncSession = Depends(get_db)
) -> dict[str, str]:
    """Remove the editorial flag for a problem."""
    member = await db_ops.get_member(db, member_id)
    if not member:
        raise HTTPException(status_code=404, detail=f"Member {member_id} not found")

    removed = await db_ops.remove_editorial_flag(db, member_id, problem_id)
    if not removed:
        raise HTTPException(status_code=404, detail=f"No editorial flag for {problem_id}")

    return {"status": "ok", "problem_id": problem_id}
