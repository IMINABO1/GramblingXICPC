# CF:ICPC — Project TODO

## Active

### Build Full Codeforces Problem Graph
**Priority:** High
**Status:** Done

Created a similarity graph of 10,711 Codeforces problems with 214,220 edges (20 neighbors per problem). Used `all-MiniLM-L6-v2` embeddings (free, local) with FAISS nearest-neighbor search. Scraped 10,637 full problem statements via parallel `cloudscraper` (Cloudflare bypass). Tag-based and difficulty-progression boosts applied. Edges are weighted by cosine similarity score.

**Resolved decisions:**
- Edges are weighted (not binary) — scores range from ~0.4 to ~0.8
- Problem statements were scraped for richer embeddings (significant quality improvement)
- Problems with no tags/rating are included with metadata-only embeddings
- K=20 neighbors per problem

**Artifacts:**
- `backend/data/graph.json` — full similarity graph
- `backend/data/embeddings.npy` — 10,711 × 384 embedding matrix
- `backend/data/cf_problems_raw.json` — raw CF API data
- `backend/data/statements_cache.json` — scraped problem statements
- `backend/data/problem_ids.json` — index-to-ID mapping

**API:** `GET /api/graph/neighbors/{contest_id}/{index}?limit=N`

---

### Codeforces Handle Integration
**Priority:** High
**Status:** Done (backend)

Backend API for syncing CF submission history per team member. Uses `CFClient.fetch_user_submissions()` to pull accepted submissions and maps them to the curated 184-problem set. Results cached in `backend/data/team.json` with last-synced timestamps.

**API endpoints:**
- `GET /api/team/` — list all members with solve counts
- `GET /api/team/{id}` — single member details
- `PUT /api/team/{id}` — update name / CF handle
- `POST /api/team/{id}/sync` — sync one member
- `POST /api/team/sync-all` — sync all members with handles

**CLI:** `python scripts/sync_handles.py --list | --member N | --set-handle N handle`

**Artifacts:**
- `backend/data/team.json` — team member data + sync state
- `backend/services/handle_sync.py` — sync logic
- `backend/routers/team.py` — API endpoints

**Frontend integration:** Done — Team page has CF handle input, sync buttons, and last-synced display.

---

### Team Composition Planner
**Priority:** Medium
**Status:** Done

Added `/compose` page for splitting the 8 members into 2 teams of 3 + 2 alternates. Backend brute-forces all 280 possible splits and picks the one that maximizes the weaker team's coverage. Members' topic strengths are computed from solved problems and grouped into 3 role clusters (Graphs, DP/Math, Impl/DS). Frontend shows a 3-column layout (Team 1 / Team 2 / Bench) with click-to-reassign and per-team coverage bars. Auto-Balance button re-runs the algorithm.

**API:** `POST /api/team/compose`

**Artifacts:**
- `backend/routers/team.py` — compose endpoint + balancing algorithm
- `frontend/app/compose/page.tsx` — compose page UI

---

### Virtual Contest Tracker
**Priority:** Medium
**Status:** Done

Full CRUD for logging virtual contests. Enter a CF contest ID to auto-fetch problem list, assign team members to Team A / Team B, record which team solved each problem and time taken. Trend charts (bar + line) show solve counts and times across contests. Edit and delete support.

**API endpoints:**
- `GET /api/contests/` — list all virtual contests
- `GET /api/contests/{id}` — single contest details
- `POST /api/contests/` — log a new contest
- `PUT /api/contests/{id}` — update contest
- `DELETE /api/contests/{id}` — delete contest
- `GET /api/contests/trends` — aggregated trend data

**Artifacts:**
- `backend/routers/contests.py` — CRUD + trends endpoints
- `backend/data/contests.json` — contest data store
- `frontend/app/contests/page.tsx` — contests page with stats, trends, and form
- `frontend/components/contest-form.tsx` — contest creation/edit modal
- `frontend/components/contest-card.tsx` — expandable contest card
- `frontend/components/trend-bar-chart.tsx` — bar chart for trends
- `frontend/components/trend-line-chart.tsx` — line chart for trends

---

### Upsolving Queue
**Priority:** Medium
**Status:** Done

Auto-populates an upsolve queue from virtual contests. For each contest, every problem is checked against each participating member's CF submission history (`all_accepted`). Members who haven't solved a problem on CF see it as "pending." Filters by member, status (all/pending/complete), and dismissed items. "Sync from CF" button refreshes submission data.

**API endpoints:**
- `GET /api/upsolve/` — full queue grouped by contest with per-member statuses
- `GET /api/upsolve/stats` — aggregate stats (totals, per-member, per-contest, completion %)
- `POST /api/upsolve/dismiss` — dismiss a problem from the queue
- `POST /api/upsolve/undismiss` — undo dismissal

**Artifacts:**
- `backend/routers/upsolve.py` — upsolve queue + stats + dismiss endpoints
- `frontend/app/upsolve/page.tsx` — upsolve page with filters, stats, and problem rows

---

### Leaderboard & Weekly Reports
**Priority:** Medium
**Status:** Done

Rankings, streaks, weekly solve counts, topic coverage heatmap, and a copy-pasteable weekly summary for Discord/Slack. All metrics computed on the fly from existing `problem_timestamps` data — no new storage needed.

**Features:**
- Per-member rankings sorted by curated problems solved
- Streak tracking (current + all-time longest) from consecutive solve days
- Weekly solve counts with 8-week sparkline trend charts
- Topic coverage heatmap (members x 22 topics, color intensity = completion %)
- Pre-formatted weekly summary with markdown table, copy-to-clipboard

**API endpoints:**
- `GET /api/leaderboard/?weeks=N` — full leaderboard with all metrics
- `GET /api/leaderboard/weekly-summary?week_offset=N` — formatted summary text

**Artifacts:**
- `backend/routers/leaderboard.py` — leaderboard + weekly summary endpoints
- `frontend/app/leaderboard/page.tsx` — leaderboard page with rankings, sparklines, heatmap, summary

---

---

### Problem Recommendation Engine
**Priority:** Medium
**Status:** Done

Built a recommendation system that suggests next problems based on member progress. Uses the similarity graph for seed-based recommendations and analyzes topic coverage + difficulty progression for discovery mode. Frontend includes a dedicated /recommendations page and a dashboard widget showing top 5 suggestions.

**Features:**
- Discovery mode: suggests problems from weak topics at appropriate difficulty
- Seed mode: finds similar problems at slightly higher difficulty (via similarity graph)
- Factors in prerequisite coverage, topic distribution, and rating progression
- Human-readable reasons for each recommendation

**API:** `GET /api/recommendations/{member_id}?seed_problem=X&limit=N&difficulty_range=M`

**Artifacts:**
- `backend/routers/recommendations.py` — recommendation endpoint + scoring logic
- `frontend/app/recommendations/page.tsx` — recommendations page
- `frontend/components/recommendations-panel.tsx` — reusable recommendation UI
- `frontend/components/recommendations-widget.tsx` — dashboard widget (top 5)

---

### Spaced Repetition for Topics
**Priority:** Medium
**Status:** Done

Tracks when members last solved problems in each topic and flags topics not practiced recently. Helps maintain skills across all areas by periodically revisiting old topics.

**Features:**
- Per-member, per-topic last-solved date tracking from CF submission timestamps
- Configurable staleness threshold (7, 14, 30, 60, 90 days)
- Practice recency overview (this week, this month, 1-3 months, 3-6 months, 6+ months, untouched)
- Stale topics list with days since last practice and problems solved count
- Suggested review problems from stale topics (unsolved curated problems)

**API endpoints:**
- `GET /api/review/{member_id}?stale_days=N&limit=M` — get topics needing review
- `GET /api/review/{member_id}/stats` — practice overview stats

**Artifacts:**
- `backend/services/handle_sync.py` — modified to track solve timestamps per problem
- `backend/routers/review.py` — review API endpoints
- `frontend/app/review/page.tsx` — spaced repetition page with filters and suggestions

---

### Contest History Analysis
**Priority:** Medium
**Status:** Done

Built a comprehensive ICPC regional analysis system that fetches gym contests from Codeforces, filters to ICPC regionals, and classifies problems by topic using CF tags. Shows which topic areas are most heavily tested in historical ICPC regionals to help prioritize training.

**Features:**
- Fetches and analyzes 50+ ICPC regional contests from CF Gym
- Topic classifier maps CF problem tags to our 22-topic taxonomy
- Aggregate statistics showing topic distribution across all analyzed contests
- Priority recommendations (Critical/High/Medium/Low) based on topic frequency
- Per-contest detailed breakdowns with topic percentages
- Cached results to avoid repeated API calls
- Manual refresh option for up-to-date data

**API endpoints:**
- `GET /api/regionals/` — get analyzed regional data with topic distributions
- `GET /api/regionals/recommendations` — get training priority recommendations
- `POST /api/regionals/refresh` — force refresh from CF API
- `GET /api/regionals/contests/{id}` — detailed analysis for specific contest

**Artifacts:**
- `backend/services/cf_client.py` — extended with contest fetching methods
- `backend/services/topic_classifier.py` — CF tag → topic taxonomy mapper
- `backend/services/regional_analyzer.py` — contest analysis and aggregation service
- `backend/routers/regionals.py` — API endpoints
- `backend/data/regionals.json` — cached analysis results
- `frontend/app/regionals/page.tsx` — regionals analysis page with visualizations
- `frontend/lib/api.ts` — regionals API client methods
- `frontend/lib/types.ts` — regionals type definitions

---

## Backlog

### Mobile-Friendly Redesign
Current UI works but isn't optimized for phone screens. Since people might want to check off problems or review the plan on the go, a responsive pass would help.

---

## Completed

- [x] Curate ~220 problems across 22 topics with difficulty progression
- [x] Build prerequisite-based skill tree with 5 tiers
- [x] Per-member progress tracking with persistent storage
- [x] 7-month training timeline with monthly goals
- [x] CF Explorer tab with live API integration
- [x] Project context documentation
- [x] Backend scaffolding (FastAPI + routers + services)
- [x] Codeforces API client with rate limiting and retry logic
- [x] Parallel problem statement scraper (10,637 statements, Cloudflare bypass)
- [x] Embedding generation (all-MiniLM-L6-v2, sentence-transformers)
- [x] FAISS similarity search + graph construction (10,711 problems, 214,220 edges)
- [x] Curated problem data migration (problems.json, topics.json)
- [x] FastAPI endpoints: health, problems, topics, graph meta, graph neighbors
- [x] CF handle integration backend (team CRUD, submission sync, curated mapping)
- [x] CLI tool for handle sync (`scripts/sync_handles.py`)
- [x] Next.js frontend scaffolding (App Router, TypeScript, Tailwind v4, PWA manifest)
- [x] Frontend shared lib: types, API client, hooks, constants
- [x] Frontend components: header nav, stat-box, progress-bar, topic-card, rating-badge, member-pill
- [x] Dashboard page (aggregate stats + per-topic progress cards)
- [x] Skill Tree page (prerequisite graph with lock/unlock state)
- [x] Problems page (filters, per-member solved indicators, deep linking)
- [x] Timeline page (7-month training plan)
- [x] Team page (name editing, CF handle input, sync buttons, top-topic breakdown)
- [x] CF Explorer page (graph metadata, full CF dataset fetch, tag/rating distributions)
- [x] Team Composition Planner (/compose page, auto-balance algorithm, click-to-reassign UI)
- [x] Virtual Contest Tracker (CRUD, CF lookup, team assignment, per-problem results, trend charts)
- [x] Upsolving Queue (derived from contests + CF submissions, per-member status, filters, dismiss)
- [x] Spaced Repetition for Topics (/review page, staleness tracking, practice recency stats, review suggestions)
- [x] Contest History Analysis (/regionals page, CF Gym scraping, topic classification, priority recommendations)
- [x] Editorial / Hints Integration (automatic editorial discovery, cached links, integrated across all problem views)
- [x] Leaderboard & Weekly Reports (/leaderboard page, rankings, streaks, weekly sparklines, topic heatmap, copy-paste summary)
- [x] Export to CSV (frontend-only CSV export on Problems page, per-member solve columns, filter-aware, descriptive filenames)
