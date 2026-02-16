"""Embedding generation and FAISS-based similarity graph construction."""

import json
from pathlib import Path
from typing import Any

import numpy as np

DATA_DIR = Path(__file__).parent.parent / "data"


def build_text_representation(
    problem: dict[str, Any],
    statement: str | None = None,
) -> str:
    """Build a text string for embedding from problem metadata + statement.

    Combines name, tags, rating tier, and (optionally) truncated statement.
    """
    name = problem.get("name", "")
    tags = problem.get("tags", [])
    rating = problem.get("rating", 0)

    # Rating tier label
    if rating <= 1200:
        tier = "beginner"
    elif rating <= 1600:
        tier = "intermediate"
    elif rating <= 2000:
        tier = "advanced"
    elif rating <= 2400:
        tier = "expert"
    else:
        tier = "legendary"

    parts = [
        name,
        f"tags: {', '.join(tags)}" if tags else "",
        f"difficulty: {tier} ({rating})",
    ]

    if statement:
        # Truncate to ~500 chars — model handles tokenization limits
        parts.append(statement[:500])

    return " | ".join(p for p in parts if p)


def generate_embeddings(texts: list[str], batch_size: int = 256) -> np.ndarray:
    """Generate embeddings for a list of texts using sentence-transformers.

    Returns numpy array of shape (len(texts), 384).
    """
    from sentence_transformers import SentenceTransformer

    print(f"Loading embedding model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    print(f"Generating embeddings for {len(texts)} texts (batch_size={batch_size})...")
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,  # Pre-normalize for cosine similarity
    )

    return np.array(embeddings, dtype=np.float32)


def build_faiss_index(embeddings: np.ndarray) -> Any:
    """Build a FAISS IndexFlatIP for cosine similarity search.

    Embeddings should already be L2-normalized (done by generate_embeddings).
    """
    import faiss

    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)  # Inner product = cosine sim on normalized vectors
    index.add(embeddings)
    print(f"FAISS index built: {index.ntotal} vectors, dim={dim}")
    return index


def find_neighbors(
    index: Any,
    embeddings: np.ndarray,
    k: int = 20,
) -> tuple[np.ndarray, np.ndarray]:
    """Find top-K nearest neighbors for all embeddings.

    Returns:
        scores: (n, k) array of similarity scores
        indices: (n, k) array of neighbor indices
    """
    import faiss  # noqa: F811

    print(f"Searching {k} nearest neighbors for {embeddings.shape[0]} problems...")
    # k+1 because the closest neighbor is the problem itself
    scores, indices = index.search(embeddings, k + 1)

    # Remove self-matches (first column is always self with score ~1.0)
    scores = scores[:, 1:]
    indices = indices[:, 1:]

    return scores, indices


def apply_boosts(
    scores: np.ndarray,
    indices: np.ndarray,
    problems: list[dict[str, Any]],
    curated_ids: set[str],
) -> tuple[np.ndarray, np.ndarray]:
    """Apply tag-based and curated boosts to neighbor scores.

    Modifies scores in-place and re-sorts.
    """
    n = len(problems)
    boosted_scores = scores.copy()

    for i in range(n):
        p_tags = set(problems[i].get("tags", []))
        p_rating = problems[i].get("rating", 0)
        p_id = f"{problems[i]['contestId']}/{problems[i]['index']}"

        for j_idx in range(indices.shape[1]):
            neighbor_pos = indices[i, j_idx]
            if neighbor_pos < 0 or neighbor_pos >= n:
                continue

            n_tags = set(problems[neighbor_pos].get("tags", []))
            n_rating = problems[neighbor_pos].get("rating", 0)
            n_id = f"{problems[neighbor_pos]['contestId']}/{problems[neighbor_pos]['index']}"

            # Tag boost: +0.05 per shared tag
            shared = p_tags & n_tags
            boosted_scores[i, j_idx] += len(shared) * 0.05

            # Difficulty progression: same tags + adjacent rating
            if shared and abs(p_rating - n_rating) <= 200:
                boosted_scores[i, j_idx] += 0.03

            # Curated problem boost
            if n_id in curated_ids:
                boosted_scores[i, j_idx] += 0.01

    # Re-sort each row by boosted score (descending)
    for i in range(n):
        order = np.argsort(-boosted_scores[i])
        boosted_scores[i] = boosted_scores[i][order]
        indices[i] = indices[i][order]

    return boosted_scores, indices


def build_graph(
    problems: list[dict[str, Any]],
    scores: np.ndarray,
    indices: np.ndarray,
    problem_ids: list[str],
    k: int = 20,
) -> dict[str, Any]:
    """Build the final graph JSON structure.

    Args:
        problems: List of problem dicts.
        scores: (n, k) boosted similarity scores.
        indices: (n, k) neighbor indices.
        problem_ids: List of "contestId/index" strings mapping index to ID.
        k: Number of neighbors to include per problem.
    """
    from datetime import datetime, timezone

    neighbors: dict[str, list[dict[str, Any]]] = {}

    for i, pid in enumerate(problem_ids):
        p_tags = set(problems[i].get("tags", []))
        entry = []
        for j in range(min(k, indices.shape[1])):
            neighbor_pos = indices[i, j]
            if neighbor_pos < 0 or neighbor_pos >= len(problem_ids):
                continue
            n_id = problem_ids[neighbor_pos]
            n_tags = set(problems[neighbor_pos].get("tags", []))
            shared = sorted(p_tags & n_tags)
            entry.append({
                "id": n_id,
                "score": round(float(scores[i, j]), 4),
                "shared_tags": shared,
            })
        neighbors[pid] = entry

    graph = {
        "meta": {
            "total_problems": len(problems),
            "total_edges": sum(len(v) for v in neighbors.values()),
            "k": k,
            "built_at": datetime.now(timezone.utc).isoformat(),
        },
        "neighbors": neighbors,
    }
    return graph


def save_artifacts(
    embeddings: np.ndarray,
    problem_ids: list[str],
    graph: dict[str, Any],
) -> None:
    """Save embeddings, problem ID mapping, and graph to disk."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    np.save(DATA_DIR / "embeddings.npy", embeddings)
    print(f"  Saved embeddings: {embeddings.shape}")

    with open(DATA_DIR / "problem_ids.json", "w", encoding="utf-8") as f:
        json.dump(problem_ids, f)
    print(f"  Saved problem IDs: {len(problem_ids)}")

    with open(DATA_DIR / "graph.json", "w", encoding="utf-8") as f:
        json.dump(graph, f, ensure_ascii=False)
    print(f"  Saved graph: {graph['meta']['total_problems']} problems, {graph['meta']['total_edges']} edges")
