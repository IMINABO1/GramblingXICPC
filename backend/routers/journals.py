"""Journals router — per-member, per-topic journals with custom topics, search, and recommendations."""

import json
import re
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


class EntryCreate(BaseModel):
    content: str


class EntryUpdate(BaseModel):
    content: str


class CustomTopicCreate(BaseModel):
    name: str
    icon: str = "\U0001f4dd"
    created_by: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _search_score(query: str, text: str) -> float:
    """Score text relevance to a query using token matching."""
    query_lower = query.lower()
    text_lower = text.lower()

    if query_lower in text_lower:
        return 1.0

    tokens = re.split(r"\s+", query_lower)
    if not tokens:
        return 0.0

    matched = sum(1 for t in tokens if t in text_lower)
    return matched / len(tokens)


def _get_member_avg_rating_from_solved(solved: set[str]) -> int:
    if not solved or not PROBLEMS_FILE.exists():
        return 0
    with open(PROBLEMS_FILE, "r", encoding="utf-8") as f:
        problems = json.load(f)
    ratings = [p["rating"] for p in problems if p["id"] in solved and p.get("rating", 0) > 0]
    return round(sum(ratings) / len(ratings)) if ratings else 0


# ---------------------------------------------------------------------------
# Custom Topics
# ---------------------------------------------------------------------------


@router.get("/topics")
async def list_custom_topics(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    """List all custom journal topics."""
    topics = await db_ops.get_all_custom_topics(db)
    return [db_ops.custom_topic_to_dict(t) for t in topics]


@router.post("/topics")
async def create_custom_topic(
    body: CustomTopicCreate, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    """Create a custom journal topic."""
    existing = await db_ops.get_custom_topic_by_name(db, body.name.strip())
    if existing:
        raise HTTPException(status_code=409, detail="Topic with this name already exists")

    topic = await db_ops.create_custom_topic(
        db, name=body.name, icon=body.icon, created_by=body.created_by
    )
    return db_ops.custom_topic_to_dict(topic)


@router.delete("/topics/{topic_id}")
async def delete_custom_topic(topic_id: str, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Delete a custom topic and all its journal entries."""
    deleted = await db_ops.delete_custom_topic(db, topic_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Custom topic {topic_id} not found")
    return {"status": "deleted", "id": topic_id}


# ---------------------------------------------------------------------------
# Journals — per-member CRUD
# ---------------------------------------------------------------------------


@router.get("/member/{member_id}")
async def get_member_journals(member_id: int, db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    """List all journals for a member, sorted by most recently updated."""
    journals = await db_ops.get_member_journals(db, member_id)
    return [db_ops.journal_to_dict(j) for j in journals]


@router.get("/member/{member_id}/topic/{topic_id}")
async def get_journal(
    member_id: int, topic_id: str, db: AsyncSession = Depends(get_db)
) -> dict[str, Any] | None:
    """Get a specific journal with all entries."""
    journal = await db_ops.get_journal(db, member_id, topic_id)
    return db_ops.journal_to_dict(journal) if journal else None


@router.post("/member/{member_id}/topic/{topic_id}")
async def add_entry(
    member_id: int, topic_id: str, body: EntryCreate, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    """Add an entry to a journal (auto-creates the journal if it doesn't exist)."""
    journal = await db_ops.add_journal_entry(db, member_id, topic_id, body.content)
    return db_ops.journal_to_dict(journal)


@router.put("/member/{member_id}/topic/{topic_id}/entry/{entry_id}")
async def edit_entry(
    member_id: int, topic_id: str, entry_id: str, body: EntryUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Edit a specific journal entry."""
    journal = await db_ops.edit_journal_entry(db, member_id, topic_id, entry_id, body.content)
    if journal is None:
        raise HTTPException(
            status_code=404,
            detail=f"Journal or entry not found for member {member_id}, topic {topic_id}, entry {entry_id}",
        )
    return db_ops.journal_to_dict(journal)


@router.delete("/member/{member_id}/topic/{topic_id}/entry/{entry_id}")
async def delete_entry(
    member_id: int, topic_id: str, entry_id: str, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    """Delete a specific journal entry. Removes journal if last entry deleted."""
    result = await db_ops.delete_journal_entry(db, member_id, topic_id, entry_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Journal or entry not found for member {member_id}, topic {topic_id}, entry {entry_id}",
        )
    return {"status": "deleted", "entry_id": entry_id}


# ---------------------------------------------------------------------------
# All-entries view (across members)
# ---------------------------------------------------------------------------


@router.get("/topic/{topic_id}/all")
async def get_all_entries_for_topic(
    topic_id: str,
    member_id: int | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Get all journal entries for a topic from all (or filtered) members."""
    members = await db_ops.get_all_members(db)
    member_map = {m.id: m.name for m in members}

    all_journals = await db_ops.get_all_journals(db)

    entries: list[dict[str, Any]] = []
    for journal in all_journals:
        if journal.topic_id != topic_id:
            continue
        if member_id is not None and journal.member_id != member_id:
            continue

        for entry in journal.entries:
            entries.append({
                "id": entry.id,
                "content": entry.content,
                "created_at": entry.created_at,
                "member_id": journal.member_id,
                "member_name": member_map.get(journal.member_id, f"Member {journal.member_id + 1}"),
                "journal_id": journal.id,
            })

    entries.sort(key=lambda e: e["created_at"], reverse=True)
    return entries


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------


@router.get("/search")
async def search_journals(
    q: str = Query(min_length=1),
    member_id: int | None = Query(default=None),
    topic_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Search journal entries by text content."""
    members = await db_ops.get_all_members(db)
    member_map = {m.id: m.name for m in members}

    all_journals = await db_ops.get_all_journals(db)

    scored: list[tuple[float, dict[str, Any]]] = []
    for journal in all_journals:
        if member_id is not None and journal.member_id != member_id:
            continue
        if topic_id is not None and journal.topic_id != topic_id:
            continue

        for entry in journal.entries:
            score = _search_score(q, entry.content)
            if score > 0:
                scored.append((score, {
                    "id": entry.id,
                    "content": entry.content,
                    "created_at": entry.created_at,
                    "member_id": journal.member_id,
                    "member_name": member_map.get(
                        journal.member_id, f"Member {journal.member_id + 1}"
                    ),
                    "topic_id": journal.topic_id,
                    "journal_id": journal.id,
                    "score": round(score, 3),
                }))

    scored.sort(key=lambda x: (-x[0], x[1]["created_at"]))
    return [item for _, item in scored[:limit]]


# ---------------------------------------------------------------------------
# Recommendations
# ---------------------------------------------------------------------------


@router.get("/member/{member_id}/topic/{topic_id}/recommend")
async def get_journal_recommendations(
    member_id: int,
    topic_id: str,
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Get problem recommendations based on combined journal entries."""
    journal = await db_ops.get_journal(db, member_id, topic_id)

    if not journal or not journal.entries:
        raise HTTPException(
            status_code=404,
            detail=f"No journal entries for member {member_id}, topic {topic_id}",
        )

    combined = "\n\n".join(e.content for e in journal.entries)

    if len(combined.strip()) < 10:
        return []

    solved = set(await db_ops.get_member_solved_curated(db, member_id))
    target = _get_member_avg_rating_from_solved(solved)

    try:
        return recommend_from_text(combined, limit=limit, exclude_ids=solved, target_rating=target)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Recommendation service unavailable: {e}",
        )
