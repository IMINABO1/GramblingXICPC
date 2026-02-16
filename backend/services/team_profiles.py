"""Shared team profiling logic — member strengths and team coverage."""

import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel

DATA_DIR = Path(__file__).parent.parent / "data"

ROLE_CLUSTERS: dict[str, list[str]] = {
    "graphs": ["bfs_dfs", "shortest_paths", "trees", "topo_sort", "graphs_advanced", "dsu"],
    "dp_math": ["dp_basic", "dp_intermediate", "dp_advanced", "number_theory", "combinatorics", "game_theory", "math_basic"],
    "impl_ds": ["implementation", "sorting", "binary_search", "two_pointers", "prefix_sums", "seg_tree", "strings", "geometry", "advanced"],
}


class MemberProfile(BaseModel):
    id: int
    name: str
    strengths: dict[str, float]
    cluster_scores: dict[str, float]


def load_problems() -> list[dict[str, Any]]:
    with open(DATA_DIR / "problems.json", "r", encoding="utf-8") as f:
        return json.load(f)


def compute_profiles(
    members: list[dict[str, Any]], problems: list[dict[str, Any]]
) -> list[MemberProfile]:
    """Compute per-member topic mastery and cluster scores."""
    # Count total problems per topic
    topic_totals: dict[str, int] = {}
    for p in problems:
        topic_totals[p["topic"]] = topic_totals.get(p["topic"], 0) + 1

    profiles: list[MemberProfile] = []
    for m in members:
        solved = set(m.get("solved_curated", []))
        editorial_flags = m.get("editorial_flags") or {}
        solve_quality = m.get("solve_quality") or {}

        # Count solved per topic, weighted by solve quality
        topic_solved_weighted: dict[str, float] = {}
        for p in problems:
            if p["id"] in solved:
                # Get effective weight (editorial override > auto-classification)
                if p["id"] in editorial_flags:
                    weight = 0.5
                else:
                    sq = solve_quality.get(p["id"])
                    weight = sq["weight"] if sq else 1.0
                topic_solved_weighted[p["topic"]] = topic_solved_weighted.get(p["topic"], 0.0) + weight

        # CF mastery = weighted solved / total for each topic (0.0 to 1.0)
        strengths: dict[str, float] = {}
        lc_data = m.get("lc_data") or {}
        lc_topic_skill = lc_data.get("topic_skill", {})

        for topic_key, total in topic_totals.items():
            cf_mastery = topic_solved_weighted.get(topic_key, 0.0) / total if total > 0 else 0.0

            # Blend LC mastery: 10+ LC problems in a topic = 1.0 LC mastery signal
            lc_count = lc_topic_skill.get(topic_key, 0.0)
            if lc_count > 0:
                lc_mastery = min(1.0, lc_count / 10.0)
                strengths[topic_key] = 0.7 * cf_mastery + 0.3 * lc_mastery
            else:
                strengths[topic_key] = cf_mastery

        # Cluster scores = average mastery across topics in each cluster
        cluster_scores: dict[str, float] = {}
        for cluster, topic_keys in ROLE_CLUSTERS.items():
            vals = [strengths.get(t, 0.0) for t in topic_keys]
            cluster_scores[cluster] = sum(vals) / len(vals) if vals else 0.0

        profiles.append(MemberProfile(
            id=m["id"],
            name=m["name"],
            strengths=strengths,
            cluster_scores=cluster_scores,
        ))
    return profiles


def team_coverage(
    member_ids: list[int], profiles: list[MemberProfile]
) -> dict[str, float]:
    """Compute a team's coverage per cluster (max member score per cluster)."""
    profile_map = {p.id: p for p in profiles}
    coverage: dict[str, float] = {}
    for cluster in ROLE_CLUSTERS:
        coverage[cluster] = max(
            (profile_map[mid].cluster_scores.get(cluster, 0.0) for mid in member_ids if mid in profile_map),
            default=0.0,
        )
    return coverage
