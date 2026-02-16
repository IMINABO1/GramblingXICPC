"""Problems router — serves curated problem list."""

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent / "data"


@router.get("/")
async def list_problems() -> list[dict[str, Any]]:
    """Return all curated problems."""
    path = DATA_DIR / "problems.json"
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/topics")
async def list_topics() -> dict[str, Any]:
    """Return topic graph and tier metadata."""
    path = DATA_DIR / "topics.json"
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
