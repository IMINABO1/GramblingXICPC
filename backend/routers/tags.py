"""Tags router — team-shared custom concept tags for problems."""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

DATA_DIR = Path(__file__).parent.parent / "data"
TAGS_FILE = DATA_DIR / "tags.json"

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class TagCreate(BaseModel):
    name: str
    color: str = "#00ffa3"
    created_by: int


class TagUpdate(BaseModel):
    name: str | None = None
    color: str | None = None


class ProblemTagsUpdate(BaseModel):
    tag_ids: list[str]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def load_tags() -> dict[str, Any]:
    if not TAGS_FILE.exists():
        return {"tags": [], "problem_tags": {}}
    with open(TAGS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_tags(data: dict[str, Any]) -> None:
    with open(TAGS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _find_tag(data: dict[str, Any], tag_id: str) -> dict[str, Any]:
    for t in data["tags"]:
        if t["id"] == tag_id:
            return t
    raise HTTPException(status_code=404, detail=f"Tag {tag_id} not found")


def _count_problems(data: dict[str, Any], tag_id: str) -> int:
    """Count how many problems have this tag."""
    count = 0
    for tag_ids in data["problem_tags"].values():
        if tag_id in tag_ids:
            count += 1
    return count


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/")
async def list_tags() -> list[dict[str, Any]]:
    """List all tags with problem counts."""
    data = load_tags()
    return [
        {**t, "problem_count": _count_problems(data, t["id"])}
        for t in data["tags"]
    ]


@router.post("/")
async def create_tag(body: TagCreate) -> dict[str, Any]:
    """Create a new custom tag."""
    data = load_tags()

    # Check for duplicate name (case-insensitive)
    for t in data["tags"]:
        if t["name"].lower() == body.name.strip().lower():
            raise HTTPException(status_code=409, detail=f"Tag '{body.name}' already exists")

    tag = {
        "id": f"tag_{uuid.uuid4().hex[:8]}",
        "name": body.name.strip(),
        "color": body.color,
        "created_by": body.created_by,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    data["tags"].append(tag)
    save_tags(data)
    return {**tag, "problem_count": 0}


@router.put("/{tag_id}")
async def update_tag(tag_id: str, body: TagUpdate) -> dict[str, Any]:
    """Update a tag's name or color."""
    data = load_tags()
    tag = _find_tag(data, tag_id)

    if body.name is not None:
        # Check for duplicate name
        for t in data["tags"]:
            if t["id"] != tag_id and t["name"].lower() == body.name.strip().lower():
                raise HTTPException(status_code=409, detail=f"Tag '{body.name}' already exists")
        tag["name"] = body.name.strip()
    if body.color is not None:
        tag["color"] = body.color

    save_tags(data)
    return {**tag, "problem_count": _count_problems(data, tag_id)}


@router.delete("/{tag_id}")
async def delete_tag(tag_id: str) -> dict[str, str]:
    """Delete a tag and remove it from all problems."""
    data = load_tags()
    before = len(data["tags"])
    data["tags"] = [t for t in data["tags"] if t["id"] != tag_id]
    if len(data["tags"]) == before:
        raise HTTPException(status_code=404, detail=f"Tag {tag_id} not found")

    # Remove from all problem_tags
    for pid in list(data["problem_tags"]):
        data["problem_tags"][pid] = [
            tid for tid in data["problem_tags"][pid] if tid != tag_id
        ]
        if not data["problem_tags"][pid]:
            del data["problem_tags"][pid]

    save_tags(data)
    return {"status": "deleted", "id": tag_id}


@router.get("/problem/{problem_id}")
async def get_problem_tags(problem_id: str) -> list[dict[str, Any]]:
    """Get all tags assigned to a specific problem."""
    data = load_tags()
    tag_ids = data["problem_tags"].get(problem_id, [])
    tag_map = {t["id"]: t for t in data["tags"]}
    return [
        {**tag_map[tid], "problem_count": _count_problems(data, tid)}
        for tid in tag_ids
        if tid in tag_map
    ]


@router.post("/problem/{problem_id}")
async def add_problem_tags(problem_id: str, body: ProblemTagsUpdate) -> dict[str, Any]:
    """Add tags to a problem."""
    data = load_tags()
    valid_ids = {t["id"] for t in data["tags"]}

    # Validate all tag IDs exist
    for tid in body.tag_ids:
        if tid not in valid_ids:
            raise HTTPException(status_code=404, detail=f"Tag {tid} not found")

    existing = set(data["problem_tags"].get(problem_id, []))
    existing.update(body.tag_ids)
    data["problem_tags"][problem_id] = list(existing)

    save_tags(data)
    return {"status": "updated", "problem_id": problem_id, "tag_count": len(existing)}


@router.delete("/problem/{problem_id}/{tag_id}")
async def remove_problem_tag(problem_id: str, tag_id: str) -> dict[str, str]:
    """Remove a tag from a problem."""
    data = load_tags()
    tags = data["problem_tags"].get(problem_id, [])
    if tag_id not in tags:
        raise HTTPException(status_code=404, detail=f"Tag {tag_id} not on problem {problem_id}")

    tags.remove(tag_id)
    if tags:
        data["problem_tags"][problem_id] = tags
    else:
        del data["problem_tags"][problem_id]

    save_tags(data)
    return {"status": "removed", "problem_id": problem_id, "tag_id": tag_id}


@router.get("/by-tag/{tag_id}")
async def get_problems_by_tag(tag_id: str) -> list[str]:
    """Get all problem IDs that have a specific tag."""
    data = load_tags()
    # Verify tag exists
    _find_tag(data, tag_id)

    return [
        pid for pid, tag_ids in data["problem_tags"].items()
        if tag_id in tag_ids
    ]
