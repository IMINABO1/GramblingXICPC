"""CF:ICPC API — FastAPI backend."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

# Load .env from backend/ directory (or project root)
_backend_dir = Path(__file__).parent
load_dotenv(_backend_dir / ".env")
load_dotenv(_backend_dir.parent / ".env")
from fastapi.middleware.cors import CORSMiddleware

from routers import codeforces, contests, editorials, graph, journals, leaderboard, notes, problems, recommendations, regionals, review, rotations, solve_quality, tags, team, upsolve

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Build curated graph on startup if missing (e.g. fresh Heroku deploy)
    try:
        from services.graph_builder import build_curated_graph
        logger.info("Checking for graph.json...")
        build_curated_graph()
    except Exception as e:
        logger.warning(f"Could not build curated graph: {e}")

    # Pre-load embedding model and FAISS index on startup to avoid cold-start 500s
    try:
        from services.note_embeddings import _load_index
        logger.info("Pre-loading FAISS index...")
        _load_index()
        logger.info("FAISS index ready.")
    except Exception as e:
        logger.warning(f"Could not pre-load FAISS index: {e}")
    yield


app = FastAPI(
    title="CF:ICPC API",
    description="Codeforces-based ICPC training platform backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(problems.router, prefix="/api/problems", tags=["problems"])
app.include_router(graph.router, prefix="/api/graph", tags=["graph"])
app.include_router(team.router, prefix="/api/team", tags=["team"])
app.include_router(contests.router, prefix="/api/contests", tags=["contests"])
app.include_router(upsolve.router, prefix="/api/upsolve", tags=["upsolve"])
app.include_router(codeforces.router, prefix="/api/codeforces", tags=["codeforces"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["recommendations"])
app.include_router(review.router, prefix="/api/review", tags=["review"])
app.include_router(regionals.router, prefix="/api/regionals", tags=["regionals"])
app.include_router(editorials.router, prefix="/api/editorials", tags=["editorials"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])
app.include_router(tags.router, prefix="/api/tags", tags=["tags"])
app.include_router(notes.router, prefix="/api/notes", tags=["notes"])
app.include_router(journals.router, prefix="/api/journals", tags=["journals"])
app.include_router(solve_quality.router, prefix="/api/solve-quality", tags=["solve-quality"])
app.include_router(rotations.router, prefix="/api/rotations", tags=["rotations"])


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
