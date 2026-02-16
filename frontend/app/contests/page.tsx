"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useContests, useTeam } from "@/lib/hooks";
import type { TrendsResponse, VirtualContest } from "@/lib/types";
import { StatBox } from "@/components/stat-box";
import { ContestCard } from "@/components/contest-card";
import { ContestForm } from "@/components/contest-form";
import { TrendBarChart } from "@/components/trend-bar-chart";
import { TrendLineChart } from "@/components/trend-line-chart";

export default function Contests() {
  const { contests, loading, error, refetch } = useContests();
  const { members, loading: membersLoading } = useTeam();
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VirtualContest | null>(null);

  const fetchTrends = useCallback(() => {
    api
      .getContestTrends()
      .then(setTrends)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  function handleSaved() {
    setShowForm(false);
    setEditing(null);
    refetch();
    fetchTrends();
  }

  function handleEdit(contest: VirtualContest) {
    setEditing(contest);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteContest(id);
      refetch();
      fetchTrends();
    } catch {
      // Silently fail — card will remain visible until next refetch
    }
  }

  if (loading || membersLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        <span className="pulse-slow">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="rounded border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      </div>
    );
  }

  const trendDelta =
    trends && trends.points.length >= 5
      ? trends.recent_avg_solves - trends.overall_avg_solves
      : null;

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Contests</h1>
          <p className="mt-1 text-sm text-muted">
            {contests.length} virtual contest{contests.length !== 1 ? "s" : ""}{" "}
            logged
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="rounded-md border border-accent-border bg-accent-dim px-4 py-2 text-[13px] font-medium text-accent transition-all hover:bg-accent/10"
        >
          + Log Contest
        </button>
      </div>

      {/* Trends section */}
      {trends && trends.points.length >= 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox
              value={trends.points.length}
              label="Contests"
            />
            <StatBox
              value={trends.overall_avg_solves.toFixed(1)}
              label="Avg Solved"
            />
            <StatBox
              value={
                trends.overall_avg_time != null
                  ? `${Math.round(trends.overall_avg_time)}m`
                  : "--"
              }
              label="Avg Time"
              color="#3b82f6"
            />
            {trendDelta !== null ? (
              <StatBox
                value={`${trendDelta >= 0 ? "+" : ""}${trendDelta.toFixed(1)}`}
                label="Recent Trend"
                color={trendDelta >= 0 ? "#22c55e" : "#ef4444"}
              />
            ) : (
              <StatBox
                value="--"
                label="Recent Trend"
                color="#8888a0"
              />
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <TrendBarChart points={trends.points} />
            <TrendLineChart points={trends.points} />
          </div>
        </div>
      )}

      {/* Contest list */}
      {contests.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-border bg-surface">
          <p className="text-sm text-muted">
            No contests yet. Log your first virtual contest to start tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contests.map((c) => (
            <ContestCard
              key={c.id}
              contest={c}
              members={members}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <ContestForm
          members={members}
          editing={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
