"""Journals router — per-member, per-topic journals with custom topics, search, and recommendations."""

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.note_embeddings import recommend_from_text

DATA_DIR = Path(__file__).parent.parent / "data"
JOURNALS_FILE = DATA_DIR / "journals.json"
TEAM_FILE = DATA_DIR / "team.json"

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


def load_journals() -> dict[str, Any]:
    if not JOURNALS_FILE.exists():
        return {"journals": [], "custom_topics": []}
    with open(JOURNALS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "custom_topics" not in data:
        data["custom_topics"] = []
    return data


def save_journals(data: dict[str, Any]) -> None:
    with open(JOURNALS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _find_journal(
    data: dict[str, Any], member_id: int, topic_id: str
) -> dict[str, Any] | None:
    for j in data["journals"]:
        if j["member_id"] == member_id and j["topic_id"] == topic_id:
            return j
    return None


PROBLEMS_FILE = DATA_DIR / "problems.json"


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


def _get_member_avg_rating(member_id: int) -> int:
    """Compute average rating of curated problems solved by a member."""
    solved = _load_member_solved(member_id)
    if not solved or not PROBLEMS_FILE.exists():
        return 0
    with open(PROBLEMS_FILE, "r", encoding="utf-8") as f:
        problems = json.load(f)
    ratings = [p["rating"] for p in problems if p["id"] in solved and p.get("rating", 0) > 0]
    return round(sum(ratings) / len(ratings)) if ratings else 0


def _load_team_members() -> list[dict[str, Any]]:
    """Load team member list."""
    if not TEAM_FILE.exists():
        return []
    with open(TEAM_FILE, "r", encoding="utf-8") as f:
        team = json.load(f)
    return team.get("members", [])


def _search_score(query: str, text: str) -> float:
    """Score text relevance to a query using token matching."""
    query_lower = query.lower()
    text_lower = text.lower()

    # Exact substring match gets highest score
    if query_lower in text_lower:
        return 1.0

    # Token-based matching
    tokens = re.split(r"\s+", query_lower)
    if not tokens:
        return 0.0

    matched = sum(1 for t in tokens if t in text_lower)
    return matched / len(tokens)


# ---------------------------------------------------------------------------
# Custom Topics
# ---------------------------------------------------------------------------


@router.get("/topics")
async def list_custom_topics() -> list[dict[str, Any]]:
    """List all custom journal topics."""
    data = load_journals()
    return data.get("custom_topics", [])


@router.post("/topics")
async def create_custom_topic(body: CustomTopicCreate) -> dict[str, Any]:
    """Create a custom journal topic."""
    data = load_journals()
    now = datetime.now(timezone.utc).isoformat()

    # Check for duplicate names
    for t in data.get("custom_topics", []):
        if t["name"].lower() == body.name.strip().lower():
            raise HTTPException(status_code=409, detail="Topic with this name already exists")

    topic = {
        "id": f"custom_{uuid.uuid4().hex[:8]}",
        "name": body.name.strip(),
        "icon": body.icon,
        "created_by": body.created_by,
        "created_at": now,
    }
    data["custom_topics"].append(topic)
    save_journals(data)
    return topic


@router.delete("/topics/{topic_id}")
async def delete_custom_topic(topic_id: str) -> dict[str, str]:
    """Delete a custom topic and all its journal entries."""
    data = load_journals()

    before = len(data.get("custom_topics", []))
    data["custom_topics"] = [t for t in data.get("custom_topics", []) if t["id"] != topic_id]
    if len(data["custom_topics"]) == before:
        raise HTTPException(status_code=404, detail=f"Custom topic {topic_id} not found")

    # Remove all journals for this topic
    data["journals"] = [j for j in data["journals"] if j["topic_id"] != topic_id]

    save_journals(data)
    return {"status": "deleted", "id": topic_id}


# ---------------------------------------------------------------------------
# Journals — per-member CRUD
# ---------------------------------------------------------------------------


@router.get("/member/{member_id}")
async def get_member_journals(member_id: int) -> list[dict[str, Any]]:
    """List all journals for a member, sorted by most recently updated."""
    data = load_journals()
    journals = [j for j in data["journals"] if j["member_id"] == member_id]
    journals.sort(key=lambda j: j.get("updated_at", j["created_at"]), reverse=True)
    return journals


@router.get("/member/{member_id}/topic/{topic_id}")
async def get_journal(member_id: int, topic_id: str) -> dict[str, Any] | None:
    """Get a specific journal with all entries."""
    data = load_journals()
    return _find_journal(data, member_id, topic_id)


@router.post("/member/{member_id}/topic/{topic_id}")
async def add_entry(member_id: int, topic_id: str, body: EntryCreate) -> dict[str, Any]:
    """Add an entry to a journal (auto-creates the journal if it doesn't exist)."""
    data = load_journals()
    now = datetime.now(timezone.utc).isoformat()

    journal = _find_journal(data, member_id, topic_id)

    entry = {
        "id": f"entry_{uuid.uuid4().hex[:8]}",
        "content": body.content,
        "created_at": now,
    }

    if journal:
        journal["entries"].append(entry)
        journal["updated_at"] = now
    else:
        journal = {
            "id": f"journal_{uuid.uuid4().hex[:8]}",
            "member_id": member_id,
            "topic_id": topic_id,
            "entries": [entry],
            "created_at": now,
            "updated_at": now,
        }
        data["journals"].append(journal)

    save_journals(data)
    return journal


@router.put("/member/{member_id}/topic/{topic_id}/entry/{entry_id}")
async def edit_entry(
    member_id: int, topic_id: str, entry_id: str, body: EntryUpdate
) -> dict[str, Any]:
    """Edit a specific journal entry."""
    data = load_journals()
    journal = _find_journal(data, member_id, topic_id)
    if not journal:
        raise HTTPException(
            status_code=404,
            detail=f"No journal for member {member_id}, topic {topic_id}",
        )

    for entry in journal["entries"]:
        if entry["id"] == entry_id:
            entry["content"] = body.content
            journal["updated_at"] = datetime.now(timezone.utc).isoformat()
            save_journals(data)
            return journal

    raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found")


@router.delete("/member/{member_id}/topic/{topic_id}/entry/{entry_id}")
async def delete_entry(member_id: int, topic_id: str, entry_id: str) -> dict[str, Any]:
    """Delete a specific journal entry. Removes journal if last entry deleted."""
    data = load_journals()
    journal = _find_journal(data, member_id, topic_id)
    if not journal:
        raise HTTPException(
            status_code=404,
            detail=f"No journal for member {member_id}, topic {topic_id}",
        )

    before = len(journal["entries"])
    journal["entries"] = [e for e in journal["entries"] if e["id"] != entry_id]
    if len(journal["entries"]) == before:
        raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found")

    if not journal["entries"]:
        # Remove empty journal
        data["journals"] = [j for j in data["journals"] if j["id"] != journal["id"]]
    else:
        journal["updated_at"] = datetime.now(timezone.utc).isoformat()

    save_journals(data)
    return {"status": "deleted", "entry_id": entry_id}


# ---------------------------------------------------------------------------
# All-entries view (across members)
# ---------------------------------------------------------------------------


@router.get("/topic/{topic_id}/all")
async def get_all_entries_for_topic(
    topic_id: str,
    member_id: int | None = Query(default=None),
) -> list[dict[str, Any]]:
    """Get all journal entries for a topic from all (or filtered) members.

    Returns a flat list of entries with member metadata, sorted chronologically (newest first).
    """
    data = load_journals()
    members = _load_team_members()
    member_map = {m["id"]: m["name"] for m in members}

    entries: list[dict[str, Any]] = []
    for journal in data["journals"]:
        if journal["topic_id"] != topic_id:
            continue
        if member_id is not None and journal["member_id"] != member_id:
            continue

        for entry in journal["entries"]:
            entries.append({
                "id": entry["id"],
                "content": entry["content"],
                "created_at": entry["created_at"],
                "member_id": journal["member_id"],
                "member_name": member_map.get(journal["member_id"], f"Member {journal['member_id'] + 1}"),
                "journal_id": journal["id"],
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
) -> list[dict[str, Any]]:
    """Search journal entries by text content.

    Returns entries scored by relevance with member and topic metadata.
    """
    data = load_journals()
    members = _load_team_members()
    member_map = {m["id"]: m["name"] for m in members}

    scored: list[tuple[float, dict[str, Any]]] = []
    for journal in data["journals"]:
        if member_id is not None and journal["member_id"] != member_id:
            continue
        if topic_id is not None and journal["topic_id"] != topic_id:
            continue

        for entry in journal["entries"]:
            score = _search_score(q, entry["content"])
            if score > 0:
                scored.append((score, {
                    "id": entry["id"],
                    "content": entry["content"],
                    "created_at": entry["created_at"],
                    "member_id": journal["member_id"],
                    "member_name": member_map.get(
                        journal["member_id"], f"Member {journal['member_id'] + 1}"
                    ),
                    "topic_id": journal["topic_id"],
                    "journal_id": journal["id"],
                    "score": round(score, 3),
                }))

    scored.sort(key=lambda x: (-x[0], x[1]["created_at"]))
    return [item for _, item in scored[:limit]]


# ---------------------------------------------------------------------------
# Recommendations (sync def to avoid blocking event loop)
# ---------------------------------------------------------------------------


@router.get("/member/{member_id}/topic/{topic_id}/recommend")
def get_journal_recommendations(
    member_id: int,
    topic_id: str,
    limit: int = Query(default=10, ge=1, le=50),
) -> list[dict[str, Any]]:
    """Get problem recommendations based on combined journal entries."""
    data = load_journals()
    journal = _find_journal(data, member_id, topic_id)

    if not journal or not journal["entries"]:
        raise HTTPException(
            status_code=404,
            detail=f"No journal entries for member {member_id}, topic {topic_id}",
        )

    # Concatenate all entries for a richer semantic representation
    combined = "\n\n".join(e["content"] for e in journal["entries"])

    if len(combined.strip()) < 10:
        return []

    solved = _load_member_solved(member_id)
    target = _get_member_avg_rating(member_id)

    try:
        return recommend_from_text(combined, limit=limit, exclude_ids=solved, target_rating=target)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Recommendation service unavailable: {e}",
        )
