"""Service for analyzing ICPC regional contests and their topic distributions."""

import json
import re
from pathlib import Path
from typing import Any

from .cf_client import CFClient
from .topic_classifier import classify_contest, classify_problem

DATA_DIR = Path(__file__).parent.parent / "data"
REGIONALS_FILE = DATA_DIR / "regionals.json"
ICPC_PROBLEMS_FILE = DATA_DIR / "icpc_problems.json"


def is_icpc_regional(contest: dict[str, Any]) -> bool:
    """Check if a contest is likely an ICPC regional based on name."""
    name = contest.get("name", "").lower()

    # Common patterns in ICPC regional names
    icpc_patterns = [
        r"icpc",
        r"regional",
        r"acm-icpc",
        r"acm icpc",
        r"world finals",
        r"subregional",
    ]

    # Exclude practice/training contests
    exclude_patterns = [
        r"practice",
        r"training",
        r"upsolving",
        r"mirror",
        r"unofficial",
    ]

    # Check if name matches ICPC patterns
    is_icpc = any(re.search(pattern, name) for pattern in icpc_patterns)

    # Exclude if matches exclude patterns
    is_excluded = any(re.search(pattern, name) for pattern in exclude_patterns)

    return is_icpc and not is_excluded


def analyze_prescraped_problems() -> dict[str, Any]:
    """Analyze pre-scraped ICPC problems from local file.

    Returns:
        dict with analyzed regional contests
    """
    print(f"Loading pre-scraped ICPC problems from {ICPC_PROBLEMS_FILE}")

    if not ICPC_PROBLEMS_FILE.exists():
        raise FileNotFoundError(f"Pre-scraped problems file not found: {ICPC_PROBLEMS_FILE}")

    with open(ICPC_PROBLEMS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Handle both formats: list or dict with "problems" key
    if isinstance(data, dict) and "problems" in data:
        problems = data["problems"]
    elif isinstance(data, list):
        problems = data
    else:
        raise ValueError(f"Unexpected data format in {ICPC_PROBLEMS_FILE}")

    print(f"  Loaded {len(problems)} problems")

    # Group problems by contest
    contests_map: dict[str, dict[str, Any]] = {}

    for problem in problems:
        # Handle both snake_case and camelCase field names
        contest_id = problem.get("contest_id") or problem.get("contestId")
        contest_name = problem.get("contest_name") or problem.get("contestName") or "Unknown Contest"

        if contest_id not in contests_map:
            contests_map[contest_id] = {
                "contest_id": contest_id,
                "name": contest_name,
                "year": extract_year(contest_name),
                "region": extract_region(contest_name),
                "problems": [],
            }

        # Convert to CF API format for classifier
        contests_map[contest_id]["problems"].append({
            "contestId": contest_id,
            "index": problem.get("problem_index") or problem.get("index", ""),
            "name": problem.get("problem_name") or problem.get("name", ""),
            "type": problem.get("problem_type") or problem.get("type", "PROGRAMMING"),
            "tags": problem.get("problem_tags") or problem.get("tags", []),
            "rating": problem.get("problem_rating") or problem.get("rating"),
        })

    print(f"  Grouped into {len(contests_map)} contests")

    # Analyze each contest
    analyzed_contests = []
    for contest_data in contests_map.values():
        problems = contest_data["problems"]
        analysis = classify_contest(problems)

        analyzed_contests.append({
            "contest_id": contest_data["contest_id"],
            "name": contest_data["name"],
            "year": contest_data["year"],
            "region": contest_data["region"],
            "analysis": analysis,
        })

    print(f"  Analyzed {len(analyzed_contests)} contests")

    # Compute aggregate stats
    aggregate_stats = compute_aggregate_stats(analyzed_contests)

    result = {
        "contests": analyzed_contests,
        "aggregate_stats": aggregate_stats,
        "metadata": {
            "total_contests": len(analyzed_contests),
            "total_problems": len(problems),
            "data_source": "pre-scraped",
        }
    }

    # Save to cache
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(REGIONALS_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"Saved analysis to {REGIONALS_FILE}")
    return result


def fetch_and_analyze_regionals(
    limit: int = 50,
    force_refresh: bool = False
) -> dict[str, Any]:
    """Fetch ICPC regional contests and analyze their topic distributions.

    Args:
        limit: Maximum number of contests to analyze
        force_refresh: If True, re-fetch even if cached

    Returns:
        dict with analyzed regional contests
    """
    # Check cache first
    if REGIONALS_FILE.exists() and not force_refresh:
        print(f"Loading cached regional analysis from {REGIONALS_FILE}")
        with open(REGIONALS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

    # Try pre-scraped problems first
    if ICPC_PROBLEMS_FILE.exists() and not force_refresh:
        return analyze_prescraped_problems()

    print("Fetching and analyzing ICPC regional contests...")
    client = CFClient()

    # Fetch gym contests
    all_contests = client.fetch_contests(gym=True)

    # Filter to ICPC regionals
    icpc_contests = [c for c in all_contests if is_icpc_regional(c)]
    print(f"  Found {len(icpc_contests)} ICPC regional contests out of {len(all_contests)} gym contests")

    # Analyze contests (newest first, limited)
    analyzed_contests = []
    successful = 0
    failed = 0

    for i, contest in enumerate(icpc_contests[:limit]):
        contest_id = contest["id"]
        contest_name = contest["name"]

        print(f"\n[{i+1}/{min(limit, len(icpc_contests))}] Analyzing: {contest_name} (ID: {contest_id})")

        try:
            # Fetch contest problems via standings
            standings = client.fetch_contest_standings(contest_id, count=1)
            problems = standings.get("problems", [])

            if not problems:
                print(f"  WARNING No problems found, skipping")
                failed += 1
                continue

            # Classify all problems
            analysis = classify_contest(problems)

            # Store result
            analyzed_contests.append({
                "contest_id": contest_id,
                "name": contest_name,
                "year": extract_year(contest_name),
                "region": extract_region(contest_name),
                "start_time": contest.get("startTimeSeconds"),
                "duration": contest.get("durationSeconds"),
                "analysis": analysis,
            })

            successful += 1
            print(f"  OK Classified {analysis['total_problems']} problems")

        except Exception as e:
            print(f"  FAIL Failed: {e}")
            failed += 1
            continue

    print(f"\n{'='*60}")
    print(f"Analysis complete: {successful} contests analyzed, {failed} failed")

    # Compute aggregate stats across all contests
    aggregate_stats = compute_aggregate_stats(analyzed_contests)

    result = {
        "contests": analyzed_contests,
        "aggregate_stats": aggregate_stats,
        "metadata": {
            "total_contests": len(analyzed_contests),
            "total_problems": sum(c["analysis"]["total_problems"] for c in analyzed_contests),
            "successful": successful,
            "failed": failed,
        }
    }

    # Save to cache
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(REGIONALS_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"Saved analysis to {REGIONALS_FILE}")
    return result


def compute_aggregate_stats(contests: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute aggregate topic statistics across all analyzed contests."""
    topic_counts: dict[str, int] = {}
    total_problems = 0

    for contest in contests:
        analysis = contest["analysis"]
        total_problems += analysis["total_problems"]

        for topic, count in analysis["topic_counts"].items():
            topic_counts[topic] = topic_counts.get(topic, 0) + count

    # Sort by frequency
    sorted_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)

    topic_percentages = {
        topic: (count / total_problems * 100) if total_problems > 0 else 0
        for topic, count in topic_counts.items()
    }

    return {
        "topic_counts": dict(sorted_topics),
        "topic_percentages": topic_percentages,
        "total_problems": total_problems,
        "top_10_topics": [{"topic": t, "count": c, "percentage": topic_percentages[t]}
                          for t, c in sorted_topics[:10]],
    }


def extract_year(contest_name: str) -> int | None:
    """Extract year from contest name (e.g., '2019-2020', '2023')."""
    # Look for 4-digit year
    match = re.search(r"20\d{2}", contest_name)
    return int(match.group()) if match else None


def extract_region(contest_name: str) -> str:
    """Extract region from contest name (e.g., 'North America', 'Europe')."""
    name_lower = contest_name.lower()

    regions = [
        "north america", "latin america", "europe", "asia", "pacific",
        "africa", "middle east", "neerc", "cerc", "nena", "ecna-q",
        "greater ny", "mid-atlantic", "mid-central", "northeastern",
        "pacific northwest", "rocky mountain", "south central",
        "southeastern", "southern california", "world finals"
    ]

    for region in regions:
        if region in name_lower:
            return region.title()

    return "Unknown"


def get_recommendations_from_regionals(
    regionals_data: dict[str, Any],
    top_n: int = 10
) -> list[dict[str, Any]]:
    """Get topic recommendations based on historical ICPC regional data.

    Args:
        regionals_data: Result from fetch_and_analyze_regionals()
        top_n: Number of top topics to return

    Returns:
        List of topics with their importance scores
    """
    aggregate = regionals_data.get("aggregate_stats", {})
    top_topics = aggregate.get("top_10_topics", [])[:top_n]

    # Add training priority recommendations
    for item in top_topics:
        percentage = item["percentage"]
        if percentage >= 15:
            item["priority"] = "Critical"
        elif percentage >= 10:
            item["priority"] = "High"
        elif percentage >= 5:
            item["priority"] = "Medium"
        else:
            item["priority"] = "Low"

    return top_topics


if __name__ == "__main__":
    print("Testing regional analysis with pre-scraped data...")
    result = analyze_prescraped_problems()
    print(f"\nOK Successfully analyzed {result['metadata']['total_contests']} contests")
    print(f"OK Total problems: {result['metadata']['total_problems']}")
    print(f"\nTop 5 topics:")
    for item in result['aggregate_stats']['top_10_topics'][:5]:
        print(f"  {item['topic']}: {item['count']} problems ({item['percentage']:.1f}%)")
