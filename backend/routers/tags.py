"""Tags router — team-shared custom concept tags for problems."""

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
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/")
async def list_tags(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    """List all tags with problem counts."""
    tags = await db_ops.get_all_tags(db)
    result = []
    for t in tags:
        count = await db_ops.count_problems_for_tag(db, t.id)
        result.append({
            "id": t.id,
            "name": t.name,
            "color": t.color,
            "created_by": t.created_by,
            "created_at": t.created_at,
            "problem_count": count,
        })
    return result


@router.post("/")
async def create_tag(body: TagCreate, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Create a new custom tag."""
    existing = await db_ops.get_tag_by_name(db, body.name.strip())
    if existing:
        raise HTTPException(status_code=409, detail=f"Tag '{body.name}' already exists")

    tag = await db_ops.create_tag(db, name=body.name, color=body.color, created_by=body.created_by)
    return {
        "id": tag.id,
        "name": tag.name,
        "color": tag.color,
        "created_by": tag.created_by,
        "created_at": tag.created_at,
        "problem_count": 0,
    }


@router.put("/{tag_id}")
async def update_tag(tag_id: str, body: TagUpdate, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Update a tag's name or color."""
    tag = await db_ops.get_tag(db, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail=f"Tag {tag_id} not found")

    if body.name is not None:
        dup = await db_ops.get_tag_by_name(db, body.name.strip())
        if dup and dup.id != tag_id:
            raise HTTPException(status_code=409, detail=f"Tag '{body.name}' already exists")

    updates = {}
    if body.name is not None:
        updates["name"] = body.name.strip()
    if body.color is not None:
        updates["color"] = body.color

    tag = await db_ops.update_tag(db, tag, **updates)
    count = await db_ops.count_problems_for_tag(db, tag_id)
    return {
        "id": tag.id,
        "name": tag.name,
        "color": tag.color,
        "created_by": tag.created_by,
        "created_at": tag.created_at,
        "problem_count": count,
    }


@router.delete("/{tag_id}")
async def delete_tag(tag_id: str, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Delete a tag and remove it from all problems."""
    deleted = await db_ops.delete_tag(db, tag_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Tag {tag_id} not found")
    return {"status": "deleted", "id": tag_id}


@router.get("/problem/{problem_id}")
async def get_problem_tags(problem_id: str, db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    """Get all tags assigned to a specific problem."""
    tags = await db_ops.get_problem_tags(db, problem_id)
    result = []
    for t in tags:
        count = await db_ops.count_problems_for_tag(db, t.id)
        result.append({
            "id": t.id,
            "name": t.name,
            "color": t.color,
            "created_by": t.created_by,
            "created_at": t.created_at,
            "problem_count": count,
        })
    return result


@router.post("/problem/{problem_id}")
async def add_problem_tags(
    problem_id: str, body: ProblemTagsUpdate, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    """Add tags to a problem."""
    # Validate all tag IDs exist
    for tid in body.tag_ids:
        tag = await db_ops.get_tag(db, tid)
        if not tag:
            raise HTTPException(status_code=404, detail=f"Tag {tid} not found")

    count = await db_ops.add_problem_tags(db, problem_id, body.tag_ids)
    return {"status": "updated", "problem_id": problem_id, "tag_count": count}


@router.delete("/problem/{problem_id}/{tag_id}")
async def remove_problem_tag(
    problem_id: str, tag_id: str, db: AsyncSession = Depends(get_db)
) -> dict[str, str]:
    """Remove a tag from a problem."""
    removed = await db_ops.remove_problem_tag(db, problem_id, tag_id)
    if not removed:
        raise HTTPException(status_code=404, detail=f"Tag {tag_id} not on problem {problem_id}")
    return {"status": "removed", "problem_id": problem_id, "tag_id": tag_id}


@router.get("/by-tag/{tag_id}")
async def get_problems_by_tag(tag_id: str, db: AsyncSession = Depends(get_db)) -> list[str]:
    """Get all problem IDs that have a specific tag."""
    tag = await db_ops.get_tag(db, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail=f"Tag {tag_id} not found")
    return await db_ops.get_problems_by_tag(db, tag_id)
