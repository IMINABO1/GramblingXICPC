"""Maps LeetCode tags to our 22-topic taxonomy and produces per-topic skill estimates."""

from typing import Any

# LeetCode tagSlug -> list of our topic IDs
# When multiple topics are listed, the first is primary
LC_TAG_TO_TOPICS: dict[str, list[str]] = {
    # Foundations (Tier 0)
    "array": ["implementation"],
    "hash-table": ["implementation"],
    "linked-list": ["implementation"],
    "stack": ["implementation"],
    "queue": ["implementation"],
    "matrix": ["implementation"],
    "simulation": ["implementation"],
    "greedy": ["implementation"],
    "divide-and-conquer": ["implementation"],
    "heap-priority-queue": ["implementation"],
    "enumeration": ["implementation"],
    "math": ["math_basic"],
    "bit-manipulation": ["math_basic"],
    "sorting": ["sorting"],

    # Core (Tier 1)
    "binary-search": ["binary_search"],
    "two-pointers": ["two_pointers"],
    "sliding-window": ["two_pointers"],
    "prefix-sum": ["prefix_sums"],
    "number-theory": ["number_theory"],

    # Intermediate (Tier 2)
    "depth-first-search": ["bfs_dfs"],
    "breadth-first-search": ["bfs_dfs"],
    "backtracking": ["bfs_dfs"],
    "shortest-path": ["shortest_paths"],
    "union-find": ["dsu"],
    "topological-sort": ["topo_sort"],
    "dynamic-programming": ["dp_basic"],  # disambiguated by difficulty tier
    "tree": ["trees"],
    "binary-tree": ["trees"],
    "binary-search-tree": ["trees"],
    "string": ["strings"],
    "trie": ["strings"],

    # Advanced (Tier 3)
    "segment-tree": ["seg_tree"],
    "binary-indexed-tree": ["seg_tree"],
    "combinatorics": ["combinatorics"],
    "game-theory": ["game_theory"],
    "graph": ["bfs_dfs", "graphs_advanced"],
    "geometry": ["geometry"],

    # Expert / multi-topic
    "minimum-spanning-tree": ["graphs_advanced"],
    "strongly-connected-component": ["graphs_advanced"],
    "biconnected-component": ["graphs_advanced"],
}

# LC difficulty tier -> DP topic (the disambiguation strategy)
LC_DIFFICULTY_TO_DP: dict[str, str] = {
    "fundamental": "dp_basic",
    "intermediate": "dp_intermediate",
    "advanced": "dp_advanced",
}


def map_lc_tags_to_topics(
    tag_counts: dict[str, list[dict[str, Any]]],
) -> dict[str, float]:
    """Convert LC per-tag solved counts into per-topic effective problem counts.

    Args:
        tag_counts: The tagProblemCounts response from LC API with keys
                    "fundamental", "intermediate", "advanced", each a list
                    of {tagName, tagSlug, problemsSolved}.

    Returns:
        Dict mapping our 22 topic IDs to an effective solved count (float).
        A single LC problem may contribute fractionally to multiple topics.
    """
    topic_counts: dict[str, float] = {}

    for difficulty_tier in ("fundamental", "intermediate", "advanced"):
        entries = tag_counts.get(difficulty_tier, [])
        for entry in entries:
            slug = entry["tagSlug"]
            solved = entry["problemsSolved"]
            if solved == 0:
                continue

            our_topics = LC_TAG_TO_TOPICS.get(slug)
            if not our_topics:
                continue  # unmapped LC tag (e.g., "design", "counting")

            # Special case: DP is disambiguated by the LC difficulty tier
            if slug == "dynamic-programming":
                dp_topic = LC_DIFFICULTY_TO_DP[difficulty_tier]
                topic_counts[dp_topic] = topic_counts.get(dp_topic, 0.0) + solved
                continue

            # Distribute solved count across mapped topics
            # Primary topic gets full credit; secondary topics get 50%
            for i, topic in enumerate(our_topics):
                weight = 1.0 if i == 0 else 0.5
                topic_counts[topic] = topic_counts.get(topic, 0.0) + solved * weight

    return topic_counts


def estimate_cf_rating_from_lc(difficulty_stats: dict[str, int]) -> float | None:
    """Estimate an equivalent CF rating from LC difficulty distribution.

    Rough heuristic:
    - LC Easy ~ CF 800-1200 (midpoint 1000)
    - LC Medium ~ CF 1200-1800 (midpoint 1500)
    - LC Hard ~ CF 1800-2400 (midpoint 2100)

    Returns None if the member has fewer than 5 total LC solves.
    """
    easy = difficulty_stats.get("Easy", 0)
    medium = difficulty_stats.get("Medium", 0)
    hard = difficulty_stats.get("Hard", 0)
    total = easy + medium + hard

    if total < 5:
        return None

    weighted_sum = easy * 1000 + medium * 1500 + hard * 2100
    return weighted_sum / total
