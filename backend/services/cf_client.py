"""Codeforces API client with rate limiting and retry logic."""

import json
import time
from pathlib import Path
from typing import Any

import requests

BASE_URL = "https://codeforces.com/api"
DATA_DIR = Path(__file__).parent.parent / "data"
MIN_REQUEST_INTERVAL = 2.0  # seconds between API requests


class CFClient:
    """Rate-limited Codeforces API client."""

    def __init__(self) -> None:
        self._last_request_time = 0.0
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "CF-ICPC-Trainer/1.0"})

    def _rate_limit(self) -> None:
        elapsed = time.time() - self._last_request_time
        if elapsed < MIN_REQUEST_INTERVAL:
            time.sleep(MIN_REQUEST_INTERVAL - elapsed)
        self._last_request_time = time.time()

    def _request(self, endpoint: str, params: dict[str, str] | None = None, max_retries: int = 3) -> dict[str, Any]:
        """Make a rate-limited request to the CF API with retries."""
        for attempt in range(max_retries):
            self._rate_limit()
            try:
                resp = self.session.get(f"{BASE_URL}/{endpoint}", params=params, timeout=30)
                if resp.status_code == 429:
                    wait = 2 ** (attempt + 2)
                    print(f"  Rate limited (429). Waiting {wait}s...")
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                data = resp.json()
                if data.get("status") != "OK":
                    raise ValueError(f"CF API error: {data.get('comment', 'Unknown error')}")
                return data["result"]
            except requests.RequestException as e:
                if attempt == max_retries - 1:
                    raise
                wait = 2 ** (attempt + 1)
                print(f"  Request failed ({e}). Retrying in {wait}s...")
                time.sleep(wait)
        raise RuntimeError("Max retries exceeded")

    def fetch_all_problems(self) -> list[dict[str, Any]]:
        """Fetch all problems from CF API, filter to rated non-gym problems.

        Returns list of problem dicts with keys:
        contestId, index, name, rating, tags
        """
        print("Fetching all problems from Codeforces API...")
        result = self._request("problemset.problems")
        problems = result["problems"]
        problem_stats = result["problemStatistics"]

        # Build a solved count lookup
        solved_counts: dict[str, int] = {}
        for stat in problem_stats:
            key = f"{stat['contestId']}/{stat['index']}"
            solved_counts[key] = stat.get("solvedCount", 0)

        # Filter: must have rating, contestId < 100000 (excludes gym)
        filtered = []
        for p in problems:
            if "rating" not in p:
                continue
            if p.get("contestId", 0) >= 100000:
                continue
            key = f"{p['contestId']}/{p['index']}"
            p["solvedCount"] = solved_counts.get(key, 0)
            filtered.append(p)

        print(f"  Total from API: {len(problems)}")
        print(f"  After filtering (rated, non-gym): {len(filtered)}")
        return filtered

    def fetch_user_submissions(self, handle: str) -> list[dict[str, Any]]:
        """Fetch all submissions for a user handle."""
        print(f"Fetching submissions for {handle}...")
        return self._request("user.status", params={"handle": handle})

    def save_raw_problems(self, problems: list[dict[str, Any]]) -> Path:
        """Save raw problem data to disk."""
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        path = DATA_DIR / "cf_problems_raw.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(problems, f, ensure_ascii=False, indent=2)
        print(f"  Saved {len(problems)} problems to {path}")
        return path

    def load_raw_problems(self) -> list[dict[str, Any]] | None:
        """Load cached raw problems from disk, or None if not cached."""
        path = DATA_DIR / "cf_problems_raw.json"
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def fetch_contests(self, gym: bool = False) -> list[dict[str, Any]]:
        """Fetch all contests from CF API.

        Args:
            gym: If True, return only gym contests (contestId >= 100000).
                 If False, return only regular contests.

        Returns list of contest dicts with keys:
        id, name, type, phase, durationSeconds, startTimeSeconds
        """
        print(f"Fetching {'gym' if gym else 'regular'} contests from Codeforces API...")
        result = self._request("contest.list", params={"gym": "true" if gym else "false"})
        print(f"  Found {len(result)} contests")
        return result

    def fetch_contest_standings(self, contest_id: int, count: int = 1) -> dict[str, Any]:
        """Fetch standings for a specific contest (includes problem list).

        Args:
            contest_id: The contest ID
            count: Number of standings rows to fetch (default 1 for minimal data)

        Returns dict with keys: contest, problems, rows
        """
        print(f"Fetching standings for contest {contest_id}...")
        result = self._request(
            "contest.standings",
            params={"contestId": str(contest_id), "from": "1", "count": str(count)}
        )
        return result
