"""LeetCode GraphQL client — fetch per-tag skill data for a user."""

import time
from typing import Any

import requests

LC_GRAPHQL_URL = "https://leetcode.com/graphql"
MIN_REQUEST_INTERVAL = 1.0  # LC is less strict than CF but still be polite


class LCClient:
    """Public LeetCode GraphQL client."""

    def __init__(self) -> None:
        self._last_request_time = 0.0
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "User-Agent": "CF-ICPC-Trainer/1.0",
        })

    def _rate_limit(self) -> None:
        elapsed = time.time() - self._last_request_time
        if elapsed < MIN_REQUEST_INTERVAL:
            time.sleep(MIN_REQUEST_INTERVAL - elapsed)
        self._last_request_time = time.time()

    def _query(self, query: str, variables: dict[str, Any]) -> dict[str, Any]:
        self._rate_limit()
        resp = self.session.post(
            LC_GRAPHQL_URL,
            json={"query": query, "variables": variables},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if "errors" in data:
            raise ValueError(f"LeetCode API error: {data['errors']}")
        return data["data"]

    def fetch_tag_problem_counts(self, username: str) -> dict[str, Any]:
        """Fetch per-tag solved counts grouped by difficulty tier.

        Returns dict with keys: fundamental, intermediate, advanced.
        Each is a list of {tagName, tagSlug, problemsSolved}.
        """
        query = """
        query userTagProblemCounts($username: String!) {
          matchedUser(username: $username) {
            tagProblemCounts {
              advanced { tagName tagSlug problemsSolved }
              intermediate { tagName tagSlug problemsSolved }
              fundamental { tagName tagSlug problemsSolved }
            }
          }
        }
        """
        data = self._query(query, {"username": username})
        matched = data.get("matchedUser")
        if not matched:
            raise ValueError(f"LeetCode user '{username}' not found")
        return matched["tagProblemCounts"]

    def fetch_difficulty_stats(self, username: str) -> dict[str, int]:
        """Fetch total AC counts by difficulty (Easy/Medium/Hard).

        Returns dict like {"Easy": 50, "Medium": 30, "Hard": 10, "All": 90}.
        """
        query = """
        query userStats($username: String!) {
          matchedUser(username: $username) {
            submitStatsGlobal {
              acSubmissionNum { difficulty count }
            }
          }
        }
        """
        data = self._query(query, {"username": username})
        matched = data.get("matchedUser")
        if not matched:
            raise ValueError(f"LeetCode user '{username}' not found")
        stats = matched["submitStatsGlobal"]["acSubmissionNum"]
        return {s["difficulty"]: s["count"] for s in stats}
