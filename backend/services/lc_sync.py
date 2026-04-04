"""LeetCode sync service — fetch LC skill data and store in database."""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

import db_ops
from .lc_client import LCClient
from .lc_tag_mapping import estimate_cf_rating_from_lc, map_lc_tags_to_topics


async def sync_lc_member(db: AsyncSession, member_id: int) -> dict[str, Any]:
    """Sync a single member's LeetCode skill data.

    Fetches tag counts and difficulty stats, maps to our topics, stores in database.
    Returns summary dict.
    Raises ValueError if member has no lc_handle.
    """
    member = await db_ops.get_member(db, member_id)
    if member is None:
        raise ValueError(f"Member {member_id} not found")
    if not member.lc_handle:
        raise ValueError(f"Member {member_id} ({member.name}) has no LeetCode handle set")

    client = LCClient()

    tag_counts = client.fetch_tag_problem_counts(member.lc_handle)
    difficulty_stats = client.fetch_difficulty_stats(member.lc_handle)

    topic_skill = map_lc_tags_to_topics(tag_counts)
    estimated_rating = estimate_cf_rating_from_lc(difficulty_stats)

    now = datetime.now(timezone.utc).isoformat()

    lc_data = {
        "tag_counts_raw": tag_counts,
        "difficulty_stats": difficulty_stats,
        "topic_skill": topic_skill,
        "estimated_cf_rating": estimated_rating,
        "lc_synced": now,
    }

    await db_ops.update_member(db, member, lc_data=lc_data, lc_synced=now)

    return {
        "member_id": member_id,
        "lc_handle": member.lc_handle,
        "total_lc_solved": difficulty_stats.get("All", 0),
        "easy": difficulty_stats.get("Easy", 0),
        "medium": difficulty_stats.get("Medium", 0),
        "hard": difficulty_stats.get("Hard", 0),
        "topics_with_signal": len(topic_skill),
        "estimated_cf_rating": estimated_rating,
        "lc_synced": now,
    }


async def sync_lc_all(db: AsyncSession) -> list[dict[str, Any]]:
    """Sync LC data for all members that have an LC handle."""
    members = await db_ops.get_all_members(db)
    results = []
    for member in members:
        if not member.lc_handle:
            continue
        try:
            result = await sync_lc_member(db, member.id)
            results.append(result)
        except Exception as e:
            results.append({
                "member_id": member.id,
                "lc_handle": member.lc_handle,
                "error": str(e),
            })
    return results
