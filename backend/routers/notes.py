"""Notes router — per-member problem notes with embedding-based recommendations."""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.note_embeddings import recommend_from_text

DATA_DIR = Path(__file__).parent.parent / "data"
NOTES_FILE = DATA_DIR / "notes.json"
TEAM_FILE = DATA_DIR / "team.json"
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
# Helpers
# ---------------------------------------------------------------------------


def load_notes() -> dict[str, Any]:
    if not NOTES_FILE.exists():
        return {"notes": []}
    with open(NOTES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_notes(data: dict[str, Any]) -> None:
    with open(NOTES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _load_member_solved(member_id: int) -> set[str]:
    """Load solved problem IDs for a member."""
    if not TEAM_FILE.exists():
        return set()
    with open(TEAM_FILE, "r", encoding="utf-8") as f:
        team = json.load(f)
    for m in team.get("members", []):
        if m["id"] == member_id:
            return set(m.get("solved_curated", []))
    return set()


def _get_problem_rating(problem_id: str) -> int:
    """Get rating for a curated problem. Returns 0 if not found."""
    if not PROBLEMS_FILE.exists():
        return 0
    with open(PROBLEMS_FILE, "r", encoding="utf-8") as f:
        problems = json.load(f)
    for p in problems:
        if p["id"] == problem_id:
            return p.get("rating", 0)
    return 0


def _get_member_avg_rating(member_id: int) -> int:
    """Compute average rating of curated problems solved by a member."""
    solved = _load_member_solved(member_id)
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
async def get_member_notes(member_id: int) -> list[dict[str, Any]]:
    """List all notes for a member, sorted by most recently updated."""
    data = load_notes()
    notes = [n for n in data["notes"] if n["member_id"] == member_id]
    notes.sort(key=lambda n: n.get("updated_at", n["created_at"]), reverse=True)
    return notes


@router.get("/problem/{problem_id}")
async def get_problem_notes(problem_id: str) -> list[dict[str, Any]]:
    """Get all notes on a problem from all members."""
    data = load_notes()
    return [n for n in data["notes"] if n["problem_id"] == problem_id]


@router.get("/member/{member_id}/problem/{problem_id}")
async def get_member_problem_note(member_id: int, problem_id: str) -> dict[str, Any] | None:
    """Get a specific member's note on a specific problem."""
    data = load_notes()
    for n in data["notes"]:
        if n["member_id"] == member_id and n["problem_id"] == problem_id:
            return n
    return None


@router.post("/")
async def save_note(body: NoteCreate) -> dict[str, Any]:
    """Create or update a note (upsert — one note per member per problem)."""
    data = load_notes()
    now = datetime.now(timezone.utc).isoformat()

    # Check if note already exists for this member+problem
    for note in data["notes"]:
        if note["member_id"] == body.member_id and note["problem_id"] == body.problem_id:
            note["content"] = body.content
            note["updated_at"] = now
            save_notes(data)
            return note

    # Create new note
    note = {
        "id": f"note_{uuid.uuid4().hex[:8]}",
        "member_id": body.member_id,
        "problem_id": body.problem_id,
        "content": body.content,
        "created_at": now,
        "updated_at": now,
    }
    data["notes"].append(note)
    save_notes(data)
    return note


@router.delete("/{note_id}")
async def delete_note(note_id: str) -> dict[str, str]:
    """Delete a note."""
    data = load_notes()
    before = len(data["notes"])
    data["notes"] = [n for n in data["notes"] if n["id"] != note_id]
    if len(data["notes"]) == before:
        raise HTTPException(status_code=404, detail=f"Note {note_id} not found")
    save_notes(data)
    return {"status": "deleted", "id": note_id}


@router.get("/member/{member_id}/problem/{problem_id}/recommend")
def get_note_recommendations(
    member_id: int,
    problem_id: str,
    limit: int = Query(default=10, ge=1, le=50),
) -> list[dict[str, Any]]:
    """Get problem recommendations based on a note's content."""
    data = load_notes()

    note = None
    for n in data["notes"]:
        if n["member_id"] == member_id and n["problem_id"] == problem_id:
            note = n
            break

    if not note:
        raise HTTPException(
            status_code=404,
            detail=f"No note found for member {member_id} on problem {problem_id}",
        )

    if len(note["content"].strip()) < 10:
        return []

    # Exclude already-solved problems and the noted problem itself
    solved = _load_member_solved(member_id)
    solved.add(problem_id)

    # Use the noted problem's rating as the target difficulty level
    target = _get_problem_rating(problem_id)
    if target == 0:
        target = _get_member_avg_rating(member_id)

    try:
        return recommend_from_text(note["content"], limit=limit, exclude_ids=solved, target_rating=target)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Recommendation service unavailable: {e}",
        )
