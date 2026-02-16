"""Leaderboard & Weekly Reports — rankings, streaks, weekly stats."""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Query

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data"


def load_team() -> dict[str, Any]:
    with open(DATA_DIR / "team.json", "r", encoding="utf-8") as f:
        return json.load(f)


def load_problems() -> list[dict[str, Any]]:
    with open(DATA_DIR / "problems.json", "r", encoding="utf-8") as f:
        return json.load(f)


def load_topics() -> dict[str, Any]:
    with open(DATA_DIR / "topics.json", "r", encoding="utf-8") as f:
        return json.load(f)


def compute_streaks(timestamps: dict[str, int]) -> dict[str, Any]:
    """Compute current and longest streak from solve timestamps."""
    if not timestamps:
        return {"current_streak": 0, "longest_streak": 0, "last_active_date": None}

    solve_dates = sorted({
        datetime.fromtimestamp(ts, tz=timezone.utc).date()
        for ts in timestamps.values()
    })

    if not solve_dates:
        return {"current_streak": 0, "longest_streak": 0, "last_active_date": None}

    # Compute longest streak
    longest = 1
    run = 1
    for i in range(1, len(solve_dates)):
        if (solve_dates[i] - solve_dates[i - 1]).days == 1:
            run += 1
            longest = max(longest, run)
        else:
            run = 1

    # Current streak: must include today or yesterday
    today = datetime.now(timezone.utc).date()
    if solve_dates[-1] < today - timedelta(days=1):
        current_streak = 0
    else:
        current_streak = 1
        for i in range(len(solve_dates) - 2, -1, -1):
            if (solve_dates[i + 1] - solve_dates[i]).days == 1:
                current_streak += 1
            else:
                break

    return {
        "current_streak": current_streak,
        "longest_streak": longest,
        "last_active_date": solve_dates[-1].isoformat(),
    }


def compute_weekly_solves(
    timestamps: dict[str, int],
    curated_ids: set[str],
    weeks: int,
) -> list[dict[str, Any]]:
    """Count curated solves per ISO week (Monday-Sunday UTC)."""
    today = datetime.now(timezone.utc).date()
    current_monday = today - timedelta(days=today.weekday())

    result = []
    for w in range(weeks):
        week_start = current_monday - timedelta(weeks=w)
        week_end = week_start + timedelta(days=6)
        start_ts = int(datetime(
            week_start.year, week_start.month, week_start.day,
            tzinfo=timezone.utc,
        ).timestamp())
        end_ts = int(datetime(
            week_end.year, week_end.month, week_end.day, 23, 59, 59,
            tzinfo=timezone.utc,
        ).timestamp())

        count = sum(
            1 for pid, ts in timestamps.items()
            if pid in curated_ids and start_ts <= ts <= end_ts
        )
        result.append({
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "count": count,
        })

    return result


def compute_topic_coverage(
    solved_curated: list[str],
    problems: list[dict[str, Any]],
    topics_meta: dict[str, Any],
) -> list[dict[str, Any]]:
    """Per-topic solved/total/pct for a member."""
    solved_set = set(solved_curated)
    topic_totals: dict[str, int] = {}
    topic_solved: dict[str, int] = {}

    for p in problems:
        t = p["topic"]
        topic_totals[t] = topic_totals.get(t, 0) + 1
        if p["id"] in solved_set:
            topic_solved[t] = topic_solved.get(t, 0) + 1

    result = []
    for topic_id, topic_info in topics_meta["topics"].items():
        total = topic_totals.get(topic_id, 0)
        solved = topic_solved.get(topic_id, 0)
        result.append({
            "topic_id": topic_id,
            "topic_name": topic_info["name"],
            "tier": topic_info["tier"],
            "solved": solved,
            "total": total,
            "pct": round(solved / total * 100, 1) if total > 0 else 0.0,
        })

    return result


@router.get("/")
async def get_leaderboard(
    weeks: int = Query(default=8, ge=1, le=52, description="Weeks of history"),
) -> dict[str, Any]:
    """Full leaderboard with rankings, streaks, weekly solves, topic coverage."""
    team = load_team()
    problems = load_problems()
    topics_meta = load_topics()

    curated_ids = {p["id"] for p in problems}
    curated_total = len(problems)
    total_topics = len(topics_meta["topics"])

    # Build per-problem lookup
    pid_to_problem = {p["id"]: p for p in problems}

    members = []
    for m in team["members"]:
        solved = m.get("solved_curated", [])
        timestamps = m.get("problem_timestamps", {})

        # Avg rating of solved curated problems
        solved_ratings = [
            pid_to_problem[pid]["rating"]
            for pid in solved
            if pid in pid_to_problem
        ]
        avg_rating = round(sum(solved_ratings) / len(solved_ratings), 1) if solved_ratings else 0.0

        # Topics touched
        topics_touched = len({
            pid_to_problem[pid]["topic"]
            for pid in solved
            if pid in pid_to_problem
        })

        members.append({
            "id": m["id"],
            "name": m["name"],
            "cf_handle": m.get("cf_handle"),
            "curated_solved": len(solved),
            "curated_total": curated_total,
            "avg_rating_solved": avg_rating,
            "topics_touched": topics_touched,
            "total_accepted": len(m.get("all_accepted", [])),
            "streak": compute_streaks(timestamps),
            "weekly_solves": compute_weekly_solves(timestamps, curated_ids, weeks),
            "topic_coverage": compute_topic_coverage(solved, problems, topics_meta),
        })

    # Sort by curated_solved desc, then by avg_rating desc as tiebreaker
    members.sort(key=lambda x: (x["curated_solved"], x["avg_rating_solved"]), reverse=True)

    return {
        "members": members,
        "curated_total": curated_total,
        "total_topics": total_topics,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/weekly-summary")
async def get_weekly_summary(
    week_offset: int = Query(default=0, ge=0, le=52, description="0=this week, 1=last week"),
) -> dict[str, Any]:
    """Pre-formatted weekly summary for Discord/Slack."""
    team = load_team()
    problems = load_problems()
    topics_meta = load_topics()

    curated_ids = {p["id"] for p in problems}
    pid_to_topic = {p["id"]: p["topic"] for p in problems}

    today = datetime.now(timezone.utc).date()
    current_monday = today - timedelta(days=today.weekday())
    target_monday = current_monday - timedelta(weeks=week_offset)
    target_sunday = target_monday + timedelta(days=6)

    start_ts = int(datetime(
        target_monday.year, target_monday.month, target_monday.day,
        tzinfo=timezone.utc,
    ).timestamp())
    end_ts = int(datetime(
        target_sunday.year, target_sunday.month, target_sunday.day, 23, 59, 59,
        tzinfo=timezone.utc,
    ).timestamp())

    total_team_solves = 0
    member_rows = []

    for m in team["members"]:
        timestamps = m.get("problem_timestamps", {})
        week_pids = [
            pid for pid, ts in timestamps.items()
            if pid in curated_ids and start_ts <= ts <= end_ts
        ]
        count = len(week_pids)
        total_team_solves += count

        streak = compute_streaks(timestamps)
        week_topics = {pid_to_topic[pid] for pid in week_pids if pid in pid_to_topic}

        member_rows.append({
            "name": m["name"],
            "count": count,
            "total": len(m.get("solved_curated", [])),
            "streak": streak["current_streak"],
            "topics": week_topics,
        })

    member_rows.sort(key=lambda x: x["count"], reverse=True)

    curated_total = len(problems)
    medals = ["\U0001f947", "\U0001f948", "\U0001f949"]  # gold, silver, bronze

    lines = [
        f"## CF:ICPC Weekly Report",
        f"**{target_monday.strftime('%b %d')} \u2013 {target_sunday.strftime('%b %d, %Y')}**",
        "",
        "| # | Member | This Week | Total | Streak |",
        "|---|--------|-----------|-------|--------|",
    ]

    for i, row in enumerate(member_rows):
        rank = medals[i] if i < 3 and row["count"] > 0 else f"{i + 1}."
        streak_str = f"{row['streak']}d \U0001f525" if row["streak"] > 0 else "\u2014"
        lines.append(
            f"| {rank} | {row['name']} | {row['count']} | "
            f"{row['total']}/{curated_total} | {streak_str} |"
        )

    lines.append("")
    lines.append(f"**Team total this week:** {total_team_solves} problems")

    all_week_topics: set[str] = set()
    for row in member_rows:
        all_week_topics.update(row["topics"])
    if all_week_topics:
        topic_names = sorted(
            topics_meta["topics"][t]["name"]
            for t in all_week_topics
            if t in topics_meta["topics"]
        )
        lines.append(f"**Topics covered:** {', '.join(topic_names)}")

    summary_text = "\n".join(lines)

    return {
        "week_start": target_monday.isoformat(),
        "week_end": target_sunday.isoformat(),
        "summary_text": summary_text,
    }
