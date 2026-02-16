"""LeetCode sync service — fetch LC skill data and store in team.json."""

from datetime import datetime, timezone
from typing import Any

from .handle_sync import load_team, save_team
from .lc_client import LCClient
from .lc_tag_mapping import estimate_cf_rating_from_lc, map_lc_tags_to_topics


def sync_lc_member(member_id: int) -> dict[str, Any]:
    """Sync a single member's LeetCode skill data.

    Fetches tag counts and difficulty stats, maps to our topics, stores in team.json.
    Returns summary dict.
    Raises ValueError if member has no lc_handle.
    """
    team = load_team()
    members = team["members"]

    member = None
    for m in members:
        if m["id"] == member_id:
            member = m
            break
    if member is None:
        raise ValueError(f"Member {member_id} not found")
    if not member.get("lc_handle"):
        raise ValueError(f"Member {member_id} ({member['name']}) has no LeetCode handle set")

    client = LCClient()

    # Fetch both data points
    tag_counts = client.fetch_tag_problem_counts(member["lc_handle"])
    difficulty_stats = client.fetch_difficulty_stats(member["lc_handle"])

    # Map to our topics
    topic_skill = map_lc_tags_to_topics(tag_counts)
    estimated_rating = estimate_cf_rating_from_lc(difficulty_stats)

    now = datetime.now(timezone.utc).isoformat()

    # Store in member data
    member["lc_data"] = {
        "tag_counts_raw": tag_counts,
        "difficulty_stats": difficulty_stats,
        "topic_skill": topic_skill,
        "estimated_cf_rating": estimated_rating,
        "lc_synced": now,
    }

    save_team(team)

    return {
        "member_id": member_id,
        "lc_handle": member["lc_handle"],
        "total_lc_solved": difficulty_stats.get("All", 0),
        "easy": difficulty_stats.get("Easy", 0),
        "medium": difficulty_stats.get("Medium", 0),
        "hard": difficulty_stats.get("Hard", 0),
        "topics_with_signal": len(topic_skill),
        "estimated_cf_rating": estimated_rating,
        "lc_synced": now,
    }


def sync_lc_all() -> list[dict[str, Any]]:
    """Sync LC data for all members that have an LC handle."""
    team = load_team()
    results = []
    for member in team["members"]:
        if not member.get("lc_handle"):
            continue
        try:
            result = sync_lc_member(member["id"])
            results.append(result)
        except Exception as e:
            results.append({
                "member_id": member["id"],
                "lc_handle": member.get("lc_handle"),
                "error": str(e),
            })
    return results
