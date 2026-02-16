import type { MonthPlan } from "./types";

export const MONTHS_PLAN: MonthPlan[] = [
  {
    month: "Feb\u2013Mar",
    focus: "Foundations",
    topics: ["implementation", "math_basic", "sorting"],
    goal: "Solve Div2 A/B consistently in < 10 min each",
  },
  {
    month: "Mar\u2013Apr",
    focus: "Core Algorithms I",
    topics: ["binary_search", "two_pointers", "prefix_sums", "number_theory"],
    goal: "Comfortable with Div2 C, start solving some D",
  },
  {
    month: "Apr\u2013May",
    focus: "Core Algorithms II",
    topics: ["bfs_dfs", "dp_basic"],
    goal: "Graph traversal & basic DP on autopilot",
  },
  {
    month: "May\u2013Jun",
    focus: "Intermediate I",
    topics: ["shortest_paths", "dsu", "topo_sort", "trees"],
    goal: "Solve Div2 D consistently, attempt E",
  },
  {
    month: "Jun\u2013Jul",
    focus: "Intermediate II",
    topics: ["strings", "dp_intermediate", "combinatorics"],
    goal: "Handle most Div2 D/E problems",
  },
  {
    month: "Jul\u2013Aug",
    focus: "Advanced",
    topics: ["seg_tree", "game_theory", "graphs_advanced", "geometry"],
    goal: "Competitive at regional level",
  },
  {
    month: "Aug\u2013Sep",
    focus: "Polish & Team Strategy",
    topics: ["dp_advanced", "advanced"],
    goal: "Virtual contests, team coordination, speed",
  },
];

/** Rating-based color coding matching the monolith's tier system */
export function ratingColor(rating: number): string {
  if (rating <= 1200) return "#22c55e";
  if (rating <= 1600) return "#3b82f6";
  if (rating <= 2000) return "#a855f7";
  if (rating <= 2400) return "#f59e0b";
  return "#ef4444";
}
