"""Notes router — per-member problem notes with embedding-based recommendations."""

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

import db_ops
from database import get_db
from services.note_embeddings import recommend_from_text

DATA_DIR = Path(__file__).parent.parent / "data"
PROBLEMS_FILE = DATA_DIR / "problems.json"

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class NoteCreate(BaseModel):
    member_id: int
    problem_id: str
    content: str


# ---------------------------------------------------------------------------
# Helpers (still reads problems.json — reference data, stays as file)
# ---------------------------------------------------------------------------


def _get_problem_rating(problem_id: str) -> int:
    if not PROBLEMS_FILE.exists():
        return 0
    with open(PROBLEMS_FILE, "r", encoding="utf-8") as f:
        problems = json.load(f)
    for p in problems:
        if p["id"] == problem_id:
            return p.get("rating", 0)
    return 0


def _get_member_avg_rating_from_solved(solved: set[str]) -> int:
    if not solved or not PROBLEMS_FILE.exists():
        return 0
    with open(PROBLEMS_FILE, "r", encoding="utf-8") as f:
        problems = json.load(f)
    ratings = [p["rating"] for p in problems if p["id"] in solved and p.get("rating", 0) > 0]
    return round(sum(ratings) / len(ratings)) if ratings else 0


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/member/{member_id}")
async def get_member_notes(member_id: int, db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    """List all notes for a member, sorted by most recently updated."""
    notes = await db_ops.get_member_notes(db, member_id)
    return [db_ops.note_to_dict(n) for n in notes]


@router.get("/problem/{problem_id}")
async def get_problem_notes(problem_id: str, db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    """Get all notes on a problem from all members."""
    notes = await db_ops.get_problem_notes(db, problem_id)
    return [db_ops.note_to_dict(n) for n in notes]


@router.get("/member/{member_id}/problem/{problem_id}")
async def get_member_problem_note(
    member_id: int, problem_id: str, db: AsyncSession = Depends(get_db)
) -> dict[str, Any] | None:
    """Get a specific member's note on a specific problem."""
    note = await db_ops.get_member_problem_note(db, member_id, problem_id)
    return db_ops.note_to_dict(note) if note else None


@router.post("/")
async def save_note(body: NoteCreate, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Create or update a note (upsert — one note per member per problem)."""
    note = await db_ops.upsert_note(db, body.member_id, body.problem_id, body.content)
    return db_ops.note_to_dict(note)


@router.delete("/{note_id}")
async def delete_note(note_id: str, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Delete a note."""
    deleted = await db_ops.delete_note(db, note_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Note {note_id} not found")
    return {"status": "deleted", "id": note_id}


@router.get("/member/{member_id}/problem/{problem_id}/recommend")
async def get_note_recommendations(
    member_id: int,
    problem_id: str,
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Get problem recommendations based on a note's content."""
    note = await db_ops.get_member_problem_note(db, member_id, problem_id)
    if not note:
        raise HTTPException(
            status_code=404,
            detail=f"No note found for member {member_id} on problem {problem_id}",
        )

    if len(note.content.strip()) < 10:
        return []

    solved = set(await db_ops.get_member_solved_curated(db, member_id))
    solved.add(problem_id)

    target = _get_problem_rating(problem_id)
    if target == 0:
        target = _get_member_avg_rating_from_solved(solved)

    try:
        return recommend_from_text(note.content, limit=limit, exclude_ids=solved, target_rating=target)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Recommendation service unavailable: {e}",
        )
