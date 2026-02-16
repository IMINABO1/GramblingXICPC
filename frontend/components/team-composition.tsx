"use client";

import { useCallback, useEffect, useState } from "react";
import { useTeam } from "@/lib/hooks";
import { api } from "@/lib/api";
import type { ComposeResponse } from "@/lib/types";
import { ProgressBar } from "@/components/progress-bar";

const CLUSTER_LABELS: Record<string, string> = {
  graphs: "Graphs",
  dp_math: "DP / Math",
  impl_ds: "Impl / DS",
};

const CLUSTER_COLORS: Record<string, string> = {
  graphs: "#3b82f6",
  dp_math: "#a855f7",
  impl_ds: "#22c55e",
};

export function TeamComposition() {
  const { members, loading: mLoading } = useTeam();
  const [data, setData] = useState<ComposeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchData = useCallback(async () => {
    if (members.length === 0) return;
    setLoading(true);
    try {
      const result = await api.compose();
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [members.length]);

  useEffect(() => {
    if (expanded && !data && !loading) {
      fetchData();
    }
  }, [expanded, data, loading, fetchData]);

  if (mLoading) return null;

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-all hover:bg-surface/80"
      >
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">
            ⚖️ Team Composition Analyzer
          </h2>
          <p className="mt-0.5 text-[12px] text-muted">
            AI-suggested team splits based on skill strengths
          </p>
        </div>
        <svg
          className={`h-5 w-5 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-border p-4">
          {loading && (
            <div className="flex items-center justify-center py-8 text-muted">
              <span className="pulse-slow">Analyzing team strengths...</span>
            </div>
          )}

          {!loading && !data && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-4 text-[12px] text-yellow-200">
              ⚠️ Not enough data yet. Sync CF handles and solve more problems to
              get team composition suggestions.
            </div>
          )}

          {!loading && data && (
            <div className="space-y-4">
              {/* Suggested Teams */}
              <div className="grid gap-3 md:grid-cols-2">
                <TeamCard
                  title="Team A"
                  memberIds={data.suggestion.team_a}
                  profiles={data.profiles}
                  accent="#00ffa3"
                />
                <TeamCard
                  title="Team B"
                  memberIds={data.suggestion.team_b}
                  profiles={data.profiles}
                  accent="#3b82f6"
                />
              </div>

              {data.suggestion.alternates.length > 0 && (
                <div className="rounded-md border border-border bg-background p-3">
                  <span className="text-[11px] font-medium text-muted">
                    Bench:{" "}
                  </span>
                  <span className="text-[12px] text-foreground">
                    {data.suggestion.alternates
                      .map(
                        (id) =>
                          data.profiles.find((p) => p.id === id)?.name ?? "?",
                      )
                      .join(", ")}
                  </span>
                </div>
              )}

              <p className="text-[11px] text-dim">
                💡 Teams are balanced based on cluster strengths (Graphs, DP/Math,
                Implementation/DS). Visit the full Compose page for interactive
                assignment.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TeamCard({
  title,
  memberIds,
  profiles,
  accent,
}: {
  title: string;
  memberIds: number[];
  profiles: Array<{ id: number; name: string; cluster_scores: Record<string, number> }>;
  accent: string;
}) {
  const members = memberIds
    .map((id) => profiles.find((p) => p.id === id))
    .filter(Boolean);

  // Calculate team coverage (max score across members for each cluster)
  const coverage: Record<string, number> = {};
  for (const cluster of Object.keys(CLUSTER_LABELS)) {
    coverage[cluster] = Math.max(
      ...members.map((m) => m?.cluster_scores[cluster] ?? 0),
      0,
    );
  }

  return (
    <div
      className="rounded-lg border border-border bg-background p-3"
      style={{ borderTopColor: accent, borderTopWidth: 2 }}
    >
      <h3
        className="mb-2 text-[13px] font-semibold"
        style={{ color: accent }}
      >
        {title}
      </h3>
      <div className="mb-3 space-y-1">
        {members.map((m) => (
          <div key={m?.id} className="text-[12px] text-foreground">
            • {m?.name}
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {Object.entries(CLUSTER_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className="w-20 text-[10px]"
              style={{ color: CLUSTER_COLORS[key] }}
            >
              {label}
            </span>
            <div className="flex-1">
              <ProgressBar
                percentage={(coverage[key] ?? 0) * 100}
                color={CLUSTER_COLORS[key]}
                height={4}
              />
            </div>
            <span className="w-8 text-right text-[9px] text-muted">
              {Math.round((coverage[key] ?? 0) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
