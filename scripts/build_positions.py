"""Compute 3D positions for all CF problems using UMAP on embeddings.

Usage:
    python scripts/build_positions.py                  # Default settings
    python scripts/build_positions.py --neighbors 15   # UMAP n_neighbors
    python scripts/build_positions.py --min-dist 0.1   # UMAP min_dist
"""

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "backend" / "data"


def main() -> None:
    parser = argparse.ArgumentParser(description="Build 3D positions via UMAP")
    parser.add_argument("--neighbors", type=int, default=15, help="UMAP n_neighbors (default: 15)")
    parser.add_argument("--min-dist", type=float, default=0.1, help="UMAP min_dist (default: 0.1)")
    parser.add_argument("--spread", type=float, default=1.0, help="UMAP spread (default: 1.0)")
    args = parser.parse_args()

    start = time.time()

    # Load embeddings
    emb_path = DATA_DIR / "embeddings.npy"
    if not emb_path.exists():
        print("Error: embeddings.npy not found. Run scripts/build_graph.py first.")
        sys.exit(1)

    print("Loading embeddings...")
    embeddings = np.load(emb_path)
    print(f"  Shape: {embeddings.shape}")

    # Load problem IDs
    ids_path = DATA_DIR / "problem_ids.json"
    if not ids_path.exists():
        print("Error: problem_ids.json not found. Run scripts/build_graph.py first.")
        sys.exit(1)

    with open(ids_path, "r", encoding="utf-8") as f:
        problem_ids: list[str] = json.load(f)
    print(f"  Problem IDs: {len(problem_ids)}")

    # Load raw problem metadata
    raw_path = DATA_DIR / "cf_problems_raw.json"
    if not raw_path.exists():
        print("Error: cf_problems_raw.json not found. Run scripts/build_graph.py first.")
        sys.exit(1)

    with open(raw_path, "r", encoding="utf-8") as f:
        raw_problems: list[dict] = json.load(f)
    print(f"  Raw problems: {len(raw_problems)}")

    # Build lookup: "contestId/index" -> problem metadata
    meta_lookup: dict[str, dict] = {}
    for p in raw_problems:
        key = f"{p['contestId']}/{p['index']}"
        meta_lookup[key] = p

    # Run UMAP
    print(f"\nRunning UMAP (n_neighbors={args.neighbors}, min_dist={args.min_dist}, spread={args.spread})...")
    from umap import UMAP

    reducer = UMAP(
        n_components=3,
        n_neighbors=args.neighbors,
        min_dist=args.min_dist,
        spread=args.spread,
        metric="cosine",
        random_state=42,
        verbose=True,
    )
    positions_3d = reducer.fit_transform(embeddings)
    print(f"  UMAP output shape: {positions_3d.shape}")

    # Normalize to roughly [-50, 50] range for good 3D scene scale
    for dim in range(3):
        col = positions_3d[:, dim]
        col_min, col_max = col.min(), col.max()
        positions_3d[:, dim] = (col - col_min) / (col_max - col_min) * 100 - 50

    # Build output
    problems_out = []
    for i, pid in enumerate(problem_ids):
        meta = meta_lookup.get(pid, {})
        problems_out.append({
            "id": pid,
            "name": meta.get("name", "Unknown"),
            "rating": meta.get("rating", 0),
            "tags": meta.get("tags", []),
            "x": round(float(positions_3d[i, 0]), 3),
            "y": round(float(positions_3d[i, 1]), 3),
            "z": round(float(positions_3d[i, 2]), 3),
        })

    output = {
        "meta": {
            "total": len(problems_out),
            "n_neighbors": args.neighbors,
            "min_dist": args.min_dist,
        },
        "problems": problems_out,
    }

    out_path = DATA_DIR / "positions.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    size_mb = out_path.stat().st_size / (1024 * 1024)
    elapsed = time.time() - start
    print(f"\nSaved {out_path} ({size_mb:.1f} MB, {len(problems_out)} problems)")
    print(f"Total time: {int(elapsed)}s")


if __name__ == "__main__":
    main()
