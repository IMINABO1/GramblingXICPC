# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Read `project_context.md` and `TODO.md` before doing anything. They contain the full context for this project — what it is, who it's for, what's been built, and what needs to happen next.

**CF:ICPC** is an ICPC training platform for an 8-person team at Grambling State University preparing for September 2026 regionals. It curates ~220 Codeforces problems across 22 topics in a prerequisite-based skill tree with per-member progress tracking.

## Current State

The entire app currently lives in a single file: `icpc-trainer.jsx` — a monolithic React component originally built as a Claude artifact. It uses `window.storage` for persistence and has no build tooling, no backend, and no project scaffolding yet.

All data (topic graph, 220 problems, training timeline, team members) is hardcoded in `icpc-trainer.jsx`. The next major step is decomposing this into a proper Next.js frontend + FastAPI backend (see target architecture below).

**There are no build/test/lint commands yet.** These will be set up when the frontend and backend are scaffolded.

## Target Architecture

**Frontend:** Next.js (App Router) with TypeScript and Tailwind CSS
**Backend:** Python (FastAPI)
**Database:** SQLite for local dev, PostgreSQL for production
**Embeddings:** `sentence-transformers` with `all-MiniLM-L6-v2` (local, free, no API keys needed)
**Nearest Neighbors:** FAISS for similarity search across the full problem graph
**External API:** Codeforces API (`codeforces.com/api/`)

Next.js is chosen over plain React because this needs to work as a PWA — "Add to Home Screen" on mobile should launch like a native app. Configure `next-pwa` or built-in PWA support.

### Target Directory Structure
```
frontend/                 # Next.js app
  app/                    # App Router pages (dashboard, problems, skill-tree, timeline, team, explorer)
  components/
  lib/
    api.ts                # Backend API client
    types.ts
    constants.ts          # Topic graph, tier labels (migrated from icpc-trainer.jsx)
  public/manifest.json    # PWA manifest
backend/
  main.py                 # FastAPI app
  routers/                # problems, graph, team, codeforces (CF API proxy for CORS)
  services/               # embeddings.py, cf_client.py, scraper.py
  data/
    problems.json         # Curated 220 problem set
    graph.json            # Full problem graph (generated)
    embeddings.npy        # Cached embeddings
scripts/
  build_graph.py          # One-time: fetch all CF problems, embed, build graph
  sync_handles.py         # Pull submission history for team members
```

## Conventions

### Python (Backend)
- Python 3.11+
- FastAPI with Pydantic models for all request/response schemas
- `async` endpoints where possible
- Type hints everywhere
- `requirements.txt` for dependencies (no poetry/pipenv)
- Ruff for linting

### TypeScript (Frontend)
- Strict TypeScript, no `any`
- App Router (not Pages Router), server components by default, `"use client"` only when needed
- Tailwind for styling — no CSS modules, no styled-components
- Font: JetBrains Mono for code/data, Space Grotesk for headings
- Color scheme: dark theme, `#0a0a0f` background, `#00ffa3` accent green, `#e2e2e8` text
- ESLint + Prettier
- Minimal dependencies — don't add a library for something achievable in 20 lines

### General
- No `.env` files with secrets committed. Use `.env.example` with placeholder values
- Git conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- Keep it simple — this is a tool for 7 people, not a SaaS product

## Key Data

### Codeforces API
- `problemset.problems` — all problems with tags and ratings
- `user.status?handle={handle}` — submission history for a user
- `contest.list` — all contests
- Rate limit: ~1 request per 2 seconds

### Topic Taxonomy
22 topics across 5 tiers (Foundations → Core → Intermediate → Advanced → Expert) with prerequisite edges. The full taxonomy is defined in `project_context.md` and currently hardcoded as `TOPIC_GRAPH` in `icpc-trainer.jsx`. Must be migrated to `frontend/lib/constants.ts` and `backend/data/problems.json`.

### Solved State Format
Progress tracking uses a key-value map with format `memberIndex::problemId` (e.g., `0::455A`). This is currently in `solvedMap` state in `icpc-trainer.jsx` and will move to the backend API.

## What NOT to Do
- Don't use an LLM to classify or relate problems — embeddings are cheaper, faster, and better for this
- Don't over-abstract the backend. No service layers wrapping service layers. FastAPI routes can call functions directly
- Don't add auth yet. This is for a small team, not the public
- Don't break the existing curated problem set. The 220 problems are intentionally selected — the graph augments them, it doesn't replace them
- Don't use localStorage in the frontend — use the backend API for all persistent state so progress syncs across devices
