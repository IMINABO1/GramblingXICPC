"""Embedding-based recommendations from arbitrary text (notes, journal entries)."""

import json
import math
import re
from pathlib import Path
from typing import Any

import numpy as np

DATA_DIR = Path(__file__).parent.parent / "data"

# Lazy-loaded module-level singletons
_faiss_index = None
_embeddings: np.ndarray | None = None
_problem_ids: list[str] | None = None
_model = None
_cf_ratings: dict[str, int] | None = None


def _graph_key_to_compact(key: str) -> str:
    """Convert '1352/C' to '1352C'."""
    return key.replace("/", "")


def _compact_to_graph_key(pid: str) -> str | None:
    """Convert '1352C' to '1352/C'."""
    m = re.match(r"^(\d+)([A-Za-z]\d*)$", pid)
    if not m:
        return None
    return f"{m.group(1)}/{m.group(2)}"


def _load_index() -> tuple[Any, np.ndarray, list[str]]:
    """Load FAISS index, embeddings, and problem IDs. Cached after first call."""
    global _faiss_index, _embeddings, _problem_ids

    if _faiss_index is not None and _embeddings is not None and _problem_ids is not None:
        return _faiss_index, _embeddings, _problem_ids

    import faiss

    _embeddings = np.load(DATA_DIR / "embeddings.npy")
    with open(DATA_DIR / "problem_ids.json", "r", encoding="utf-8") as f:
        _problem_ids = json.load(f)

    dim = _embeddings.shape[1]
    _faiss_index = faiss.IndexFlatIP(dim)
    _faiss_index.add(_embeddings)

    return _faiss_index, _embeddings, _problem_ids


def _get_model():
    """Load sentence-transformers model. Cached after first call."""
    global _model
    if _model is not None:
        return _model

    from sentence_transformers import SentenceTransformer

    _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def _load_problems_map() -> dict[str, dict[str, Any]]:
    """Load curated problems as a {compact_id: problem} map."""
    path = DATA_DIR / "problems.json"
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        problems = json.load(f)
    return {p["id"]: p for p in problems}


def _load_cf_ratings() -> dict[str, int]:
    """Load CF ratings for all problems as {compact_id: rating}. Cached."""
    global _cf_ratings
    if _cf_ratings is not None:
        return _cf_ratings

    path = DATA_DIR / "cf_problems_raw.json"
    if not path.exists():
        _cf_ratings = {}
        return _cf_ratings

    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    _cf_ratings = {}
    for p in raw:
        cid = str(p.get("contestId", ""))
        idx = p.get("index", "")
        rating = p.get("rating", 0)
        if cid and idx and rating:
            _cf_ratings[f"{cid}{idx}"] = rating
    return _cf_ratings


def _difficulty_factor(problem_rating: int, target_rating: int) -> float:
    """Score how impactful a problem is based on difficulty relative to target.

    Peaks at target_rating + 100 (slightly harder = best for learning).
    Falls off gently for easier problems, more steeply for much harder ones.
    Problems with unknown rating (0) get a neutral score.
    """
    if problem_rating == 0:
        return 0.5  # unknown rating — neutral

    ideal = target_rating + 100  # slightly harder is the sweet spot
    diff = problem_rating - ideal

    # Asymmetric Gaussian: sigma=250 for easier, sigma=350 for harder
    sigma = 250 if diff < 0 else 350
    return math.exp(-(diff ** 2) / (2 * sigma ** 2))


def recommend_from_text(
    text: str,
    limit: int = 10,
    exclude_ids: set[str] | None = None,
    target_rating: int = 0,
) -> list[dict[str, Any]]:
    """Embed text and find nearest problems in the FAISS index.

    Args:
        text: Arbitrary text (note content, journal entries, etc.)
        limit: Max number of results to return.
        exclude_ids: Compact problem IDs to exclude (e.g. already-solved).
        target_rating: Member's current level. If > 0, results are re-ranked
            by combining similarity with difficulty appropriateness so the most
            impactful problems (not too hard, not too easy) come first.

    Returns:
        List of {id, name, rating, topic, url, score, impact} sorted by impact.
    """
    if not text or len(text.strip()) < 10:
        return []

    exclude_ids = exclude_ids or set()

    index, _, problem_ids = _load_index()
    model = _get_model()

    # Embed and normalize the query text
    query_vec = model.encode([text], normalize_embeddings=True)
    query_vec = np.array(query_vec, dtype=np.float32)

    # Fetch extra candidates so we have enough after filtering + re-ranking
    search_k = max(limit * 3, limit + len(exclude_ids) + 40)
    scores, indices = index.search(query_vec, min(search_k, len(problem_ids)))

    # Load problem metadata for enrichment
    problems_map = _load_problems_map()
    cf_ratings = _load_cf_ratings()

    candidates: list[dict[str, Any]] = []
    for i in range(indices.shape[1]):
        idx = int(indices[0, i])
        if idx < 0 or idx >= len(problem_ids):
            continue

        graph_key = problem_ids[idx]
        compact_id = _graph_key_to_compact(graph_key)

        if compact_id in exclude_ids:
            continue

        score = float(scores[0, i])

        # Enrich with curated problem metadata if available
        prob = problems_map.get(compact_id)
        if prob:
            candidates.append({
                "id": compact_id,
                "name": prob["name"],
                "rating": prob.get("rating", 0),
                "topic": prob.get("topic", ""),
                "url": prob.get("url", ""),
                "score": round(score, 4),
                "curated": True,
            })
        else:
            candidates.append({
                "id": compact_id,
                "name": graph_key,
                "rating": cf_ratings.get(compact_id, 0),
                "topic": "",
                "url": f"https://codeforces.com/problemset/problem/{graph_key}",
                "score": round(score, 4),
                "curated": False,
            })

    # Re-rank by impact if we have a target rating
    if target_rating > 0 and candidates:
        for c in candidates:
            df = _difficulty_factor(c["rating"], target_rating)
            # 55% similarity, 45% difficulty fit
            c["impact"] = round(c["score"] * 0.55 + df * 0.45, 4)
        candidates.sort(key=lambda c: c["impact"], reverse=True)
    else:
        for c in candidates:
            c["impact"] = c["score"]

    return candidates[:limit]
