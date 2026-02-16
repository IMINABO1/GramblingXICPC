# CF:ICPC — Codeforces-Based ICPC Training Platform

## What This Is

A self-guided training platform for an 8-person team preparing for the ICPC (International Collegiate Programming Contest) regionals in September 2026. The team is from Grambling State University, operating without a dedicated coach or structured program. This tool is meant to fill that gap.

The platform curates ~220 competitive programming problems from Codeforces, organizes them into a prerequisite-based skill tree, and provides per-member progress tracking — essentially a "Codeforces 220" modeled after the concept of LeetCode 150 but tailored for ICPC preparation.

## The Problem We're Solving

ICPC requires a different skill set than LeetCode. LeetCode leans toward pattern recognition and data structure fluency; ICPC demands mathematical reasoning, algorithmic breadth, and the ability to collaborate under time pressure with one shared computer. A team transitioning from LeetCode to ICPC needs a structured curriculum that covers the right topics at the right difficulty progression, and a way to track whether everyone is actually keeping up.

There's no existing "ICPC 200" problem list with a built-in tracker. Codeforces has 10,000+ problems but no guided path. This platform bridges that gap.

## Team Context

- **Team size:** 8 people (enough for 2 ICPC teams of 3 + 2 alternates)
- **Starting level:** Comfortable with LeetCode mediums/hards, which maps roughly to Codeforces Div2 B/C. Some informatics olympiad background on the team, but rusty. Most members are new to competitive programming at the ICPC level.
- **Target level by September:** Consistently solving Div2 A–D, competitive at regional level
- **Timeline:** ~7 months (February – September 2026)

## How the Platform Is Structured

### Topic Taxonomy (22 Topics, 5 Tiers)

Problems are grouped into topics, and topics are organized into tiers based on prerequisite dependencies:

| Tier | Label | Topics | Rating Range |
|------|-------|--------|-------------|
| 0 | Foundations | Implementation, Basic Math, Sorting & Greedy | 800–1200 |
| 1 | Core | Binary Search, Two Pointers, Prefix Sums, Number Theory, BFS/DFS | 1000–1600 |
| 2 | Intermediate | Shortest Paths, DSU, Topo Sort, DP Fundamentals, Trees, Strings | 1300–2000 |
| 3 | Advanced | DP Intermediate, Segment Trees/BIT, Combinatorics, Game Theory, Advanced Graphs, Geometry | 1500–2300 |
| 4 | Expert | DP Advanced, Advanced Topics | 1900–2400 |

### Prerequisite Graph

Topics have explicit prerequisites. For example, you shouldn't attempt Shortest Paths before being comfortable with BFS/DFS, and DP Intermediate assumes you've worked through DP Fundamentals. The skill tree view enforces this visually — locked topics appear dimmed until their prerequisites are at least 50% complete.

Key prerequisite chains:
- Implementation → BFS/DFS → Shortest Paths → Advanced Graphs
- Implementation → Prefix Sums → DP Fundamentals → DP Intermediate → DP Advanced
- BFS/DFS → DSU, Topological Sort
- Basic Math → Number Theory → Combinatorics
- DP Fundamentals + Trees → Segment Trees/BIT

### Why ~220 Problems (Not 150)

With 22 topic areas, 150 problems gives you ~7 per topic. That's not enough to build intuition — you need exposure to several variations within each topic to recognize patterns during a contest. At ~10 problems per topic across multiple difficulty levels (easy warmup → medium drill → hard stretch), 220 is the minimum for solid coverage. The full Codeforces dataset (10,000+) is available through the CF Explorer for additional practice in weak areas.

## App Architecture

### Tech Stack

Single-file React component (JSX) designed to run as a Claude artifact or standalone React app. No backend required — state persists via `window.storage` (Claude's persistent storage API) or can be adapted to localStorage/a database.

### Views

1. **Dashboard** — Overall stats (problems solved, topics completed, team size, completion %) and per-topic progress cards
2. **Skill Tree** — Visual prerequisite graph organized by tier. Shows which topics are unlocked vs locked based on progress
3. **Problems** — Filterable problem list with per-member checkboxes, rating badges, and direct links to Codeforces. Sortable by rating, filterable by topic and rating range
4. **Timeline** — 7-month training plan with monthly focus areas, topic assignments, and milestone goals
5. **Team** — Per-member progress tracking, editable names, top-topic breakdowns
6. **CF Explorer** — Live connection to the Codeforces API (`codeforces.com/api/problemset.problems`) to pull the full problem dataset and visualize tag/rating distributions

### Data Model

- `TOPIC_GRAPH` — Defines 22 topics with names, icons, prerequisite lists, and tier assignments
- `PROBLEMS` — Array of ~220 curated problems, each with CF problem ID, name, rating, topic tag, and URL
- `solvedMap` — Key-value map tracking which team member has solved which problem (format: `memberIndex::problemId`)
- `MONTHS_PLAN` — 7-entry training schedule mapping months to topic focus areas and goals

## 7-Month Training Plan

| Period | Focus | Goal |
|--------|-------|------|
| Feb–Mar | Foundations (Implementation, Math, Sorting) | Solve Div2 A/B in < 10 min |
| Mar–Apr | Core Algorithms I (Binary Search, Two Pointers, Prefix Sums, Number Theory) | Comfortable with Div2 C |
| Apr–May | Core Algorithms II (BFS/DFS, DP Fundamentals) | Graph traversal & basic DP on autopilot |
| May–Jun | Intermediate I (Shortest Paths, DSU, Topo Sort, Trees) | Solve Div2 D consistently |
| Jun–Jul | Intermediate II (Strings, DP Intermediate, Combinatorics) | Handle most Div2 D/E |
| Jul–Aug | Advanced (Seg Trees, Game Theory, Advanced Graphs, Geometry) | Competitive at regional level |
| Aug–Sep | Polish & Team Strategy (DP Advanced, Advanced Topics) | Virtual contests, team coordination |

## How to Use This for Training

### Weekly Routine (Recommended)

1. **Mon–Thu:** Each member works through 2–3 problems from the current month's topics. Check them off in the app.
2. **Friday:** Team virtual contest on Codeforces (Div2 or Div3). Use one computer per team of 3 to simulate ICPC conditions.
3. **Weekend:** Upsolve contest problems you couldn't get. Discuss approaches as a team.

### Team Composition Strategy

Since ICPC teams are 3 people + 1 computer, start assigning topic specializations early:
- **Person A:** Graphs, trees, geometry
- **Person B:** DP, combinatorics, number theory
- **Person C:** Implementation speed, strings, data structures

Everyone should be decent at everything, but during contests, specialization saves critical minutes.

### Progress Benchmarks

- **By April:** Everyone should be solving 800–1400 rated problems comfortably
- **By June:** Team average should be solving 1400–1800 problems with some struggle
- **By August:** At least 2–3 members should be able to handle 1800–2000 problems
- **By September:** Full mock contests where teams solve 5+ problems in 5 hours

## Future Enhancements

- **Full problem graph:** Build a backend that computes tag-similarity edges between all 10,000+ CF problems, enabling a recommendation engine ("solved problem X → try problem Y next")
- **Codeforces handle integration:** Pull submission history via `user.status` API to auto-populate the solved checkboxes
- **Spaced repetition:** Track when problems were solved and surface old topics for review
- **Contest history analysis:** Pull past ICPC regional problems and map them to the topic taxonomy to identify which areas are most tested
- **Leaderboard / accountability:** Weekly solve counts with friendly competition between team members
