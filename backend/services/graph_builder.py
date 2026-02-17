"""Lightweight graph builder for curated problems using metadata similarity.

Runs on startup if graph.json is missing (e.g. fresh Heroku deploy).
Builds a similarity graph from the ~184 curated problems using topic, rating,
and name similarity — no external APIs or ML libraries needed.

If HF_API_TOKEN is set, uses HuggingFace embeddings for higher quality.

For the full 10K+ problem graph with embedding-based similarity, use
scripts/build_graph.py instead.
"""

import json
import logging
import math
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"

HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
BATCH_SIZE = 50


def _problem_id_to_graph_key(pid: str) -> str | None:
    """Convert '1352C' to '1352/C'."""
    m = re.match(r"^(\d+)([A-Za-z]\d*)$", pid)
    if not m:
        return None
    return f"{m.group(1)}/{m.group(2)}"


def _compute_similarity(p1: dict[str, Any], p2: dict[str, Any]) -> float:
    """Compute similarity between two curated problems using metadata.

    Factors: topic match (strongest signal), rating proximity, name word overlap.
    Returns a score in [0, 1].
    """
    score = 0.0

    # Topic match: strongest signal for curated problems
    if p1.get("topic") and p1["topic"] == p2.get("topic"):
        score += 0.5

    # Rating proximity: closer ratings → more similar
    r1 = p1.get("rating", 0)
    r2 = p2.get("rating", 0)
    if r1 > 0 and r2 > 0:
        rating_diff = abs(r1 - r2)
        # Gaussian decay: sigma=300
        score += 0.3 * math.exp(-(rating_diff ** 2) / (2 * 300 ** 2))

    # Name word overlap (basic text similarity)
    words1 = set(p1.get("name", "").lower().split())
    words2 = set(p2.get("name", "").lower().split())
    if words1 and words2:
        overlap = len(words1 & words2)
        union = len(words1 | words2)
        score += 0.2 * (overlap / union)

    return score


def _try_hf_embeddings(problems: list[dict[str, Any]], problem_ids: list[str]) -> dict[str, list[dict[str, Any]]] | None:
    """Try to build graph using HF API embeddings. Returns None if unavailable."""
    token = os.environ.get("HF_API_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN")
    if not token:
        return None

    logger.info("HF_API_TOKEN found, using embedding-based graph...")

    try:
        from huggingface_hub import InferenceClient
    except ImportError:
        logger.warning("huggingface_hub not installed, falling back to metadata graph.")
        return None

    client = InferenceClient(token=token)

    # Build text representations
    texts = []
    for p in problems:
        name = p.get("name", "")
        topic = p.get("topic", "")
        rating = p.get("rating", 0)
        tier = "beginner" if rating <= 1200 else "intermediate" if rating <= 1600 else "advanced" if rating <= 2000 else "expert"
        texts.append(f"{name} | topic: {topic} | difficulty: {tier} ({rating})")

    # Embed via HF API in batches
    all_embeddings = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE
        logger.info(f"  Embedding batch {batch_num}/{total_batches}...")
        try:
            results = [client.feature_extraction(t, model=HF_MODEL) for t in batch]
            all_embeddings.append(np.array(results, dtype=np.float32))
        except Exception as e:
            logger.warning(f"  HF API failed: {e}")
            return None

    embeddings = np.vstack(all_embeddings)
    # L2-normalize
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1
    embeddings = embeddings / norms

    # Build FAISS index
    import faiss
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    k = min(20, len(problems) - 1)
    scores, indices = index.search(embeddings, k + 1)
    scores = scores[:, 1:]  # remove self-match
    indices = indices[:, 1:]

    # Build neighbors dict
    topic_map = {pid: problems[i].get("topic", "") for i, pid in enumerate(problem_ids)}
    neighbors: dict[str, list[dict[str, Any]]] = {}
    for i, pid in enumerate(problem_ids):
        p_topic = topic_map.get(pid, "")
        entry = []
        for j in range(indices.shape[1]):
            nb_pos = int(indices[i, j])
            if nb_pos < 0 or nb_pos >= len(problem_ids):
                continue
            nb_id = problem_ids[nb_pos]
            nb_topic = topic_map.get(nb_id, "")
            shared = [p_topic] if p_topic and p_topic == nb_topic else []
            s = float(scores[i, j])
            if shared:
                s += 0.05
            entry.append({"id": nb_id, "score": round(s, 4), "shared_tags": shared})
        entry.sort(key=lambda x: x["score"], reverse=True)
        neighbors[pid] = entry

    # Save embeddings for note_embeddings.py FAISS index
    np.save(DATA_DIR / "embeddings.npy", embeddings)
    with open(DATA_DIR / "problem_ids.json", "w", encoding="utf-8") as f:
        json.dump(problem_ids, f)
    logger.info(f"  Saved embeddings.npy and problem_ids.json")

    return neighbors


def build_curated_graph() -> bool:
    """Build graph.json from curated problems only. Returns True on success."""
    graph_path = DATA_DIR / "graph.json"
    if graph_path.exists():
        logger.info("graph.json already exists, skipping build.")
        return True

    problems_path = DATA_DIR / "problems.json"
    if not problems_path.exists():
        logger.warning("problems.json not found, cannot build graph.")
        return False

    with open(problems_path, "r", encoding="utf-8") as f:
        problems = json.load(f)

    logger.info(f"Building curated graph for {len(problems)} problems...")

    # Map problems to graph keys
    problem_ids: list[str] = []
    valid_problems: list[dict[str, Any]] = []
    for p in problems:
        gkey = _problem_id_to_graph_key(p["id"])
        if gkey:
            problem_ids.append(gkey)
            valid_problems.append(p)

    # Try embedding-based approach first (if HF token available)
    neighbors = _try_hf_embeddings(valid_problems, problem_ids)

    if neighbors is None:
        # Fallback: metadata-based similarity (no external deps)
        logger.info("Building metadata-based graph (no HF token)...")
        k = min(20, len(valid_problems) - 1)
        neighbors = {}
        for i, pid in enumerate(problem_ids):
            scored: list[tuple[str, float, list[str]]] = []
            p1 = valid_problems[i]
            for j, nb_id in enumerate(problem_ids):
                if i == j:
                    continue
                p2 = valid_problems[j]
                sim = _compute_similarity(p1, p2)
                shared = [p1["topic"]] if p1.get("topic") and p1["topic"] == p2.get("topic") else []
                scored.append((nb_id, sim, shared))
            scored.sort(key=lambda x: x[1], reverse=True)
            neighbors[pid] = [
                {"id": nb_id, "score": round(sim, 4), "shared_tags": shared}
                for nb_id, sim, shared in scored[:k]
            ]

    graph = {
        "meta": {
            "total_problems": len(valid_problems),
            "total_edges": sum(len(v) for v in neighbors.values()),
            "k": min(20, len(valid_problems) - 1),
            "built_at": datetime.now(timezone.utc).isoformat(),
            "type": "curated_only",
        },
        "neighbors": neighbors,
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(graph_path, "w", encoding="utf-8") as f:
        json.dump(graph, f, ensure_ascii=False)
    logger.info(f"  Saved graph.json: {graph['meta']['total_problems']} problems, {graph['meta']['total_edges']} edges")

    return True
