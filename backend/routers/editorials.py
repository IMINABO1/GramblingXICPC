"""Editorials router — provides editorial/tutorial links for problems."""

from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from services.editorial_fetcher import EditorialFetcher

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent / "data"
EDITORIAL_CACHE_PATH = DATA_DIR / "editorials.json"

# Initialize editorial fetcher
editorial_fetcher = EditorialFetcher(EDITORIAL_CACHE_PATH)


@router.get("/{problem_id}")
async def get_editorial(problem_id: str) -> dict[str, Any]:
    """
    Get editorial information for a specific problem.

    Returns:
        - problem_id: The problem ID
        - problem_url: Direct link to the problem page (always available)
        - editorial_url: Link to the editorial/tutorial (if available)
        - has_editorial: Boolean indicating if editorial was found
    """
    problem_url = editorial_fetcher.get_problem_url(problem_id)
    editorial_url = editorial_fetcher.get_editorial_url(problem_id)

    return {
        "problem_id": problem_id,
        "problem_url": problem_url,
        "editorial_url": editorial_url,
        "has_editorial": editorial_url is not None
    }


@router.post("/bulk")
async def get_editorials_bulk(body: dict[str, Any]) -> dict[str, Any]:
    """
    Get editorials for multiple problems at once.

    Request body:
        - problem_ids: List of problem IDs to fetch
        - max_count: Optional maximum number to fetch (default 50)

    Returns:
        - editorials: Dict mapping problem_id -> editorial info
        - fetched_count: Number of problems processed
    """
    problem_ids = body.get("problem_ids", [])
    max_count = body.get("max_count", 50)

    if not problem_ids:
        raise HTTPException(status_code=400, detail="problem_ids is required")

    if not isinstance(problem_ids, list):
        raise HTTPException(status_code=400, detail="problem_ids must be a list")

    # Fetch editorials
    results = editorial_fetcher.bulk_fetch(problem_ids, max_count)

    # Format response
    editorials = {}
    for problem_id, editorial_url in results.items():
        editorials[problem_id] = {
            "problem_id": problem_id,
            "problem_url": editorial_fetcher.get_problem_url(problem_id),
            "editorial_url": editorial_url,
            "has_editorial": editorial_url is not None
        }

    return {
        "editorials": editorials,
        "fetched_count": len(editorials)
    }


@router.get("/")
async def list_cached_editorials() -> dict[str, Any]:
    """
    List all cached editorial data.

    Returns:
        - editorials: All cached editorial info
        - count: Total number of cached editorials
    """
    editorials = {}

    for problem_id, data in editorial_fetcher.cache.items():
        editorials[problem_id] = {
            "problem_id": problem_id,
            "problem_url": editorial_fetcher.get_problem_url(problem_id),
            "editorial_url": data.get("url"),
            "has_editorial": data.get("url") is not None,
            "checked": data.get("checked", False)
        }

    return {
        "editorials": editorials,
        "count": len(editorials)
    }
