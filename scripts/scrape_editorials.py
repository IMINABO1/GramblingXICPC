"""Editorial scraper for Codeforces problems (Phase 2 — stub).

Planned approach:
1. For each contest, check https://codeforces.com/contest/{id} for editorial links
   - Look for "Tutorial" or "Editorial" link in the contest sidebar
   - Also try common patterns: blog entries by contest authors
2. Scrape editorial blog posts from https://codeforces.com/blog/entry/{id}
3. Map editorial sections to individual problems (editorials cover all problems in a round)
4. Save to backend/data/editorials_cache.json

This is a follow-up to the main graph building pipeline.
Run scripts/build_graph.py first to build the base problem graph.

Usage:
    python scripts/scrape_editorials.py              # Scrape all editorials
    python scripts/scrape_editorials.py --contest 1800  # Scrape editorial for contest 1800
"""


def main() -> None:
    print("Editorial scraper is not yet implemented.")
    print("This is a Phase 2 feature — see the docstring for the planned approach.")
    print("Run scripts/build_graph.py first to build the base problem graph.")


if __name__ == "__main__":
    main()
