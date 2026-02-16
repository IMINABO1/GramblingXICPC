"""Codeforces proxy router — forwards requests to CF API to avoid CORS."""

from typing import Any

from fastapi import APIRouter, HTTPException

from services.cf_client import CFClient

router = APIRouter()


@router.get("/")
async def cf_proxy_status() -> dict[str, str]:
    """CF API proxy status."""
    return {"status": "ok"}


@router.get("/contest/{contest_id}")
async def get_contest_info(contest_id: int) -> dict[str, Any]:
    """Fetch contest info and problem list from the CF API."""
    client = CFClient()
    try:
        result = client._request(
            "contest.standings",
            params={"contestId": str(contest_id), "from": "1", "count": "1"},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"CF API error: {e}")

    contest = result["contest"]
    problems = result["problems"]
    return {
        "id": contest["id"],
        "name": contest["name"],
        "duration_seconds": contest["durationSeconds"],
        "problems": [
            {"index": p["index"], "name": p["name"]}
            for p in problems
        ],
    }
