"""Editorial fetcher — discovers and caches CF editorial links."""

import json
import re
from pathlib import Path
from typing import Any

import cloudscraper
from bs4 import BeautifulSoup


class EditorialFetcher:
    """Fetches editorial/tutorial links for Codeforces problems."""

    def __init__(self, cache_path: Path):
        self.cache_path = cache_path
        self.scraper = cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'windows',
                'mobile': False
            }
        )
        self.cache: dict[str, Any] = self._load_cache()

    def _load_cache(self) -> dict[str, Any]:
        """Load cached editorial data."""
        if self.cache_path.exists():
            with open(self.cache_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def _save_cache(self) -> None:
        """Save editorial cache to disk."""
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.cache_path, 'w', encoding='utf-8') as f:
            json.dump(self.cache, f, indent=2, ensure_ascii=False)

    def get_editorial_url(self, problem_id: str) -> str | None:
        """
        Get editorial URL for a problem.

        Args:
            problem_id: CF problem ID (e.g., "1234A")

        Returns:
            Editorial URL if available, None otherwise
        """
        # Check cache first
        if problem_id in self.cache:
            cached = self.cache[problem_id]
            if cached.get('checked'):
                return cached.get('url')

        # Parse problem ID
        match = re.match(r'(\d+)([A-Z]\d*)', problem_id)
        if not match:
            return None

        contest_id, index = match.groups()

        # Try to fetch editorial link from problem page
        url = self._fetch_editorial_from_problem_page(contest_id, index)

        # Cache result
        self.cache[problem_id] = {
            'url': url,
            'checked': True
        }
        self._save_cache()

        return url

    def _fetch_editorial_from_problem_page(self, contest_id: str, index: str) -> str | None:
        """Fetch editorial link by scraping the problem page."""
        try:
            # Try problemset URL first
            problem_url = f"https://codeforces.com/problemset/problem/{contest_id}/{index}"
            response = self.scraper.get(problem_url, timeout=10)

            if response.status_code != 200:
                # Try contest URL
                problem_url = f"https://codeforces.com/contest/{contest_id}/problem/{index}"
                response = self.scraper.get(problem_url, timeout=10)

            if response.status_code != 200:
                return None

            soup = BeautifulSoup(response.text, 'html.parser')

            # Look for "Tutorial" link in the sidebar or problem menu
            # CF sometimes has a "Tutorial" tab/link
            tutorial_links = soup.find_all('a', href=re.compile(r'/blog/entry/\d+'))

            if tutorial_links:
                # Return the first editorial blog link found
                href = tutorial_links[0].get('href', '')
                if href.startswith('/'):
                    return f"https://codeforces.com{href}"
                return href

            # Alternative: Look for editorial in contest materials
            contest_url = f"https://codeforces.com/contest/{contest_id}"
            response = self.scraper.get(contest_url, timeout=10)

            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                # Look for "Tutorial" or "Editorial" text in sidebar
                for link in soup.find_all('a', href=re.compile(r'/blog/entry/\d+')):
                    text = link.get_text(strip=True).lower()
                    if 'tutorial' in text or 'editorial' in text or 'announcement' in text:
                        href = link.get('href', '')
                        if href.startswith('/'):
                            return f"https://codeforces.com{href}"
                        return href

            return None

        except Exception as e:
            print(f"Error fetching editorial for {contest_id}{index}: {e}")
            return None

    def get_problem_url(self, problem_id: str) -> str:
        """Get the CF problem page URL (always available)."""
        match = re.match(r'(\d+)([A-Z]\d*)', problem_id)
        if not match:
            return f"https://codeforces.com/problemset"

        contest_id, index = match.groups()
        return f"https://codeforces.com/problemset/problem/{contest_id}/{index}"

    def bulk_fetch(self, problem_ids: list[str], max_count: int = 50) -> dict[str, str | None]:
        """
        Fetch editorials for multiple problems (limited to avoid overload).

        Args:
            problem_ids: List of problem IDs to fetch
            max_count: Maximum number of problems to fetch in one call

        Returns:
            Dict mapping problem_id -> editorial_url (or None)
        """
        results = {}

        for i, problem_id in enumerate(problem_ids[:max_count]):
            if i > 0 and i % 5 == 0:
                # Rate limiting - pause every 5 requests
                import time
                time.sleep(2)

            url = self.get_editorial_url(problem_id)
            results[problem_id] = url

        return results
