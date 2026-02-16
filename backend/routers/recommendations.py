"""Recommendations router — personalized problem suggestions."""

import json
import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent / "data"


def _load_graph() -> dict[str, Any] | None:
    path = DATA_DIR / "graph.json"
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_problems() -> list[dict[str, Any]]:
    path = DATA_DIR / "problems.json"
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_team() -> dict[str, Any]:
    path = DATA_DIR / "team.json"
    if not path.exists():
        return {"members": []}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_topics() -> dict[str, Any]:
    path = DATA_DIR / "topics.json"
    if not path.exists():
        return {"topics": {}}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _problem_id_to_graph_key(pid: str) -> str | None:
    """Convert problem ID like '1A' or '1352C2' to graph key like '1/A' or '1352/C2'."""
    m = re.match(r"^(\d+)([A-Za-z]\d*)$", pid)
    if not m:
        return None
    return f"{m.group(1)}/{m.group(2)}"


def _find_member(team: dict[str, Any], member_id: int) -> dict[str, Any]:
    for m in team["members"]:
        if m["id"] == member_id:
            return m
    raise HTTPException(status_code=404, detail=f"Member {member_id} not found")


def _get_avg_rating(
    solved_ids: set[str],
    problems_map: dict[str, dict[str, Any]],
    member: dict[str, Any] | None = None,
) -> float:
    """Calculate average rating, blending CF and LC signals.

    CF ratings are weighted by solve quality (editorial solves count less).
    LC estimated rating is blended in at 0.5 weight per solve.
    """
    editorial_flags = (member or {}).get("editorial_flags") or {}
    solve_quality = (member or {}).get("solve_quality") or {}

    weighted_sum = 0.0
    cf_weight = 0.0
    for pid in solved_ids:
        if pid not in problems_map or not problems_map[pid].get("rating"):
            continue
        rating = problems_map[pid]["rating"]

        # Apply solve quality weight
        if pid in editorial_flags:
            w = 0.5
        else:
            sq = solve_quality.get(pid)
            w = sq["weight"] if sq else 1.0

        weighted_sum += rating * w
        cf_weight += w

    cf_avg = weighted_sum / cf_weight if cf_weight > 0 else 1200

    # Blend with LC estimated rating if available
    lc_data = (member or {}).get("lc_data") or {}
    lc_estimated = lc_data.get("estimated_cf_rating")
    if lc_estimated is None:
        return cf_avg

    # LC gets 0.5 weight per solve (lower confidence in LC-to-CF mapping)
    lc_total = lc_data.get("difficulty_stats", {}).get("All", 0)
    lc_weight = lc_total * 0.5
    total_weight = max(cf_weight, 1.0) + lc_weight

    return (cf_avg * max(cf_weight, 1.0) + lc_estimated * lc_weight) / total_weight


def _get_topic_counts(solved_ids: set[str], problems_map: dict[str, dict[str, Any]]) -> dict[str, int]:
    """Count solved problems per topic."""
    counts: dict[str, int] = {}
    for pid in solved_ids:
        if pid in problems_map:
            topic = problems_map[pid].get("topic", "")
            if topic:
                counts[topic] = counts.get(topic, 0) + 1
    return counts


@router.get("/{member_id}")
async def get_recommendations(
    member_id: int,
    seed_problem: str | None = Query(default=None, description="Problem ID to base recommendations on"),
    limit: int = Query(default=10, ge=1, le=50),
    difficulty_range: int = Query(default=200, ge=0, le=400, description="Max rating difference from member's level"),
) -> dict[str, Any]:
    """
    Get personalized problem recommendations for a team member.

    If seed_problem is provided, recommendations are based on similar problems in the graph.
    Otherwise, recommendations are based on the member's weakest topics and difficulty progression.
    """
    graph = _load_graph()
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not built yet.")

    problems = _load_problems()
    if not problems:
        raise HTTPException(status_code=404, detail="No problems found.")

    team = _load_team()
    member = _find_member(team, member_id)

    topics_data = _load_topics()
    topics = topics_data.get("topics", {})

    # Build problem lookup maps
    problems_map: dict[str, dict[str, Any]] = {p["id"]: p for p in problems}

    # Get member's solved problems
    solved_curated = set(member.get("solved_curated", []))

    # Calculate member's average rating (blending CF + LC)
    avg_rating = _get_avg_rating(solved_curated, problems_map, member)

    # Get member's topic distribution
    topic_counts = _get_topic_counts(solved_curated, problems_map)

    # Collect candidate problems
    candidates: list[tuple[dict[str, Any], float]] = []  # (problem, score)

    if seed_problem:
        # Recommendation mode: based on a specific problem
        if seed_problem not in problems_map:
            raise HTTPException(status_code=404, detail=f"Seed problem {seed_problem} not found.")

        seed_key = _problem_id_to_graph_key(seed_problem)
        if not seed_key:
            raise HTTPException(status_code=400, detail=f"Invalid seed problem ID: {seed_problem}")

        neighbors = graph.get("neighbors", {}).get(seed_key, [])
        if not neighbors:
            raise HTTPException(status_code=404, detail=f"No neighbors found for {seed_problem}")

        seed_rating = problems_map[seed_problem].get("rating", avg_rating)

        # Score neighbors based on similarity and difficulty progression
        for nb in neighbors:
            # Convert graph key back to problem ID
            nb_key = nb["id"]
            nb_id = nb_key.replace("/", "")

            if nb_id not in problems_map or nb_id in solved_curated:
                continue

            prob = problems_map[nb_id]
            prob_rating = prob.get("rating", 0)

            # Filter by difficulty range
            if abs(prob_rating - seed_rating) > difficulty_range:
                continue

            # Base score from similarity
            score = nb["score"]

            # Bonus for slightly harder problems (encourage progression)
            rating_diff = prob_rating - seed_rating
            if 0 < rating_diff <= 150:
                score += 0.05
            elif rating_diff > 150:
                score -= 0.02

            candidates.append((prob, score))

    else:
        # Discovery mode: recommend problems based on weak topics and skill level
        target_min_rating = int(avg_rating - 100)
        target_max_rating = int(avg_rating + difficulty_range)

        # LC skill data for weak topic adjustment
        lc_data = member.get("lc_data") or {}
        lc_topic_skill = lc_data.get("topic_skill", {})

        # Identify weak topics — LC experience can reduce weakness
        weak_topics: list[str] = []
        all_topic_ids = list(topics.keys()) if topics else list(topic_counts.keys())
        for topic_id in all_topic_ids:
            cf_count = topic_counts.get(topic_id, 0)
            lc_count = lc_topic_skill.get(topic_id, 0.0)
            # Not weak if: 5+ CF solves, OR 3+ CF AND 5+ LC (combined signal)
            combined_sufficient = cf_count >= 3 and lc_count >= 5
            if cf_count < 5 and not combined_sufficient:
                weak_topics.append(topic_id)

        # If member has solved < 10 problems total, recommend from foundations
        if len(solved_curated) < 10:
            weak_topics = ["implementation", "math_basic", "sorting"]

        for prob in problems:
            if prob["id"] in solved_curated:
                continue

            prob_rating = prob.get("rating", 0)
            prob_topic = prob.get("topic", "")

            # Filter by difficulty
            if not (target_min_rating <= prob_rating <= target_max_rating):
                continue

            # Calculate base score
            score = 0.5

            # Boost if topic is weak
            if prob_topic in weak_topics:
                score += 0.3

            # Boost if rating is in sweet spot (slightly above average)
            rating_diff = prob_rating - avg_rating
            if 0 <= rating_diff <= 150:
                score += 0.15
            elif -100 <= rating_diff < 0:
                score += 0.05

            # Boost if topic has prerequisites the member has worked on
            topic_data = topics.get(prob_topic, {})
            prereqs = topic_data.get("prereqs", [])
            if prereqs:
                prereq_coverage = sum(1 for prereq in prereqs if topic_counts.get(prereq, 0) > 0) / len(prereqs)
                score += prereq_coverage * 0.1

            # Boost if member has LC experience in this topic (ready to transfer)
            lc_count_for_topic = lc_topic_skill.get(prob_topic, 0.0)
            if lc_count_for_topic >= 5:
                score += 0.08

            candidates.append((prob, score))

    # Sort by score descending
    candidates.sort(key=lambda x: x[1], reverse=True)

    # LC skill data for reason generation
    lc_data = member.get("lc_data") or {}
    lc_topic_skill = lc_data.get("topic_skill", {})
    has_lc_data = bool(lc_topic_skill)

    # Format results
    recommendations = [
        {
            "id": prob["id"],
            "name": prob["name"],
            "rating": prob.get("rating", 0),
            "topic": prob.get("topic", ""),
            "url": prob.get("url", ""),
            "score": round(score, 3),
            "reason": _generate_reason(prob, score, avg_rating, seed_problem, topic_counts, topics, lc_topic_skill),
        }
        for prob, score in candidates[:limit]
    ]

    return {
        "member_id": member_id,
        "member_name": member["name"],
        "member_avg_rating": round(avg_rating),
        "solved_count": len(solved_curated),
        "seed_problem": seed_problem,
        "lc_skill_applied": has_lc_data,
        "recommendations": recommendations,
    }


def _generate_reason(
    prob: dict[str, Any],
    score: float,
    avg_rating: float,
    seed_problem: str | None,
    topic_counts: dict[str, int],
    topics: dict[str, Any],
    lc_topic_skill: dict[str, float] | None = None,
) -> str:
    """Generate a human-readable reason for the recommendation."""
    prob_rating = prob.get("rating", 0)
    prob_topic = prob.get("topic", "")
    topic_name = topics.get(prob_topic, {}).get("name", prob_topic)
    lc_count = (lc_topic_skill or {}).get(prob_topic, 0.0)

    if seed_problem:
        diff = prob_rating - avg_rating
        if diff > 100:
            return f"Similar to your seed problem, but more challenging (+{diff} rating)"
        elif diff > 0:
            return f"Similar to your seed problem with slight progression (+{diff} rating)"
        else:
            return "Highly similar to your seed problem"
    else:
        solved_in_topic = topic_counts.get(prob_topic, 0)
        diff = prob_rating - avg_rating

        # LC-aware reasons: when CF count is low but LC experience exists
        if solved_in_topic < 3 and lc_count >= 5:
            return f"Transfer your LC {topic_name} skills to CF (only {solved_in_topic} CF solved, {int(lc_count)} LC solved)"
        elif solved_in_topic < 3:
            if diff > 50:
                return f"Build strength in {topic_name} (only {solved_in_topic} solved, +{diff} rating)"
            else:
                return f"Build strength in {topic_name} (only {solved_in_topic} solved)"
        elif diff > 100:
            return f"Challenge problem in {topic_name} (+{diff} rating above your average)"
        elif diff > 0:
            return f"Gradual progression in {topic_name} (+{diff} rating)"
        else:
            return f"Solidify {topic_name} fundamentals"
