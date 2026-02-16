"""Handle sync service — fetch CF submissions and map to curated problems."""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .cf_client import CFClient

DATA_DIR = Path(__file__).parent.parent / "data"


def load_team() -> dict[str, Any]:
    """Load team data from team.json, ensuring all members have an 'active' field."""
    path = DATA_DIR / "team.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    for m in data.get("members", []):
        if "active" not in m:
            m["active"] = True
    return data


def save_team(data: dict[str, Any]) -> None:
    """Save team data to team.json."""
    path = DATA_DIR / "team.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_curated_ids() -> set[str]:
    """Load the set of curated problem IDs from problems.json."""
    path = DATA_DIR / "problems.json"
    with open(path, "r", encoding="utf-8") as f:
        problems = json.load(f)
    return {p["id"] for p in problems}


def classify_solve(wrong_attempts: int, time_to_solve_sec: float | None) -> tuple[str, float]:
    """Classify a solve based on attempt count and time gap.

    Returns (classification, weight) where classification is one of:
    - "clean": 0-2 wrong attempts, < 4h to solve → weight 1.0
    - "struggled": 3+ wrong attempts, < 24h → weight 1.0
    - "likely_assisted": >24h gap between first attempt and AC → weight 0.6
    - "cold_ac": first try AC, no wrong attempts → weight 1.0
    """
    if wrong_attempts == 0:
        return "cold_ac", 1.0

    if time_to_solve_sec is None:
        # Shouldn't happen, but default to clean
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

    Returns (all_accepted, curated_solved, timestamps, solve_quality) where:
    - all_accepted: every unique accepted problem ID (e.g. "1352C")
    - curated_solved: only IDs in the curated 220 set
    - timestamps: dict mapping problem ID to earliest solve timestamp (Unix seconds)
    - solve_quality: dict mapping problem ID to quality classification
    """
    curated = load_curated_ids()
    seen: set[str] = set()
    timestamps: dict[str, int] = {}

    # Group all submissions by problem ID for quality analysis
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

        # Track earliest solve time for each problem
        solve_time = sub.get("creationTimeSeconds", 0)
        if pid not in timestamps or solve_time < timestamps[pid]:
            timestamps[pid] = solve_time

        seen.add(pid)

    # Compute solve quality for each accepted problem
    solve_quality: dict[str, dict[str, Any]] = {}
    for pid in seen:
        subs = problem_submissions.get(pid, [])
        # Sort by timestamp ascending
        subs.sort(key=lambda s: s.get("creationTimeSeconds", 0))

        first_attempt_ts = subs[0].get("creationTimeSeconds", 0) if subs else 0
        solve_ts = timestamps.get(pid, 0)

        # Count wrong attempts before first AC
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


def sync_member(member_id: int) -> dict[str, Any]:
    """Sync a single member's CF submissions.

    Fetches their submission history, extracts accepted problems,
    maps to curated set, and updates team.json.

    Returns dict with: member_id, cf_handle, new_solved, total_solved, last_synced.
    Raises ValueError if member has no handle or member_id is invalid.
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
    if not member.get("cf_handle"):
        raise ValueError(f"Member {member_id} ({member['name']}) has no CF handle set")

    old_curated = set(member.get("solved_curated", []))

    client = CFClient()
    submissions = client.fetch_user_submissions(member["cf_handle"])
    all_accepted, curated_solved, timestamps, solve_quality = extract_accepted_ids(submissions)

    now = datetime.now(timezone.utc).isoformat()
    member["all_accepted"] = all_accepted
    member["solved_curated"] = curated_solved
    member["problem_timestamps"] = timestamps
    member["solve_quality"] = solve_quality
    member["last_synced"] = now

    save_team(team)

    new_solved = sorted(set(curated_solved) - old_curated)
    return {
        "member_id": member_id,
        "cf_handle": member["cf_handle"],
        "new_solved": new_solved,
        "total_solved": len(curated_solved),
        "total_accepted": len(all_accepted),
        "last_synced": now,
    }


def sync_all() -> list[dict[str, Any]]:
    """Sync all members that have a CF handle set.

    Syncs sequentially to respect CF API rate limits.
    Returns list of sync results (one per synced member).
    """
    team = load_team()
    results = []
    for member in team["members"]:
        if not member.get("cf_handle"):
            continue
        try:
            result = sync_member(member["id"])
            results.append(result)
        except Exception as e:
            results.append({
                "member_id": member["id"],
                "cf_handle": member["cf_handle"],
                "error": str(e),
            })
    return results
