"""Main orchestrator for building the Codeforces problem graph.

Usage:
    python scripts/build_graph.py              # Run full pipeline
    python scripts/build_graph.py --skip-scrape # Skip scraping, use cached statements
    python scripts/build_graph.py --step fetch  # Only fetch from CF API
    python scripts/build_graph.py --step scrape # Only scrape statements
    python scripts/build_graph.py --step embed  # Only generate embeddings + build graph
    python scripts/build_graph.py --workers 5   # Use 5 parallel scraper threads (default: 3)
"""

import argparse
import json
import sys
import time
from pathlib import Path

# Add project root to path so we can import backend.services
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.cf_client import CFClient
from backend.services.embeddings import (
    apply_boosts,
    build_faiss_index,
    build_graph,
    build_text_representation,
    find_neighbors,
    generate_embeddings,
    save_artifacts,
)
from backend.services.scraper import StatementScraper

DATA_DIR = PROJECT_ROOT / "backend" / "data"


def load_curated_ids() -> set[str]:
    """Load curated problem IDs from problems.json."""
    problems_path = DATA_DIR / "problems.json"
    if not problems_path.exists():
        return set()
    with open(problems_path, "r", encoding="utf-8") as f:
        problems = json.load(f)
    # Convert curated IDs to "contestId/index" format
    ids = set()
    for p in problems:
        # Parse ID like "1A" → contest 1, index A
        # or "1352C" → contest 1352, index C
        # The URL gives us the real mapping
        url = p.get("url", "")
        parts = url.rstrip("/").split("/")
        if len(parts) >= 2:
            ids.add(f"{parts[-2]}/{parts[-1]}")
    return ids


def step_fetch(client: CFClient) -> list[dict]:
    """Step 1: Fetch all problems from CF API."""
    print("\n" + "=" * 60)
    print("STEP 1: Fetching problems from Codeforces API")
    print("=" * 60)

    problems = client.fetch_all_problems()
    client.save_raw_problems(problems)

    # Print stats
    tags: dict[str, int] = {}
    ratings: dict[int, int] = {}
    for p in problems:
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
        r = p.get("rating", 0)
        ratings[r] = ratings.get(r, 0) + 1

    print(f"\n  Stats:")
    print(f"    Problems: {len(problems)}")
    print(f"    Unique tags: {len(tags)}")
    print(f"    Rating range: {min(ratings.keys())}-{max(ratings.keys())}")
    print(f"    Top tags: {', '.join(t for t, _ in sorted(tags.items(), key=lambda x: -x[1])[:10])}")

    return problems


def step_scrape(problems: list[dict], workers: int = 3) -> dict[str, str]:
    """Step 2: Scrape problem statements."""
    print("\n" + "=" * 60)
    print("STEP 2: Scraping problem statements")
    print("=" * 60)

    scraper = StatementScraper(workers=workers)
    statements = scraper.scrape_all(problems)
    return statements


def step_embed(problems: list[dict], statements: dict[str, str], k: int = 20) -> None:
    """Step 3: Generate embeddings and build graph."""
    print("\n" + "=" * 60)
    print("STEP 3: Generating embeddings and building graph")
    print("=" * 60)

    # Build text representations
    print(f"\nBuilding text representations for {len(problems)} problems...")
    texts = []
    problem_ids = []
    for p in problems:
        key = f"{p['contestId']}/{p['index']}"
        statement = statements.get(key)
        text = build_text_representation(p, statement)
        texts.append(text)
        problem_ids.append(key)

    stmt_count = sum(1 for p in problems if f"{p['contestId']}/{p['index']}" in statements)
    print(f"  {stmt_count}/{len(problems)} problems have scraped statements")

    # Generate embeddings
    embeddings = generate_embeddings(texts)

    # Build FAISS index and find neighbors
    index = build_faiss_index(embeddings)
    scores, indices = find_neighbors(index, embeddings, k=k)

    # Apply boosts
    curated_ids = load_curated_ids()
    print(f"\n  Applying boosts ({len(curated_ids)} curated problems marked)...")
    scores, indices = apply_boosts(scores, indices, problems, curated_ids)

    # Build and save graph
    print("\nBuilding graph JSON...")
    graph = build_graph(problems, scores, indices, problem_ids, k=k)

    print("\nSaving artifacts...")
    save_artifacts(embeddings, problem_ids, graph)

    # Quality check: spot-check a few neighbors
    print("\n" + "-" * 40)
    print("Quality spot-check:")
    for sample_id in ["1/A", "455/A", "20/C"]:
        if sample_id in graph["neighbors"]:
            neighbors = graph["neighbors"][sample_id][:5]
            print(f"\n  {sample_id} neighbors:")
            for n in neighbors:
                print(f"    {n['id']} (score: {n['score']}, tags: {n['shared_tags']})")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the Codeforces problem graph")
    parser.add_argument("--step", choices=["fetch", "scrape", "embed"], help="Run only a specific step")
    parser.add_argument("--skip-scrape", action="store_true", help="Skip scraping, use cached statements")
    parser.add_argument("--workers", type=int, default=3, help="Number of parallel scraper threads (default: 3)")
    parser.add_argument("--k", type=int, default=20, help="Number of neighbors per problem (default: 20)")
    args = parser.parse_args()

    start = time.time()
    client = CFClient()

    if args.step == "fetch":
        step_fetch(client)
    elif args.step == "scrape":
        problems = client.load_raw_problems()
        if not problems:
            print("No cached problems found. Run --step fetch first.")
            sys.exit(1)
        step_scrape(problems, workers=args.workers)
    elif args.step == "embed":
        problems = client.load_raw_problems()
        if not problems:
            print("No cached problems found. Run --step fetch first.")
            sys.exit(1)
        scraper = StatementScraper()
        statements = scraper.get_cached_statements()
        step_embed(problems, statements, k=args.k)
    else:
        # Full pipeline
        problems = client.load_raw_problems()
        if not problems:
            problems = step_fetch(client)
        else:
            print(f"Using cached CF data ({len(problems)} problems)")

        if args.skip_scrape:
            print("\nSkipping scrape step (using cached statements)")
            scraper = StatementScraper()
            statements = scraper.get_cached_statements()
        else:
            statements = step_scrape(problems, workers=args.workers)

        step_embed(problems, statements, k=args.k)

    elapsed = time.time() - start
    mins = int(elapsed // 60)
    secs = int(elapsed % 60)
    print(f"\nTotal time: {mins}m {secs}s")


if __name__ == "__main__":
    main()
