"""Maps Codeforces problem tags to our 22-topic taxonomy."""

from typing import Any

# Mapping from CF tags to our topic IDs
# Some CF tags map to multiple topics; we assign a primary and secondary topic
CF_TAG_TO_TOPICS: dict[str, list[str]] = {
    # Tier 0: Foundations
    "implementation": ["implementation"],
    "constructive algorithms": ["implementation"],
    "brute force": ["implementation"],
    "math": ["math_basic"],
    "number theory": ["number_theory", "math_basic"],
    "sortings": ["sorting"],
    "greedy": ["sorting"],

    # Tier 1: Core
    "binary search": ["binary_search"],
    "two pointers": ["two_pointers"],
    "data structures": ["implementation"],  # generic, could be many topics
    "dfs and similar": ["bfs_dfs"],
    "graphs": ["bfs_dfs"],
    "trees": ["trees", "bfs_dfs"],

    # Tier 2: Intermediate
    "shortest paths": ["shortest_paths"],
    "dsu": ["dsu"],
    "dp": ["dp_basic", "dp_intermediate", "dp_advanced"],
    "strings": ["strings"],

    # Tier 3: Advanced
    "divide and conquer": ["dp_intermediate", "binary_search"],
    "combinatorics": ["combinatorics"],
    "probabilities": ["combinatorics", "math_basic"],
    "games": ["game_theory"],
    "geometry": ["geometry"],
    "flows": ["graphs_advanced"],
    "graph matchings": ["graphs_advanced"],
    "2-sat": ["graphs_advanced"],

    # Tier 4: Expert
    "string suffix structures": ["advanced"],
    "schedules": ["advanced"],
    "fft": ["advanced"],
    "hashing": ["strings", "advanced"],
    "meet-in-the-middle": ["advanced"],
    "ternary search": ["binary_search", "advanced"],
    "matrices": ["advanced", "math_basic"],
    "bitmasks": ["dp_intermediate", "implementation"],

    # Data structures (need better mapping based on difficulty)
    "segment tree": ["seg_tree"],
    "binary indexed tree": ["seg_tree"],
    "sparse table": ["seg_tree"],
    "disjoint set union": ["dsu"],
}


def classify_problem(problem: dict[str, Any]) -> dict[str, Any]:
    """Classify a CF problem into our topic taxonomy.

    Args:
        problem: CF problem dict with 'tags' and 'rating' fields

    Returns:
        dict with:
        - topics: list of topic IDs that match
        - primary_topic: best single topic match
        - confidence: rough confidence score (0-1)
    """
    tags = problem.get("tags", [])
    rating = problem.get("rating")
    if rating is None:
        rating = 1500

    # Collect all matching topics
    matched_topics: list[str] = []
    for tag in tags:
        tag_lower = tag.lower()
        if tag_lower in CF_TAG_TO_TOPICS:
            matched_topics.extend(CF_TAG_TO_TOPICS[tag_lower])

    # Remove duplicates while preserving order
    topics_seen = set()
    topics_unique = []
    for t in matched_topics:
        if t not in topics_seen:
            topics_seen.add(t)
            topics_unique.append(t)

    # If no match found via tags, use rating-based fallback
    if not topics_unique:
        topics_unique = _fallback_by_rating(rating)

    # Disambiguate DP by rating
    if "dp_basic" in topics_unique or "dp_intermediate" in topics_unique or "dp_advanced" in topics_unique:
        dp_topic = _disambiguate_dp(rating)
        topics_unique = [t for t in topics_unique if not t.startswith("dp_")]
        topics_unique.insert(0, dp_topic)

    # Primary topic is the first one (most relevant)
    primary_topic = topics_unique[0] if topics_unique else "implementation"

    # Confidence: higher if multiple tags agree, lower if fallback used
    confidence = min(1.0, len(tags) * 0.25) if matched_topics else 0.3

    return {
        "topics": topics_unique[:3],  # Top 3 at most
        "primary_topic": primary_topic,
        "confidence": confidence,
    }


def _fallback_by_rating(rating: int) -> list[str]:
    """Fallback topic assignment based on rating when no tags match."""
    if rating < 1200:
        return ["implementation"]
    elif rating < 1600:
        return ["binary_search", "two_pointers"]
    elif rating < 2000:
        return ["dp_basic", "bfs_dfs"]
    else:
        return ["dp_intermediate", "graphs_advanced"]


def _disambiguate_dp(rating: int) -> str:
    """Choose the right DP tier based on problem rating."""
    if rating < 1500:
        return "dp_basic"
    elif rating < 1900:
        return "dp_intermediate"
    else:
        return "dp_advanced"


def classify_contest(contest_problems: list[dict[str, Any]]) -> dict[str, Any]:
    """Classify all problems in a contest and compute aggregate stats.

    Args:
        contest_problems: list of CF problem dicts

    Returns:
        dict with:
        - total_problems: number of problems
        - topic_counts: dict mapping topic ID to count
        - topic_percentages: dict mapping topic ID to percentage
        - problems_by_topic: dict mapping topic ID to list of problems
    """
    topic_counts: dict[str, int] = {}
    problems_by_topic: dict[str, list[dict[str, Any]]] = {}

    for problem in contest_problems:
        classification = classify_problem(problem)
        primary = classification["primary_topic"]

        topic_counts[primary] = topic_counts.get(primary, 0) + 1
        if primary not in problems_by_topic:
            problems_by_topic[primary] = []
        problems_by_topic[primary].append({
            "contestId": problem.get("contestId"),
            "index": problem.get("index"),
            "name": problem.get("name"),
            "rating": problem.get("rating"),
            "tags": problem.get("tags", []),
            "classification": classification,
        })

    total = len(contest_problems)
    topic_percentages = {
        topic: (count / total * 100) if total > 0 else 0
        for topic, count in topic_counts.items()
    }

    return {
        "total_problems": total,
        "topic_counts": topic_counts,
        "topic_percentages": topic_percentages,
        "problems_by_topic": problems_by_topic,
    }
