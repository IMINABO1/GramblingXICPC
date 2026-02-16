# CF:ICPC — Codeforces-Based ICPC Training Platform

A self-guided training platform for an 8-person ICPC team preparing for September 2026 regionals. Curates ~220 competitive programming problems from Codeforces, organizes them into a prerequisite-based skill tree, and provides per-member progress tracking — essentially a "Codeforces 220" modeled after LeetCode 150, but tailored for ICPC.

## Why This Exists

ICPC requires different skills than LeetCode. While LeetCode focuses on pattern recognition and interviews, ICPC demands mathematical reasoning, algorithmic breadth, and team coordination under time pressure. Without a dedicated coach or structured program, this platform fills the gap by providing:

- **Curated curriculum**: 220 problems across 22 topics in 5 difficulty tiers
- **Prerequisite enforcement**: Locked topics until you complete their foundations
- **Team accountability**: Per-member progress tracking and upsolving queues
- **Contest simulation**: Virtual contest logging with trend analysis
- **Problem discovery**: 10,700+ problem similarity graph for exploration

## Features

### Core Training Tools
- **Dashboard** — Aggregate stats, per-topic progress cards, completion percentages
- **Skill Tree** — Visual prerequisite graph with lock/unlock state based on progress
- **Problems** — Filterable problem list with per-member checkboxes, rating badges, CF links
- **Timeline** — 7-month training plan with monthly focus areas and milestone goals

### Team Management
- **Team** — Edit member names, set CF handles, sync submission history from Codeforces API
- **Compose** — Smart team splitter: 8 members → 2 teams of 3 + 2 alternates, optimized for coverage

### Contest & Practice
- **Contests** — Log virtual contests with per-problem results, team assignments, solve times
- **Upsolve** — Auto-populated queue showing which members still need to solve each contest problem
- **CF Explorer** — Browse the full Codeforces dataset, view tag/rating distributions

### Advanced
- **Recommendations** — Personalized problem suggestions based on progress and skill level
- **Cosmos** — 3D UMAP projection of 10,700+ problems colored by topic (experimental)
- **Problem Graph** — 214,220 similarity edges between problems using sentence embeddings

## Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS v4
- React hooks for state management

**Backend:**
- FastAPI (Python 3.11+)
- Pydantic for request/response validation
- JSON file storage (SQLite/PostgreSQL planned for production)

**Data & ML:**
- `sentence-transformers` with `all-MiniLM-L6-v2` (384-dim embeddings)
- FAISS for k-NN similarity search
- Codeforces API for problem metadata and submission history

## Project Structure

```
.
├── backend/
│   ├── data/                     # JSON data stores
│   │   ├── problems.json         # Curated 220 problem set
│   │   ├── team.json             # Team members + solve state
│   │   ├── contests.json         # Virtual contest logs
│   │   ├── graph.json            # Full 10k+ problem graph
│   │   ├── embeddings.npy        # 10,711 × 384 embedding matrix
│   │   └── ...
│   ├── routers/                  # FastAPI route handlers
│   │   ├── problems.py           # GET /api/problems/, /api/problems/topics
│   │   ├── team.py               # Team CRUD, CF handle sync
│   │   ├── contests.py           # Contest CRUD, trends
│   │   ├── upsolve.py            # Upsolve queue derivation
│   │   ├── graph.py              # Problem graph queries
│   │   └── codeforces.py         # CF API proxy (CORS bypass)
│   ├── services/                 # Business logic
│   │   ├── cf_client.py          # Codeforces API client
│   │   ├── handle_sync.py        # Submission sync logic
│   │   └── ...
│   └── main.py                   # FastAPI app entry point
├── frontend/
│   ├── app/                      # Next.js pages (App Router)
│   │   ├── page.tsx              # Dashboard
│   │   ├── skills/page.tsx       # Skill Tree
│   │   ├── problems/page.tsx     # Problem list
│   │   ├── team/page.tsx         # Team management
│   │   ├── contests/page.tsx     # Contest tracker
│   │   ├── upsolve/page.tsx      # Upsolve queue
│   │   └── ...
│   ├── components/               # Reusable React components
│   ├── lib/
│   │   ├── api.ts                # Backend API client
│   │   ├── types.ts              # TypeScript interfaces
│   │   ├── hooks.ts              # Custom React hooks
│   │   └── constants.ts          # Static data (topic graph, timeline)
│   └── public/
│       └── manifest.json         # PWA manifest
├── scripts/
│   ├── build_graph.py            # One-time: build full CF problem graph
│   ├── sync_handles.py           # CLI: sync CF handles
│   └── ...
├── CLAUDE.md                     # Instructions for Claude Code
├── project_context.md            # Project overview & context
├── TODO.md                       # Feature checklist
└── README.md                     # This file
```

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Backend Setup

```bash
# Create virtual environment (from project root)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the API server (from project root)
python -m uvicorn backend.main:app --reload
# Server runs at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run the dev server
npm run dev
# App runs at http://localhost:3000
```

### Initial Data Setup

The repo includes pre-built data files:
- `backend/data/problems.json` — 220 curated problems
- `backend/data/graph.json` — 10,711 problems with 214,220 edges
- `backend/data/embeddings.npy` — Pre-computed embeddings

To rebuild from scratch (takes ~2 hours):
```bash
cd scripts
python build_graph.py  # Scrapes CF, computes embeddings, builds graph
```

## Usage

### 1. Set Up Team Members

1. Navigate to **Team** page
2. Edit member names
3. Set Codeforces handles for each member
4. Click "Sync All" to pull submission history

### 2. Track Progress

- **Dashboard**: See overall progress and per-topic completion
- **Problems**: Check off problems as you solve them
- **Skill Tree**: Unlock new topics by completing prerequisites

### 3. Run Virtual Contests

1. Go to **Contests** page
2. Click "Log Contest"
3. Enter a Codeforces contest ID (e.g., 1680)
4. System auto-fetches problem list
5. Assign members to Team A / Team B
6. Record which team solved each problem and time taken
7. View trends over time

### 4. Upsolve Problems

1. After logging a contest, go to **Upsolve** page
2. System automatically checks which members haven't solved each problem on CF
3. Filter by member, status (pending/complete), or contest
4. Click "Sync from CF" to refresh solve status
5. Dismiss problems you don't want to prioritize

### 5. Discover Related Problems

- **CF Explorer**: Browse all 10,000+ CF problems, filter by tags/rating
- **Cosmos**: 3D visualization of problem space (experimental)
- **Problem Graph API**: Query k-nearest neighbors for any problem

## API Reference

### Problems
- `GET /api/problems/` — List all curated problems
- `GET /api/problems/topics` — Topic taxonomy with prerequisites

### Team
- `GET /api/team/` — List all members
- `PUT /api/team/{id}` — Update member name or CF handle
- `POST /api/team/{id}/sync` — Sync one member's CF submissions
- `POST /api/team/sync-all` — Sync all members

### Contests
- `GET /api/contests/` — List all virtual contests
- `POST /api/contests/` — Log a new contest
- `PUT /api/contests/{id}` — Update contest results
- `DELETE /api/contests/{id}` — Delete a contest
- `GET /api/contests/trends` — Aggregate trend data

### Upsolve
- `GET /api/upsolve/` — Get full upsolve queue
- `GET /api/upsolve/stats` — Aggregate upsolve stats
- `POST /api/upsolve/dismiss` — Dismiss a problem
- `POST /api/upsolve/undismiss` — Undo dismissal

### Graph
- `GET /api/graph/` — Graph metadata
- `GET /api/graph/neighbors/{contest_id}/{index}?limit=N` — Get similar problems
- `GET /api/graph/curated-subgraph` — Subgraph of 220 curated problems
- `GET /api/graph/cosmos` — 3D UMAP projection data

### Recommendations
- `GET /api/recommendations/{member_id}` — Get personalized problem recommendations
  - Query params: `seed_problem` (problem ID), `limit` (1-50), `difficulty_range` (0-400)
  - Two modes:
    - **Discovery mode** (no seed): recommends based on weak topics and difficulty progression
    - **Seed mode** (with seed problem): recommends similar problems at slightly higher difficulty

Full API docs available at `http://localhost:8000/docs` when backend is running.

## Training Plan (7 Months)

| Period | Focus | Goal |
|--------|-------|------|
| Feb–Mar | Foundations (Implementation, Math, Sorting) | Solve Div2 A/B in < 10 min |
| Mar–Apr | Core I (Binary Search, Two Pointers, Prefix Sums, Number Theory) | Comfortable with Div2 C |
| Apr–May | Core II (BFS/DFS, DP Fundamentals) | Graph traversal & basic DP on autopilot |
| May–Jun | Intermediate I (Shortest Paths, DSU, Topo Sort, Trees) | Solve Div2 D consistently |
| Jun–Jul | Intermediate II (Strings, DP Intermediate, Combinatorics) | Handle most Div2 D/E |
| Jul–Aug | Advanced (Seg Trees, Game Theory, Advanced Graphs, Geometry) | Competitive at regional level |
| Aug–Sep | Polish & Team Strategy (DP Advanced, Advanced Topics) | Virtual contests, team coordination |

## Architecture Decisions

### Why Local Embeddings?
- No API keys or rate limits
- Free and reproducible
- `all-MiniLM-L6-v2` is fast (2ms per problem) and good enough for similarity

### Why JSON Storage?
- 8-person team, not a SaaS product
- Simple backups (git commit the data folder)
- Easy to inspect and debug
- Can migrate to PostgreSQL later if needed

### Why Next.js?
- PWA support out of the box ("Add to Home Screen" on mobile)
- Server components for static pages, client components for interactivity
- Better SEO than plain React (not critical here, but nice)

### Why No Auth?
- Small team (8 people), all trusted
- Runs locally or on a private network
- Adding auth is straightforward later if needed

## Development

### Run Tests
```bash
cd backend
pytest

cd frontend
npm test
```

### Linting
```bash
# Backend
cd backend
ruff check .

# Frontend
cd frontend
npm run lint
```

### Build for Production
```bash
# Backend: runs directly with uvicorn
uvicorn backend.main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm run build
npm start
```

## Roadmap

**Completed:**
- ✅ 220 curated problems across 22 topics
- ✅ Prerequisite-based skill tree
- ✅ Per-member progress tracking
- ✅ 7-month training timeline
- ✅ CF handle integration & sync
- ✅ Full problem similarity graph (10k+ problems)
- ✅ Team composition optimizer
- ✅ Virtual contest tracker
- ✅ Upsolving queue
- ✅ Problem recommendation engine (next-problem suggester)

**Backlog:**
- Spaced repetition (flag topics not practiced in 30+ days)
- Contest history analysis (classify past ICPC regionals by topic)
- Editorial/hints integration
- Weekly leaderboard & accountability reports
- Mobile-friendly responsive pass
- Export to CSV/spreadsheet

## Contributing

This is a focused tool for a specific team, not open for general contributions. However, if you're building something similar, feel free to fork and adapt. The architecture is intentionally simple and should be easy to modify.

## License

MIT

## Credits

Built for the Grambling State University ICPC team preparing for September 2026 regionals. Powered by the [Codeforces API](https://codeforces.com/apiHelp) and [Sentence Transformers](https://www.sbert.net/).

---

**Target:** Consistently solve 5+ problems in 5 hours by September 2026. Let's get it. 🚀
