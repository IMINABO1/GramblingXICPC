"""Handle sync service — fetch CF submissions and map to curated problems."""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

import db_ops
from .cf_client import CFClient

DATA_DIR = Path(__file__).parent.parent / "data"


def load_curated_ids() -> set[str]:
    """Load the set of curated problem IDs from problems.json."""
    path = DATA_DIR / "problems.json"
    with open(path, "r", encoding="utf-8") as f:
        problems = json.load(f)
    return {p["id"] for p in problems}


def classify_solve(wrong_attempts: int, time_to_solve_sec: float | None) -> tuple[str, float]:
    """Classify a solve based on attempt count and time gap.

    Returns (classification, weight) where classification is one of:
    - "clean": 0-2 wrong attempts, < 4h to solve -> weight 1.0
    - "struggled": 3+ wrong attempts, < 24h -> weight 1.0
    - "likely_assisted": >24h gap between first attempt and AC -> weight 0.6
    - "cold_ac": first try AC, no wrong attempts -> weight 1.0
    """
    if wrong_attempts == 0:
        return "cold_ac", 1.0

    if time_to_solve_sec is None:
        return "clean", 1.0

    hours = time_to_solve_sec / 3600

    if hours > 24:
        return "likely_assisted", 0.6
    elif wrong_attempts <= 2:
        return "clean", 1.0
    else:
        return "struggled", 1.0


def extract_accepted_ids(
    submissions: list[dict[str, Any]],
) -> tuple[list[str], list[str], dict[str, int], dict[str, dict[str, Any]]]:
    """Extract accepted problem IDs and solve quality from CF submissions.

    Returns (all_accepted, curated_solved, timestamps, solve_quality).
    """
    curated = load_curated_ids()
    seen: set[str] = set()
    timestamps: dict[str, int] = {}

    problem_submissions: dict[str, list[dict[str, Any]]] = {}

    for sub in submissions:
        problem = sub.get("problem", {})
        contest_id = problem.get("contestId")
        index = problem.get("index")
        if contest_id is None or index is None:
            continue
        pid = f"{contest_id}{index}"

        if pid not in problem_submissions:
            problem_submissions[pid] = []
        problem_submissions[pid].append(sub)

        if sub.get("verdict") != "OK":
            continue

        solve_time = sub.get("creationTimeSeconds", 0)
        if pid not in timestamps or solve_time < timestamps[pid]:
            timestamps[pid] = solve_time

        seen.add(pid)

    solve_quality: dict[str, dict[str, Any]] = {}
    for pid in seen:
        subs = problem_submissions.get(pid, [])
        subs.sort(key=lambda s: s.get("creationTimeSeconds", 0))

        first_attempt_ts = subs[0].get("creationTimeSeconds", 0) if subs else 0
        solve_ts = timestamps.get(pid, 0)

        wrong_attempts = 0
        for s in subs:
            ts = s.get("creationTimeSeconds", 0)
            if ts > solve_ts:
                break
            if s.get("verdict") != "OK":
                wrong_attempts += 1

        time_to_solve = (solve_ts - first_attempt_ts) if first_attempt_ts > 0 else None
        classification, weight = classify_solve(wrong_attempts, time_to_solve)

        solve_quality[pid] = {
            "classification": classification,
            "wrong_attempts": wrong_attempts,
            "time_to_solve_hrs": round(time_to_solve / 3600, 1) if time_to_solve else None,
            "weight": weight,
        }

    all_accepted = sorted(seen)
    curated_solved = sorted(seen & curated)
    return all_accepted, curated_solved, timestamps, solve_quality


async def sync_member(db: AsyncSession, member_id: int) -> dict[str, Any]:
    """Sync a single member's CF submissions.

    Fetches their submission history, extracts accepted problems,
    maps to curated set, and updates the database.

    Returns dict with: member_id, cf_handle, new_solved, total_solved, last_synced.
    Raises ValueError if member has no handle or member_id is invalid.
    """
    member = await db_ops.get_member(db, member_id)
    if member is None:
        raise ValueError(f"Member {member_id} not found")
    if not member.cf_handle:
        raise ValueError(f"Member {member_id} ({member.name}) has no CF handle set")

    old_curated = set(await db_ops.get_member_solved_curated(db, member_id))

    client = CFClient()
    submissions = client.fetch_user_submissions(member.cf_handle)
    all_accepted, curated_solved, timestamps, solve_quality = extract_accepted_ids(submissions)

    curated_ids = load_curated_ids()
    now = datetime.now(timezone.utc).isoformat()

    await db_ops.sync_member_solved(
        db,
        member_id,
        all_accepted,
        curated_ids,
        timestamps,
        solve_quality,
    )

    member = await db_ops.update_member(db, member, last_synced=now)

    new_solved = sorted(set(curated_solved) - old_curated)
    return {
        "member_id": member_id,
        "cf_handle": member.cf_handle,
        "new_solved": new_solved,
        "total_solved": len(curated_solved),
        "total_accepted": len(all_accepted),
        "last_synced": now,
    }


async def sync_all(db: AsyncSession) -> list[dict[str, Any]]:
    """Sync all members that have a CF handle set.

    Syncs sequentially to respect CF API rate limits.
    Returns list of sync results (one per synced member).
    """
    members = await db_ops.get_all_members(db)
    results = []
    for member in members:
        if not member.cf_handle:
            continue
        try:
            result = await sync_member(db, member.id)
            results.append(result)
        except Exception as e:
            results.append({
                "member_id": member.id,
                "cf_handle": member.cf_handle,
                "error": str(e),
            })
    return results
