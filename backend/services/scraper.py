"""Resumable, parallel Codeforces problem statement scraper."""

import json
import logging
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import cloudscraper
from bs4 import BeautifulSoup

DATA_DIR = Path(__file__).parent.parent / "data"
CACHE_PATH = DATA_DIR / "statements_cache.json"
ERROR_LOG_PATH = DATA_DIR / "scrape_errors.log"
BASE_URL = "https://codeforces.com"

# Rate limiting: max ~1.5 requests/second globally across all threads
MIN_GLOBAL_INTERVAL = 0.67  # seconds between any two requests


class RateLimiter:
    """Thread-safe global rate limiter."""

    def __init__(self, min_interval: float = MIN_GLOBAL_INTERVAL) -> None:
        self._min_interval = min_interval
        self._lock = threading.Lock()
        self._last_time = 0.0

    def wait(self) -> None:
        with self._lock:
            now = time.time()
            elapsed = now - self._last_time
            if elapsed < self._min_interval:
                time.sleep(self._min_interval - elapsed)
            self._last_time = time.time()


class StatementScraper:
    """Scrapes problem statements from Codeforces with resumable caching."""

    def __init__(self, workers: int = 3) -> None:
        self.workers = workers
        self.rate_limiter = RateLimiter()
        self._thread_local = threading.local()
        self._cache: dict[str, str] = {}
        self._cache_lock = threading.Lock()
        self._save_counter = 0
        self._save_lock = threading.Lock()
        self._progress_lock = threading.Lock()
        self._completed = 0
        self._total = 0
        self._start_time = 0.0

        # Set up error logging
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        logging.basicConfig(
            filename=str(ERROR_LOG_PATH),
            level=logging.WARNING,
            format="%(asctime)s %(levelname)s %(message)s",
        )
        self.logger = logging.getLogger("scraper")

    def _get_session(self) -> cloudscraper.CloudScraper:
        """Get a thread-local cloudscraper session."""
        if not hasattr(self._thread_local, "session"):
            self._thread_local.session = cloudscraper.create_scraper()
        return self._thread_local.session

    def _load_cache(self) -> dict[str, str]:
        if CACHE_PATH.exists():
            with open(CACHE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def _save_cache(self) -> None:
        with self._cache_lock:
            data = dict(self._cache)
        with open(CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)

    def _maybe_save_cache(self) -> None:
        """Save cache every 50 scraped problems."""
        with self._save_lock:
            self._save_counter += 1
            if self._save_counter % 50 == 0:
                self._save_cache()

    def _parse_statement(self, html: str) -> str:
        """Extract problem statement text from HTML."""
        soup = BeautifulSoup(html, "html.parser")
        statement_div = soup.find("div", class_="problem-statement")
        if not statement_div:
            return ""

        # Remove the header (title) div — we already have the name
        header = statement_div.find("div", class_="header")
        if header:
            header.decompose()

        text = statement_div.get_text(separator="\n", strip=True)

        # Clean up LaTeX: $n$ → n, $$formula$$ → formula
        text = re.sub(r"\$\$?([^$]+)\$\$?", r"\1", text)

        # Normalize whitespace
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r" {2,}", " ", text)

        return text.strip()

    def _scrape_one(self, contest_id: int, index: str) -> str | None:
        """Scrape a single problem statement. Returns text or None on failure."""
        self.rate_limiter.wait()

        session = self._get_session()
        url = f"{BASE_URL}/contest/{contest_id}/problem/{index}"
        for attempt in range(3):
            try:
                resp = session.get(url, timeout=20)
                if resp.status_code == 404:
                    self.logger.warning(f"404: {contest_id}/{index}")
                    return None
                if resp.status_code == 503 or "Codeforces is temporarily unavailable" in resp.text:
                    wait = 2 ** (attempt + 2)
                    self.logger.warning(f"503 for {contest_id}/{index}, waiting {wait}s")
                    time.sleep(wait)
                    continue
                if resp.status_code == 403:
                    wait = 2 ** (attempt + 2)
                    self.logger.warning(f"403 for {contest_id}/{index}, recreating session, waiting {wait}s")
                    self._thread_local.session = cloudscraper.create_scraper()
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                statement = self._parse_statement(resp.text)
                if statement:
                    return statement
                # Empty statement means page loaded but no problem-statement div
                self.logger.warning(f"Empty statement for {contest_id}/{index}")
                return None
            except Exception as e:
                if attempt == 2:
                    self.logger.error(f"Failed {contest_id}/{index} after 3 attempts: {e}")
                    return None
                time.sleep(2 ** (attempt + 1))
        return None

    def _scrape_worker(self, problem: dict[str, Any]) -> tuple[str, str | None]:
        """Worker function for thread pool. Returns (key, statement)."""
        contest_id = problem["contestId"]
        index = problem["index"]
        key = f"{contest_id}/{index}"

        statement = self._scrape_one(contest_id, index)

        if statement is not None:
            with self._cache_lock:
                self._cache[key] = statement
            self._maybe_save_cache()

        with self._progress_lock:
            self._completed += 1
            elapsed = time.time() - self._start_time
            rate = self._completed / elapsed if elapsed > 0 else 0
            remaining = (self._total - self._completed) / rate if rate > 0 else 0
            mins = int(remaining // 60)
            secs = int(remaining % 60)
            status = "OK" if statement else "SKIP"
            print(
                f"  [{self._completed}/{self._total}] {key} - {problem.get('name', '?')[:40]} "
                f"[{status}] (ETA: {mins}m {secs}s)",
                flush=True,
            )

        return key, statement

    def scrape_all(self, problems: list[dict[str, Any]]) -> dict[str, str]:
        """Scrape statements for all problems. Resumes from cache.

        Args:
            problems: List of CF problem dicts with contestId and index.

        Returns:
            Dict mapping "contestId/index" to statement text.
        """
        self._cache = self._load_cache()

        # Purge empty strings from cache (bad entries from failed scrapes)
        bad_keys = [k for k, v in self._cache.items() if not v]
        if bad_keys:
            for k in bad_keys:
                del self._cache[k]
            print(f"  Purged {len(bad_keys)} empty cache entries from previous failed run")

        cached_count = len(self._cache)

        # Filter to only problems not yet cached
        to_scrape = [
            p for p in problems
            if f"{p['contestId']}/{p['index']}" not in self._cache
        ]

        print(f"Statement scraper: {cached_count} cached, {len(to_scrape)} remaining")

        if not to_scrape:
            print("  All statements already cached!")
            return dict(self._cache)

        self._total = len(to_scrape)
        self._completed = 0
        self._start_time = time.time()

        try:
            with ThreadPoolExecutor(max_workers=self.workers) as executor:
                futures = {
                    executor.submit(self._scrape_worker, p): p
                    for p in to_scrape
                }
                for future in as_completed(futures):
                    try:
                        future.result()
                    except Exception as e:
                        p = futures[future]
                        self.logger.error(f"Unexpected error for {p.get('contestId')}/{p.get('index')}: {e}")
        except KeyboardInterrupt:
            print("\n  Interrupted! Saving cache...")
        finally:
            self._save_cache()
            final_count = len(self._cache)
            print(f"  Done. {final_count} total statements cached.")

        return dict(self._cache)

    def get_cached_statements(self) -> dict[str, str]:
        """Load and return cached statements without scraping."""
        return self._load_cache()
