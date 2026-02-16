"""Graph router — serves problem similarity graph."""

import json
import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent / "data"


def _load_graph() -> dict[str, Any] | None:
    path = DATA_DIR / "graph.json"
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_problems() -> list[dict[str, Any]]:
    path = DATA_DIR / "problems.json"
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _problem_id_to_graph_key(pid: str) -> str | None:
    """Convert problem ID like '1A' or '1352C2' to graph key like '1/A' or '1352/C2'."""
    m = re.match(r"^(\d+)([A-Za-z]\d*)$", pid)
    if not m:
        return None
    return f"{m.group(1)}/{m.group(2)}"


@router.get("/")
async def graph_meta() -> dict[str, Any]:
    """Return graph metadata (total problems, edges, build time)."""
    graph = _load_graph()
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not built yet. Run scripts/build_graph.py first.")
    return graph["meta"]


@router.get("/curated-subgraph")
async def curated_subgraph() -> dict[str, Any]:
    """Return the subgraph of curated problems with mutual similarity edges."""
    graph = _load_graph()
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not built yet.")

    problems = _load_problems()
    if not problems:
        raise HTTPException(status_code=404, detail="No curated problems found.")

    # Build set of curated problem IDs and their graph keys
    curated_ids: set[str] = set()
    id_to_key: dict[str, str] = {}
    key_to_id: dict[str, str] = {}
    for p in problems:
        pid = p["id"]
        gkey = _problem_id_to_graph_key(pid)
        if gkey:
            curated_ids.add(pid)
            id_to_key[pid] = gkey
            key_to_id[gkey] = pid

    neighbors = graph.get("neighbors", {})

    # Build nodes
    nodes = [
        {
            "id": p["id"],
            "name": p["name"],
            "rating": p.get("rating", 0),
            "topic": p.get("topic", ""),
        }
        for p in problems
        if p["id"] in curated_ids
    ]

    # Build edges: only between curated problems, deduplicated
    seen_edges: set[tuple[str, str]] = set()
    edges: list[dict[str, Any]] = []
    for pid in curated_ids:
        gkey = id_to_key.get(pid)
        if not gkey or gkey not in neighbors:
            continue
        for nb in neighbors[gkey]:
            nb_id = key_to_id.get(nb["id"])
            if not nb_id or nb_id not in curated_ids:
                continue
            edge_key = (min(pid, nb_id), max(pid, nb_id))
            if edge_key in seen_edges:
                continue
            seen_edges.add(edge_key)
            edges.append({
                "source": pid,
                "target": nb_id,
                "score": nb["score"],
            })

    return {"nodes": nodes, "edges": edges}


@router.get("/cosmos")
async def cosmos_data() -> dict[str, Any]:
    """Return all problems with pre-computed 3D positions for the cosmos visualization."""
    path = DATA_DIR / "positions.json"
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail="Positions not built yet. Run scripts/build_positions.py first.",
        )
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/neighbors/{contest_id}/{index}")
async def get_neighbors(
    contest_id: int,
    index: str,
    limit: int = Query(default=10, ge=1, le=50),
) -> list[dict[str, Any]]:
    """Get similar problems for a given problem."""
    graph = _load_graph()
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not built yet.")
    key = f"{contest_id}/{index}"
    neighbors = graph.get("neighbors", {}).get(key)
    if neighbors is None:
        raise HTTPException(status_code=404, detail=f"Problem {key} not found in graph.")
    return neighbors[:limit]
