8 steps, 18 files to create:

Directory structure + requirements.txt
Migrate 220 curated problems + topic graph from JSX → JSON
CF API client (rate-limited, with retries)
Problem statement scraper (resumable, ~5 hours for full run)
Embedding generation + FAISS graph construction
build_graph.py orchestrator with --step and --skip-scrape flags
Minimal FastAPI app (scaffold + stubs)
Editorial scraper stub (phase 2, built after graph works)
Key decisions:

Sync requests for scraping (rate limit is the bottleneck, not I/O)
IndexFlatIP for FAISS (exact search is instant at 10K scale)
Scraper saves progress to statements_cache.json — fully resumable if interrupted
Graph stores raw similarity scores; frontend decides display threshold
Claude’s Plan
Plan: Build Codeforces Problem Graph + Backend Scaffold
Context
CF:ICPC needs a graph of ALL ~10K Codeforces problems where edges represent similarity. This enables a "next problem" recommender and a visual problem explorer beyond the curated 220. Currently the entire app is a single icpc-trainer.jsx file with no backend. This plan scaffolds the backend and builds the graph pipeline.

The user wants problem statements included in embeddings for richer similarity, and editorial scraping as a follow-up phase. Python 3.12.6 is available.

Step 1: Create directory structure + requirements.txt
Create:


backend/
  __init__.py
  main.py                   # FastAPI app (minimal, runnable)
  routers/
    __init__.py
    problems.py              # Stub
    graph.py                 # Stub
    team.py                  # Stub
    codeforces.py            # Stub
  services/
    __init__.py
    cf_client.py             # CF API client with rate limiting
    scraper.py               # Problem statement scraper (resumable)
    embeddings.py            # Embedding + FAISS utilities
  data/                      # Output directory (gitignored except problems.json)
scripts/
  build_graph.py             # Main orchestrator script
  scrape_editorials.py       # Stub for phase 2
  sync_handles.py            # Stub for future
requirements.txt
.gitignore                   # Update to ignore data caches, venv, .npy files
requirements.txt:


fastapi
uvicorn[standard]
sentence-transformers
faiss-cpu
requests
beautifulsoup4
numpy
pydantic
ruff
Step 2: Migrate curated problems to backend/data/problems.json
Extract the 220 problems from icpc-trainer.jsx (lines 28-256) into JSON:


[
  {
    "id": "1A",
    "name": "Theatre Square",
    "rating": 1000,
    "topic": "implementation",
    "url": "https://codeforces.com/problemset/problem/1/A",
    "curated": true
  },
  ...
]
Also extract TOPIC_GRAPH and TIER_LABELS/TIER_COLORS into a backend/data/topics.json for backend use.

Step 3: backend/services/cf_client.py — CF API client
Synchronous (using requests) — rate limit is the bottleneck, not I/O
Built-in 2-second delay between requests
fetch_all_problems() → calls problemset.problems, returns list of problem dicts
fetch_user_submissions(handle) → calls user.status, returns submissions
Retry with exponential backoff on 429/5xx
Saves raw API response to backend/data/cf_problems_raw.json
Step 4: backend/services/scraper.py — Problem statement scraper
This is the most complex piece. Key design:

Resumable: Reads/writes backend/data/statements_cache.json — a dict mapping "{contestId}/{index}" to scraped text. On restart, skips already-cached problems.
Rate-limited: 1 request per 2 seconds (time.sleep)
Robust: Retries on network errors (3 attempts, exponential backoff). Skips 404s (gym/private contests) and logs them.
HTML parsing: Uses BeautifulSoup to extract <div class="problem-statement"> content. Strips HTML tags, normalizes whitespace. Preserves structure (Input/Output sections) as plain text. LaTeX like $n$ gets simplified to just the variable name where possible.
Progress logging: Prints [1234/9500] Scraped 123A - Theatre Square every problem, with ETA.
URL pattern: https://codeforces.com/contest/{contestId}/problem/{index}

Expected runtime: ~5 hours for 9K problems at 2 sec/request. Designed to run overnight.

Step 5: backend/services/embeddings.py — Embedding + FAISS
build_text_representation(problem, statement) → combines name, tags, rating tier label, and first ~500 chars of statement into a single string
generate_embeddings(texts) → loads all-MiniLM-L6-v2, encodes all texts, returns numpy array. Model max is 256 word pieces — truncates automatically.
build_faiss_index(embeddings) → normalizes vectors (L2 norm), builds IndexFlatIP for cosine similarity
find_neighbors(index, embeddings, k=20) → batch query, returns top-K neighbors per problem
apply_boosts(neighbors, problems) → boost score for shared tags (+0.05 per shared tag), add difficulty-progression edges (same tags, rating ±200, +0.03 boost), slight curated boost (+0.01)
Saves: embeddings.npy, problem_ids.json (index-to-ID mapping)
Step 6: scripts/build_graph.py — Main orchestrator
Ties everything together with a CLI interface:


python scripts/build_graph.py              # Run full pipeline
python scripts/build_graph.py --skip-scrape # Skip scraping (use cached statements)
python scripts/build_graph.py --step fetch  # Only fetch from CF API
python scripts/build_graph.py --step scrape # Only scrape statements
python scripts/build_graph.py --step embed  # Only generate embeddings + graph
Pipeline:

Fetch: Call cf_client.fetch_all_problems(), save raw JSON, filter to problems with ratings (exclude gym). Print stats.
Scrape: Call scraper.scrape_all(problems). Resumable — picks up where it left off. Print progress with ETA.
Embed: Call embeddings.generate_embeddings() for all problems. ~5 min on CPU.
Build graph: Call embeddings.build_faiss_index(), find_neighbors(), apply_boosts(). Output graph.json.
Output format for graph.json:


{
  "meta": {
    "total_problems": 9234,
    "total_edges": 184680,
    "k": 20,
    "built_at": "2026-02-13T..."
  },
  "neighbors": {
    "1A": [
      {"id": "4A", "score": 0.92, "shared_tags": ["implementation", "math"]},
      {"id": "71A", "score": 0.88, "shared_tags": ["implementation"]},
      ...
    ],
    ...
  }
}
Step 7: backend/main.py — Minimal FastAPI app
Just enough to verify the scaffold works:


app = FastAPI(title="CF:ICPC API")
app.include_router(problems.router, prefix="/api/problems")
app.include_router(graph.router, prefix="/api/graph")
# ... other routers as stubs
Router stubs return placeholder responses. The graph router will later serve graph.json and support queries like "get neighbors of problem X".

Step 8: scripts/scrape_editorials.py — Editorial scraper (phase 2, stub)
Create as a stub with the planned approach documented:

For each contest, check https://codeforces.com/contest/{id} for editorial links
Scrape editorial blog posts
Map sections to individual problems
Save to backend/data/editorials_cache.json
This will be implemented after the graph is built and working.

Files modified/created
File	Action
requirements.txt	Create
.gitignore	Create/update
backend/__init__.py	Create (empty)
backend/main.py	Create
backend/routers/__init__.py	Create (empty)
backend/routers/problems.py	Create (stub)
backend/routers/graph.py	Create (stub)
backend/routers/team.py	Create (stub)
backend/routers/codeforces.py	Create (stub)
backend/services/__init__.py	Create (empty)
backend/services/cf_client.py	Create
backend/services/scraper.py	Create
backend/services/embeddings.py	Create
backend/data/problems.json	Create (migrated from JSX)
backend/data/topics.json	Create (migrated from JSX)
scripts/build_graph.py	Create
scripts/scrape_editorials.py	Create (stub)
scripts/sync_handles.py	Create (stub)
Not modified: icpc-trainer.jsx (source of truth, read-only for migration)

Verification
Scaffold: cd backend && py -m venv venv && venv\Scripts\activate && pip install -r ..\requirements.txt && py -m uvicorn main:app → FastAPI runs on localhost:8000
CF API fetch: py scripts/build_graph.py --step fetch → creates cf_problems_raw.json with ~9K problems
Scraping (smoke test): py scripts/build_graph.py --step scrape → scrapes first 10 problems, verify statements look correct, then Ctrl+C and resume to verify resumability
Embeddings: py scripts/build_graph.py --skip-scrape (using whatever statements are cached) → generates embeddings.npy and graph.json
Graph quality: Spot-check: neighbors of "1A Theatre Square" should be other implementation problems around rating 1000. Neighbors of a DP problem should be other DP problems.
Full run: Let scraper run overnight, then re-run embed step with full statement cache.
Stayed in plan mode
Great questions — let me clarify both:

Resumability: Yes, this is built in. The scraper saves every scraped statement to statements_cache.json as it goes. When you restart the script, it loads the cache and skips already-done problems. So if you scrape 3,000 problems, go offline, and rerun later — it picks up at problem 3,001. Same for the CF API fetch (saved to cf_problems_raw.json) and embeddings (embeddings.npy).

Parallel processing: Good call — I was being too conservative. We can use a thread pool with a shared rate limiter. Instead of 1 request every 2 seconds (sequential), we can run 3 workers staggered so we're still under CF's limit but 3x faster. That cuts scraping from ~5 hours to ~1.5-2 hours.

Let me update the plan.

Read C:\Users\rober\.claude\plans\enumerated-marinating-allen.md
Edit C:\Users\rober\.claude\plans\enumerated-marinating-allen.md
Modified
Updated the plan. To directly answer your questions:

Resumability: Yes — every step saves its output to disk incrementally. If you stop and rerun:

CF API fetch → cf_problems_raw.json already exists, skips re-fetching
Scraper → loads statements_cache.json, skips already-scraped problems, continues from where it left off
Embeddings/graph → --skip-scrape flag uses whatever's cached
Parallel processing: Updated the plan — the scraper will use 3 threads with a shared rate limiter (~1.5 req/sec total, safe for CF). This cuts scraping time from ~5 hours to ~1.5-2 hours. The embedding step already batch-processes all problems in one shot (sentence-transformers handles batching internally with GPU/CPU parallelism).

Claude’s Plan
Plan: Build Codeforces Problem Graph + Backend Scaffold
Context
CF:ICPC needs a graph of ALL ~10K Codeforces problems where edges represent similarity. This enables a "next problem" recommender and a visual problem explorer beyond the curated 220. Currently the entire app is a single icpc-trainer.jsx file with no backend. This plan scaffolds the backend and builds the graph pipeline.

The user wants problem statements included in embeddings for richer similarity, and editorial scraping as a follow-up phase. Python 3.12.6 is available.

Step 1: Create directory structure + requirements.txt
Create:


backend/
  __init__.py
  main.py                   # FastAPI app (minimal, runnable)
  routers/
    __init__.py
    problems.py              # Stub
    graph.py                 # Stub
    team.py                  # Stub
    codeforces.py            # Stub
  services/
    __init__.py
    cf_client.py             # CF API client with rate limiting
    scraper.py               # Problem statement scraper (resumable)
    embeddings.py            # Embedding + FAISS utilities
  data/                      # Output directory (gitignored except problems.json)
scripts/
  build_graph.py             # Main orchestrator script
  scrape_editorials.py       # Stub for phase 2
  sync_handles.py            # Stub for future
requirements.txt
.gitignore                   # Update to ignore data caches, venv, .npy files
requirements.txt:


fastapi
uvicorn[standard]
sentence-transformers
faiss-cpu
requests
beautifulsoup4
numpy
pydantic
ruff
Step 2: Migrate curated problems to backend/data/problems.json
Extract the 220 problems from icpc-trainer.jsx (lines 28-256) into JSON:


[
  {
    "id": "1A",
    "name": "Theatre Square",
    "rating": 1000,
    "topic": "implementation",
    "url": "https://codeforces.com/problemset/problem/1/A",
    "curated": true
  },
  ...
]
Also extract TOPIC_GRAPH and TIER_LABELS/TIER_COLORS into a backend/data/topics.json for backend use.

Step 3: backend/services/cf_client.py — CF API client
Synchronous (using requests) — rate limit is the bottleneck, not I/O
Built-in 2-second delay between requests
fetch_all_problems() → calls problemset.problems, returns list of problem dicts
fetch_user_submissions(handle) → calls user.status, returns submissions
Retry with exponential backoff on 429/5xx
Saves raw API response to backend/data/cf_problems_raw.json
Step 4: backend/services/scraper.py — Problem statement scraper
This is the most complex piece. Key design:

Resumable: Reads/writes backend/data/statements_cache.json — a dict mapping "{contestId}/{index}" to scraped text. Saves to disk every 50 problems. On restart, loads the cache and skips already-scraped problems. You can Ctrl+C at any time and rerun — it picks up where it left off.
Parallel with rate limiting: Uses concurrent.futures.ThreadPoolExecutor with 3 worker threads. A shared threading.Semaphore + timestamp tracker ensures we never exceed ~1.5 requests/second globally (safe margin under CF's limit). This is ~3x faster than sequential.
Robust: Retries on network errors (3 attempts, exponential backoff). Skips 404s (gym/private contests) and logs them to backend/data/scrape_errors.log.
HTML parsing: Uses BeautifulSoup to extract <div class="problem-statement"> content. Strips HTML tags, normalizes whitespace. Preserves structure (Input/Output sections) as plain text. LaTeX like $n$ gets simplified to just the variable name where possible.
Progress logging: Prints [1234/9500] Scraped 123A - Theatre Square with ETA based on elapsed time and completion rate.
URL pattern: https://codeforces.com/contest/{contestId}/problem/{index}

Expected runtime: ~1.5-2 hours for 9K problems with 3 parallel workers. Can be interrupted and resumed at any time.

Step 5: backend/services/embeddings.py — Embedding + FAISS
build_text_representation(problem, statement) → combines name, tags, rating tier label, and first ~500 chars of statement into a single string
generate_embeddings(texts) → loads all-MiniLM-L6-v2, encodes all texts, returns numpy array. Model max is 256 word pieces — truncates automatically.
build_faiss_index(embeddings) → normalizes vectors (L2 norm), builds IndexFlatIP for cosine similarity
find_neighbors(index, embeddings, k=20) → batch query, returns top-K neighbors per problem
apply_boosts(neighbors, problems) → boost score for shared tags (+0.05 per shared tag), add difficulty-progression edges (same tags, rating ±200, +0.03 boost), slight curated boost (+0.01)
Saves: embeddings.npy, problem_ids.json (index-to-ID mapping)
Step 6: scripts/build_graph.py — Main orchestrator
Ties everything together with a CLI interface:


python scripts/build_graph.py              # Run full pipeline
python scripts/build_graph.py --skip-scrape # Skip scraping (use cached statements)
python scripts/build_graph.py --step fetch  # Only fetch from CF API
python scripts/build_graph.py --step scrape # Only scrape statements
python scripts/build_graph.py --step embed  # Only generate embeddings + graph
Pipeline:

Fetch: Call cf_client.fetch_all_problems(), save raw JSON, filter to problems with ratings (exclude gym). Print stats.
Scrape: Call scraper.scrape_all(problems). Resumable — picks up where it left off. Print progress with ETA.
Embed: Call embeddings.generate_embeddings() for all problems. ~5 min on CPU.
Build graph: Call embeddings.build_faiss_index(), find_neighbors(), apply_boosts(). Output graph.json.
Output format for graph.json:


{
  "meta": {
    "total_problems": 9234,
    "total_edges": 184680,
    "k": 20,
    "built_at": "2026-02-13T..."
  },
  "neighbors": {
    "1A": [
      {"id": "4A", "score": 0.92, "shared_tags": ["implementation", "math"]},
      {"id": "71A", "score": 0.88, "shared_tags": ["implementation"]},
      ...
    ],
    ...
  }
}
Step 7: backend/main.py — Minimal FastAPI app
Just enough to verify the scaffold works:


app = FastAPI(title="CF:ICPC API")
app.include_router(problems.router, prefix="/api/problems")
app.include_router(graph.router, prefix="/api/graph")
# ... other routers as stubs
Router stubs return placeholder responses. The graph router will later serve graph.json and support queries like "get neighbors of problem X".

Step 8: scripts/scrape_editorials.py — Editorial scraper (phase 2, stub)
Create as a stub with the planned approach documented:

For each contest, check https://codeforces.com/contest/{id} for editorial links
Scrape editorial blog posts
Map sections to individual problems
Save to backend/data/editorials_cache.json
This will be implemented after the graph is built and working.

Files modified/created
File	Action
requirements.txt	Create
.gitignore	Create/update
backend/__init__.py	Create (empty)
backend/main.py	Create
backend/routers/__init__.py	Create (empty)
backend/routers/problems.py	Create (stub)
backend/routers/graph.py	Create (stub)
backend/routers/team.py	Create (stub)
backend/routers/codeforces.py	Create (stub)
backend/services/__init__.py	Create (empty)
backend/services/cf_client.py	Create
backend/services/scraper.py	Create
backend/services/embeddings.py	Create
backend/data/problems.json	Create (migrated from JSX)
backend/data/topics.json	Create (migrated from JSX)
scripts/build_graph.py	Create
scripts/scrape_editorials.py	Create (stub)
scripts/sync_handles.py	Create (stub)
Not modified: icpc-trainer.jsx (source of truth, read-only for migration)

Verification
Scaffold: cd backend && py -m venv venv && venv\Scripts\activate && pip install -r ..\requirements.txt && py -m uvicorn main:app → FastAPI runs on localhost:8000
CF API fetch: py scripts/build_graph.py --step fetch → creates cf_problems_raw.json with ~9K problems
Scraping (smoke test): py scripts/build_graph.py --step scrape → scrapes first 10 problems, verify statements look correct, then Ctrl+C and resume to verify resumability
Embeddings: py scripts/build_graph.py --skip-scrape (using whatever statements are cached) → generates embeddings.npy and graph.json
Graph quality: Spot-check: neighbors of "1A Theatre Square" should be other implementation problems around rating 1000. Neighbors of a DP problem should be other DP problems.
Full run: Let scraper run overnight, then re-run embed step with full statement cache.8 steps, 18 files to create:

Directory structure + requirements.txt
Migrate 220 curated problems + topic graph from JSX → JSON
CF API client (rate-limited, with retries)
Problem statement scraper (resumable, ~5 hours for full run)
Embedding generation + FAISS graph construction
build_graph.py orchestrator with --step and --skip-scrape flags
Minimal FastAPI app (scaffold + stubs)
Editorial scraper stub (phase 2, built after graph works)
Key decisions:

Sync requests for scraping (rate limit is the bottleneck, not I/O)
IndexFlatIP for FAISS (exact search is instant at 10K scale)
Scraper saves progress to statements_cache.json — fully resumable if interrupted
Graph stores raw similarity scores; frontend decides display threshold
Claude’s Plan
Plan: Build Codeforces Problem Graph + Backend Scaffold
Context
CF:ICPC needs a graph of ALL ~10K Codeforces problems where edges represent similarity. This enables a "next problem" recommender and a visual problem explorer beyond the curated 220. Currently the entire app is a single icpc-trainer.jsx file with no backend. This plan scaffolds the backend and builds the graph pipeline.

The user wants problem statements included in embeddings for richer similarity, and editorial scraping as a follow-up phase. Python 3.12.6 is available.

Step 1: Create directory structure + requirements.txt
Create:


backend/
  __init__.py
  main.py                   # FastAPI app (minimal, runnable)
  routers/
    __init__.py
    problems.py              # Stub
    graph.py                 # Stub
    team.py                  # Stub
    codeforces.py            # Stub
  services/
    __init__.py
    cf_client.py             # CF API client with rate limiting
    scraper.py               # Problem statement scraper (resumable)
    embeddings.py            # Embedding + FAISS utilities
  data/                      # Output directory (gitignored except problems.json)
scripts/
  build_graph.py             # Main orchestrator script
  scrape_editorials.py       # Stub for phase 2
  sync_handles.py            # Stub for future
requirements.txt
.gitignore                   # Update to ignore data caches, venv, .npy files
requirements.txt:


fastapi
uvicorn[standard]
sentence-transformers
faiss-cpu
requests
beautifulsoup4
numpy
pydantic
ruff
Step 2: Migrate curated problems to backend/data/problems.json
Extract the 220 problems from icpc-trainer.jsx (lines 28-256) into JSON:


[
  {
    "id": "1A",
    "name": "Theatre Square",
    "rating": 1000,
    "topic": "implementation",
    "url": "https://codeforces.com/problemset/problem/1/A",
    "curated": true
  },
  ...
]
Also extract TOPIC_GRAPH and TIER_LABELS/TIER_COLORS into a backend/data/topics.json for backend use.

Step 3: backend/services/cf_client.py — CF API client
Synchronous (using requests) — rate limit is the bottleneck, not I/O
Built-in 2-second delay between requests
fetch_all_problems() → calls problemset.problems, returns list of problem dicts
fetch_user_submissions(handle) → calls user.status, returns submissions
Retry with exponential backoff on 429/5xx
Saves raw API response to backend/data/cf_problems_raw.json
Step 4: backend/services/scraper.py — Problem statement scraper
This is the most complex piece. Key design:

Resumable: Reads/writes backend/data/statements_cache.json — a dict mapping "{contestId}/{index}" to scraped text. On restart, skips already-cached problems.
Rate-limited: 1 request per 2 seconds (time.sleep)
Robust: Retries on network errors (3 attempts, exponential backoff). Skips 404s (gym/private contests) and logs them.
HTML parsing: Uses BeautifulSoup to extract <div class="problem-statement"> content. Strips HTML tags, normalizes whitespace. Preserves structure (Input/Output sections) as plain text. LaTeX like $n$ gets simplified to just the variable name where possible.
Progress logging: Prints [1234/9500] Scraped 123A - Theatre Square every problem, with ETA.
URL pattern: https://codeforces.com/contest/{contestId}/problem/{index}

Expected runtime: ~5 hours for 9K problems at 2 sec/request. Designed to run overnight.

Step 5: backend/services/embeddings.py — Embedding + FAISS
build_text_representation(problem, statement) → combines name, tags, rating tier label, and first ~500 chars of statement into a single string
generate_embeddings(texts) → loads all-MiniLM-L6-v2, encodes all texts, returns numpy array. Model max is 256 word pieces — truncates automatically.
build_faiss_index(embeddings) → normalizes vectors (L2 norm), builds IndexFlatIP for cosine similarity
find_neighbors(index, embeddings, k=20) → batch query, returns top-K neighbors per problem
apply_boosts(neighbors, problems) → boost score for shared tags (+0.05 per shared tag), add difficulty-progression edges (same tags, rating ±200, +0.03 boost), slight curated boost (+0.01)
Saves: embeddings.npy, problem_ids.json (index-to-ID mapping)
Step 6: scripts/build_graph.py — Main orchestrator
Ties everything together with a CLI interface:


python scripts/build_graph.py              # Run full pipeline
python scripts/build_graph.py --skip-scrape # Skip scraping (use cached statements)
python scripts/build_graph.py --step fetch  # Only fetch from CF API
python scripts/build_graph.py --step scrape # Only scrape statements
python scripts/build_graph.py --step embed  # Only generate embeddings + graph
Pipeline:

Fetch: Call cf_client.fetch_all_problems(), save raw JSON, filter to problems with ratings (exclude gym). Print stats.
Scrape: Call scraper.scrape_all(problems). Resumable — picks up where it left off. Print progress with ETA.
Embed: Call embeddings.generate_embeddings() for all problems. ~5 min on CPU.
Build graph: Call embeddings.build_faiss_index(), find_neighbors(), apply_boosts(). Output graph.json.
Output format for graph.json:


{
  "meta": {
    "total_problems": 9234,
    "total_edges": 184680,
    "k": 20,
    "built_at": "2026-02-13T..."
  },
  "neighbors": {
    "1A": [
      {"id": "4A", "score": 0.92, "shared_tags": ["implementation", "math"]},
      {"id": "71A", "score": 0.88, "shared_tags": ["implementation"]},
      ...
    ],
    ...
  }
}
Step 7: backend/main.py — Minimal FastAPI app
Just enough to verify the scaffold works:


app = FastAPI(title="CF:ICPC API")
app.include_router(problems.router, prefix="/api/problems")
app.include_router(graph.router, prefix="/api/graph")
# ... other routers as stubs
Router stubs return placeholder responses. The graph router will later serve graph.json and support queries like "get neighbors of problem X".

Step 8: scripts/scrape_editorials.py — Editorial scraper (phase 2, stub)
Create as a stub with the planned approach documented:

For each contest, check https://codeforces.com/contest/{id} for editorial links
Scrape editorial blog posts
Map sections to individual problems
Save to backend/data/editorials_cache.json
This will be implemented after the graph is built and working.

Files modified/created
File	Action
requirements.txt	Create
.gitignore	Create/update
backend/__init__.py	Create (empty)
backend/main.py	Create
backend/routers/__init__.py	Create (empty)
backend/routers/problems.py	Create (stub)
backend/routers/graph.py	Create (stub)
backend/routers/team.py	Create (stub)
backend/routers/codeforces.py	Create (stub)
backend/services/__init__.py	Create (empty)
backend/services/cf_client.py	Create
backend/services/scraper.py	Create
backend/services/embeddings.py	Create
backend/data/problems.json	Create (migrated from JSX)
backend/data/topics.json	Create (migrated from JSX)
scripts/build_graph.py	Create
scripts/scrape_editorials.py	Create (stub)
scripts/sync_handles.py	Create (stub)
Not modified: icpc-trainer.jsx (source of truth, read-only for migration)

Verification
Scaffold: cd backend && py -m venv venv && venv\Scripts\activate && pip install -r ..\requirements.txt && py -m uvicorn main:app → FastAPI runs on localhost:8000
CF API fetch: py scripts/build_graph.py --step fetch → creates cf_problems_raw.json with ~9K problems
Scraping (smoke test): py scripts/build_graph.py --step scrape → scrapes first 10 problems, verify statements look correct, then Ctrl+C and resume to verify resumability
Embeddings: py scripts/build_graph.py --skip-scrape (using whatever statements are cached) → generates embeddings.npy and graph.json
Graph quality: Spot-check: neighbors of "1A Theatre Square" should be other implementation problems around rating 1000. Neighbors of a DP problem should be other DP problems.
Full run: Let scraper run overnight, then re-run embed step with full statement cache.
Stayed in plan mode
Great questions — let me clarify both:

Resumability: Yes, this is built in. The scraper saves every scraped statement to statements_cache.json as it goes. When you restart the script, it loads the cache and skips already-done problems. So if you scrape 3,000 problems, go offline, and rerun later — it picks up at problem 3,001. Same for the CF API fetch (saved to cf_problems_raw.json) and embeddings (embeddings.npy).

Parallel processing: Good call — I was being too conservative. We can use a thread pool with a shared rate limiter. Instead of 1 request every 2 seconds (sequential), we can run 3 workers staggered so we're still under CF's limit but 3x faster. That cuts scraping from ~5 hours to ~1.5-2 hours.

Let me update the plan.

Read C:\Users\rober\.claude\plans\enumerated-marinating-allen.md
Edit C:\Users\rober\.claude\plans\enumerated-marinating-allen.md
Modified
Updated the plan. To directly answer your questions:

Resumability: Yes — every step saves its output to disk incrementally. If you stop and rerun:

CF API fetch → cf_problems_raw.json already exists, skips re-fetching
Scraper → loads statements_cache.json, skips already-scraped problems, continues from where it left off
Embeddings/graph → --skip-scrape flag uses whatever's cached
Parallel processing: Updated the plan — the scraper will use 3 threads with a shared rate limiter (~1.5 req/sec total, safe for CF). This cuts scraping time from ~5 hours to ~1.5-2 hours. The embedding step already batch-processes all problems in one shot (sentence-transformers handles batching internally with GPU/CPU parallelism).

Claude’s Plan
Plan: Build Codeforces Problem Graph + Backend Scaffold
Context
CF:ICPC needs a graph of ALL ~10K Codeforces problems where edges represent similarity. This enables a "next problem" recommender and a visual problem explorer beyond the curated 220. Currently the entire app is a single icpc-trainer.jsx file with no backend. This plan scaffolds the backend and builds the graph pipeline.

The user wants problem statements included in embeddings for richer similarity, and editorial scraping as a follow-up phase. Python 3.12.6 is available.

Step 1: Create directory structure + requirements.txt
Create:


backend/
  __init__.py
  main.py                   # FastAPI app (minimal, runnable)
  routers/
    __init__.py
    problems.py              # Stub
    graph.py                 # Stub
    team.py                  # Stub
    codeforces.py            # Stub
  services/
    __init__.py
    cf_client.py             # CF API client with rate limiting
    scraper.py               # Problem statement scraper (resumable)
    embeddings.py            # Embedding + FAISS utilities
  data/                      # Output directory (gitignored except problems.json)
scripts/
  build_graph.py             # Main orchestrator script
  scrape_editorials.py       # Stub for phase 2
  sync_handles.py            # Stub for future
requirements.txt
.gitignore                   # Update to ignore data caches, venv, .npy files
requirements.txt:


fastapi
uvicorn[standard]
sentence-transformers
faiss-cpu
requests
beautifulsoup4
numpy
pydantic
ruff
Step 2: Migrate curated problems to backend/data/problems.json
Extract the 220 problems from icpc-trainer.jsx (lines 28-256) into JSON:


[
  {
    "id": "1A",
    "name": "Theatre Square",
    "rating": 1000,
    "topic": "implementation",
    "url": "https://codeforces.com/problemset/problem/1/A",
    "curated": true
  },
  ...
]
Also extract TOPIC_GRAPH and TIER_LABELS/TIER_COLORS into a backend/data/topics.json for backend use.

Step 3: backend/services/cf_client.py — CF API client
Synchronous (using requests) — rate limit is the bottleneck, not I/O
Built-in 2-second delay between requests
fetch_all_problems() → calls problemset.problems, returns list of problem dicts
fetch_user_submissions(handle) → calls user.status, returns submissions
Retry with exponential backoff on 429/5xx
Saves raw API response to backend/data/cf_problems_raw.json
Step 4: backend/services/scraper.py — Problem statement scraper
This is the most complex piece. Key design:

Resumable: Reads/writes backend/data/statements_cache.json — a dict mapping "{contestId}/{index}" to scraped text. Saves to disk every 50 problems. On restart, loads the cache and skips already-scraped problems. You can Ctrl+C at any time and rerun — it picks up where it left off.
Parallel with rate limiting: Uses concurrent.futures.ThreadPoolExecutor with 3 worker threads. A shared threading.Semaphore + timestamp tracker ensures we never exceed ~1.5 requests/second globally (safe margin under CF's limit). This is ~3x faster than sequential.
Robust: Retries on network errors (3 attempts, exponential backoff). Skips 404s (gym/private contests) and logs them to backend/data/scrape_errors.log.
HTML parsing: Uses BeautifulSoup to extract <div class="problem-statement"> content. Strips HTML tags, normalizes whitespace. Preserves structure (Input/Output sections) as plain text. LaTeX like $n$ gets simplified to just the variable name where possible.
Progress logging: Prints [1234/9500] Scraped 123A - Theatre Square with ETA based on elapsed time and completion rate.
URL pattern: https://codeforces.com/contest/{contestId}/problem/{index}

Expected runtime: ~1.5-2 hours for 9K problems with 3 parallel workers. Can be interrupted and resumed at any time.

Step 5: backend/services/embeddings.py — Embedding + FAISS
build_text_representation(problem, statement) → combines name, tags, rating tier label, and first ~500 chars of statement into a single string
generate_embeddings(texts) → loads all-MiniLM-L6-v2, encodes all texts, returns numpy array. Model max is 256 word pieces — truncates automatically.
build_faiss_index(embeddings) → normalizes vectors (L2 norm), builds IndexFlatIP for cosine similarity
find_neighbors(index, embeddings, k=20) → batch query, returns top-K neighbors per problem
apply_boosts(neighbors, problems) → boost score for shared tags (+0.05 per shared tag), add difficulty-progression edges (same tags, rating ±200, +0.03 boost), slight curated boost (+0.01)
Saves: embeddings.npy, problem_ids.json (index-to-ID mapping)
Step 6: scripts/build_graph.py — Main orchestrator
Ties everything together with a CLI interface:


python scripts/build_graph.py              # Run full pipeline
python scripts/build_graph.py --skip-scrape # Skip scraping (use cached statements)
python scripts/build_graph.py --step fetch  # Only fetch from CF API
python scripts/build_graph.py --step scrape # Only scrape statements
python scripts/build_graph.py --step embed  # Only generate embeddings + graph
Pipeline:

Fetch: Call cf_client.fetch_all_problems(), save raw JSON, filter to problems with ratings (exclude gym). Print stats.
Scrape: Call scraper.scrape_all(problems). Resumable — picks up where it left off. Print progress with ETA.
Embed: Call embeddings.generate_embeddings() for all problems. ~5 min on CPU.
Build graph: Call embeddings.build_faiss_index(), find_neighbors(), apply_boosts(). Output graph.json.
Output format for graph.json:


{
  "meta": {
    "total_problems": 9234,
    "total_edges": 184680,
    "k": 20,
    "built_at": "2026-02-13T..."
  },
  "neighbors": {
    "1A": [
      {"id": "4A", "score": 0.92, "shared_tags": ["implementation", "math"]},
      {"id": "71A", "score": 0.88, "shared_tags": ["implementation"]},
      ...
    ],
    ...
  }
}
Step 7: backend/main.py — Minimal FastAPI app
Just enough to verify the scaffold works:


app = FastAPI(title="CF:ICPC API")
app.include_router(problems.router, prefix="/api/problems")
app.include_router(graph.router, prefix="/api/graph")
# ... other routers as stubs
Router stubs return placeholder responses. The graph router will later serve graph.json and support queries like "get neighbors of problem X".

Step 8: scripts/scrape_editorials.py — Editorial scraper (phase 2, stub)
Create as a stub with the planned approach documented:

For each contest, check https://codeforces.com/contest/{id} for editorial links
Scrape editorial blog posts
Map sections to individual problems
Save to backend/data/editorials_cache.json
This will be implemented after the graph is built and working.

Files modified/created
File	Action
requirements.txt	Create
.gitignore	Create/update
backend/__init__.py	Create (empty)
backend/main.py	Create
backend/routers/__init__.py	Create (empty)
backend/routers/problems.py	Create (stub)
backend/routers/graph.py	Create (stub)
backend/routers/team.py	Create (stub)
backend/routers/codeforces.py	Create (stub)
backend/services/__init__.py	Create (empty)
backend/services/cf_client.py	Create
backend/services/scraper.py	Create
backend/services/embeddings.py	Create
backend/data/problems.json	Create (migrated from JSX)
backend/data/topics.json	Create (migrated from JSX)
scripts/build_graph.py	Create
scripts/scrape_editorials.py	Create (stub)
scripts/sync_handles.py	Create (stub)
Not modified: icpc-trainer.jsx (source of truth, read-only for migration)

Verification
Scaffold: cd backend && py -m venv venv && venv\Scripts\activate && pip install -r ..\requirements.txt && py -m uvicorn main:app → FastAPI runs on localhost:8000
CF API fetch: py scripts/build_graph.py --step fetch → creates cf_problems_raw.json with ~9K problems
Scraping (smoke test): py scripts/build_graph.py --step scrape → scrapes first 10 problems, verify statements look correct, then Ctrl+C and resume to verify resumability
Embeddings: py scripts/build_graph.py --skip-scrape (using whatever statements are cached) → generates embeddings.npy and graph.json
Graph quality: Spot-check: neighbors of "1A Theatre Square" should be other implementation problems around rating 1000. Neighbors of a DP problem should be other DP problems.
Full run: Let scraper run overnight, then re-run embed step with full statement cache.