"""Review / Spaced Repetition router — surface topics needing practice."""

import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

import db_ops
from database import get_db

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data"


def _load_problems() -> list[dict[str, Any]]:
    with open(DATA_DIR / "problems.json", "r", encoding="utf-8") as f:
        return json.load(f)


def _load_topics() -> dict[str, Any]:
    with open(DATA_DIR / "topics.json", "r", encoding="utf-8") as f:
        return json.load(f)


def compute_topic_last_solved(
    member: dict[str, Any], problems: list[dict[str, Any]]
) -> dict[str, dict[str, Any]]:
    timestamps = member.get("problem_timestamps", {})
    solved_set = set(member.get("solved_curated", []))

    topic_problems: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for prob in problems:
        if prob.get("curated") and prob["id"] in solved_set:
            topic_problems[prob["topic"]].append(prob)

    topic_stats: dict[str, dict[str, Any]] = {}
    now = datetime.now(timezone.utc)

    for topic_id, probs in topic_problems.items():
        most_recent = 0
        most_recent_prob = None
        for prob in probs:
            ts = timestamps.get(prob["id"], 0)
            if ts > most_recent:
                most_recent = ts
                most_recent_prob = prob

        if most_recent == 0:
            continue

        last_date = datetime.fromtimestamp(most_recent, tz=timezone.utc)
        days_since = (now - last_date).days

        topic_stats[topic_id] = {
            "last_solved_timestamp": most_recent,
            "last_solved_date": last_date.isoformat(),
            "days_since": days_since,
            "problems_solved": len(probs),
            "last_problem_id": most_recent_prob["id"] if most_recent_prob else "",
            "last_problem_name": most_recent_prob["name"] if most_recent_prob else "",
        }

    return topic_stats


@router.get("/{member_id}")
async def get_review_topics(
    member_id: int,
    stale_days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get topics needing review for a member."""
    member_orm = await db_ops.get_member(db, member_id)
    if member_orm is None:
        raise HTTPException(status_code=404, detail=f"Member {member_id} not found")

    member = db_ops.member_to_dict(member_orm)
    problems = _load_problems()
    topics_meta = _load_topics()

    if not member.get("problem_timestamps"):
        return {
            "member_id": member_id,
            "member_name": member["name"],
            "cf_handle": member.get("cf_handle"),
            "stale_topics": [],
            "message": "No submission history synced. Sync CF handle first.",
        }

    topic_stats = compute_topic_last_solved(member, problems)

    stale_topics = []
    for topic_id, stats in topic_stats.items():
        if stats["days_since"] >= stale_days:
            topic_info = topics_meta["topics"].get(topic_id, {})

            solved_set = set(member.get("solved_curated", []))
            review_problems = [
                {
                    "id": p["id"],
                    "name": p["name"],
                    "rating": p["rating"],
                    "url": p["url"],
                }
                for p in problems
                if p.get("curated") and p["topic"] == topic_id and p["id"] not in solved_set
            ][:limit]

            stale_topics.append({
                "topic_id": topic_id,
                "topic_name": topic_info.get("name", topic_id),
                "tier": topic_info.get("tier", 0),
                "last_solved_date": stats["last_solved_date"],
                "days_since": stats["days_since"],
                "problems_solved": stats["problems_solved"],
                "last_problem": {
                    "id": stats["last_problem_id"],
                    "name": stats["last_problem_name"],
                },
                "review_problems": review_problems,
                "review_count": len(review_problems),
            })

    stale_topics.sort(key=lambda t: t["days_since"], reverse=True)

    return {
        "member_id": member_id,
        "member_name": member["name"],
        "cf_handle": member.get("cf_handle"),
        "stale_days_threshold": stale_days,
        "stale_topics": stale_topics,
        "stale_count": len(stale_topics),
    }


@router.get("/{member_id}/stats")
async def get_review_stats(member_id: int, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Get review statistics for a member across all topics."""
    member_orm = await db_ops.get_member(db, member_id)
    if member_orm is None:
        raise HTTPException(status_code=404, detail=f"Member {member_id} not found")

    member = db_ops.member_to_dict(member_orm)
    problems = _load_problems()
    topics_meta = _load_topics()

    if not member.get("problem_timestamps"):
        return {
            "member_id": member_id,
            "member_name": member["name"],
            "topics_practiced": 0,
            "topics_by_recency": {},
            "message": "No submission history synced.",
        }

    topic_stats = compute_topic_last_solved(member, problems)

    buckets = {
        "this_week": 0,
        "this_month": 0,
        "1_3_months": 0,
        "3_6_months": 0,
        "6_months_plus": 0,
    }

    for stats in topic_stats.values():
        days = stats["days_since"]
        if days <= 7:
            buckets["this_week"] += 1
        elif days <= 30:
            buckets["this_month"] += 1
        elif days <= 90:
            buckets["1_3_months"] += 1
        elif days <= 180:
            buckets["3_6_months"] += 1
        else:
            buckets["6_months_plus"] += 1

    all_topics = list(topics_meta["topics"].keys())
    practiced_topics = len(topic_stats)
    untouched_topics = len(all_topics) - practiced_topics

    return {
        "member_id": member_id,
        "member_name": member["name"],
        "topics_practiced": practiced_topics,
        "topics_untouched": untouched_topics,
        "topics_by_recency": buckets,
        "total_topics": len(all_topics),
    }
