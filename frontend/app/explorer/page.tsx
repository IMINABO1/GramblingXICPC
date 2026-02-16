"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { GraphMeta } from "@/lib/types";
import { useTopics, useTeam } from "@/lib/hooks";
import { StatBox } from "@/components/stat-box";
import dynamic from "next/dynamic";

const ProblemGalaxy = dynamic(
  () =>
    import("@/components/galaxy/ProblemGalaxy").then((m) => m.ProblemGalaxy),
  { ssr: false },
);

interface CFStats {
  total: number;
  tagCount: Record<string, number>;
  ratingDist: Record<string, number>;
}

export default function Explorer() {
  const [graphMeta, setGraphMeta] = useState<GraphMeta | null>(null);
  const [cfStats, setCfStats] = useState<CFStats | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { topics } = useTopics();
  const { members } = useTeam();

  const solvedSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) {
      for (const id of m.solved_curated) {
        set.add(id);
      }
    }
    return set;
  }, [members]);

  useEffect(() => {
    api.getGraphMeta().then(setGraphMeta).catch(() => {});
  }, []);

  async function fetchCFStats() {
    setFetching(true);
    setError(null);
    try {
      const resp = await fetch(
        "https://codeforces.com/api/problemset.problems",
      );
      const data = await resp.json();
      if (data.status === "OK") {
        const problems: Array<{
          tags?: string[];
          rating?: number;
        }> = data.result.problems;
        const tagCount: Record<string, number> = {};
        const ratingDist: Record<string, number> = {};
        for (const p of problems) {
          for (const t of p.tags ?? []) {
            tagCount[t] = (tagCount[t] || 0) + 1;
          }
          if (p.rating) {
            ratingDist[p.rating] = (ratingDist[p.rating] || 0) + 1;
          }
        }
        setCfStats({ total: problems.length, tagCount, ratingDist });
      }
    } catch {
      setError(
        "Failed to fetch from Codeforces API. This might be due to CORS restrictions \u2014 in production this goes through the backend proxy.",
      );
    } finally {
      setFetching(false);
    }
  }

  const sortedTags = cfStats
    ? Object.entries(cfStats.tagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
    : [];

  const sortedRatings = cfStats
    ? Object.entries(cfStats.ratingDist)
        .map(([r, c]) => [Number(r), c] as const)
        .sort((a, b) => a[0] - b[0])
    : [];

  const maxRatingCount =
    sortedRatings.length > 0
      ? Math.max(...sortedRatings.map(([, c]) => c))
      : 1;

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">CF Explorer</h1>
        <p className="mt-1 text-sm text-muted">
          Codeforces problem dataset &amp; similarity graph
        </p>
      </div>

      {/* Graph metadata */}
      {graphMeta && (
        <div>
          <h2 className="mb-3 font-heading text-sm font-semibold text-muted">
            Problem Graph
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatBox
              value={graphMeta.total_problems.toLocaleString()}
              label="Problems Indexed"
            />
            <StatBox
              value={graphMeta.total_edges.toLocaleString()}
              label="Similarity Edges"
              color="#3b82f6"
            />
            <StatBox
              value={graphMeta.k}
              label="Neighbors per Problem"
              color="#a855f7"
            />
            <StatBox
              value={new Date(graphMeta.built_at).toLocaleDateString()}
              label="Graph Built"
              color="#f59e0b"
            />
          </div>
        </div>
      )}

      {/* Problem Galaxy visualization */}
      {topics && (
        <div>
          <h2 className="mb-3 font-heading text-sm font-semibold text-muted">
            Curated Problem Galaxy
          </h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <ProblemGalaxy topics={topics} solvedSet={solvedSet} />
          </div>
        </div>
      )}

      {/* Fetch CF button */}
      <div>
        <button
          onClick={fetchCFStats}
          disabled={fetching}
          className="rounded-md border border-accent-border bg-accent-dim px-4 py-2 text-[13px] font-medium text-accent transition-all hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {fetching
            ? "Fetching..."
            : cfStats
              ? "Refresh Full Problem Set"
              : "Fetch Full CF Problem Set"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      {cfStats && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatBox
              value={cfStats.total.toLocaleString()}
              label="Total CF Problems"
            />
            <StatBox
              value={Object.keys(cfStats.tagCount).length}
              label="Unique Tags"
              color="#3b82f6"
            />
            <StatBox
              value={Object.keys(cfStats.ratingDist).length}
              label="Rating Levels"
              color="#a855f7"
            />
          </div>

          {/* Tag distribution */}
          <div>
            <h2 className="mb-3 font-heading text-sm font-semibold text-muted">
              Top Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {sortedTags.map(([tag, count]) => (
                <span
                  key={tag}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] text-foreground"
                >
                  {tag}{" "}
                  <span className="text-muted">[{count}]</span>
                </span>
              ))}
            </div>
          </div>

          {/* Rating distribution histogram */}
          <div>
            <h2 className="mb-3 font-heading text-sm font-semibold text-muted">
              Rating Distribution
            </h2>
            <div className="flex items-end gap-1" style={{ height: 120 }}>
              {sortedRatings.map(([rating, count]) => {
                const height = (count / maxRatingCount) * 100;
                const color =
                  rating <= 1200
                    ? "#22c55e"
                    : rating <= 1600
                      ? "#3b82f6"
                      : rating <= 2000
                        ? "#a855f7"
                        : rating <= 2400
                          ? "#f59e0b"
                          : "#ef4444";
                return (
                  <div
                    key={rating}
                    className="group relative flex-1"
                    style={{ height: "100%" }}
                  >
                    <div
                      className="absolute bottom-0 w-full rounded-t-sm transition-all group-hover:brightness-125"
                      style={{ height: `${height}%`, background: color }}
                    />
                    <div className="absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-surface px-1 py-0.5 text-[9px] text-muted group-hover:block">
                      {rating}: {count}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-dim">
              <span>800</span>
              <span>1600</span>
              <span>2400</span>
              <span>3200+</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
