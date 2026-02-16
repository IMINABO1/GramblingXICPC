"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useUpsolve } from "@/lib/hooks";
import type { UpsolveContestGroup, UpsolveItem } from "@/lib/types";
import { StatBox } from "@/components/stat-box";
import { ProgressBar } from "@/components/progress-bar";
import { EditorialButton } from "@/components/editorial-button";

type StatusFilter = "all" | "pending" | "complete";

export default function Upsolve() {
  const { queue, stats, loading, error, refetch } = useUpsolve();
  const [syncing, setSyncing] = useState(false);
  const [memberFilter, setMemberFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showDismissed, setShowDismissed] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Get unique members from stats for filter pills
  const allMembers = useMemo(
    () => stats?.per_member ?? [],
    [stats],
  );

  // Filter contest groups
  const filteredContests = useMemo(() => {
    if (!queue) return [];
    return queue.contests
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.dismissed && !showDismissed) return false;
          if (memberFilter !== null) {
            const ms = item.member_statuses.find(
              (s) => s.member_id === memberFilter,
            );
            if (!ms) return false;
            if (statusFilter === "pending" && ms.has_solved) return false;
            if (statusFilter === "complete" && !ms.has_solved) return false;
          } else {
            if (statusFilter === "pending" && item.pending_count === 0)
              return false;
            if (statusFilter === "complete" && item.pending_count > 0)
              return false;
          }
          return true;
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [queue, memberFilter, statusFilter, showDismissed]);

  function toggleExpanded(contestId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(contestId)) next.delete(contestId);
      else next.add(contestId);
      return next;
    });
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await api.syncAll();
      refetch();
    } catch {
      // sync errors shown on team page
    } finally {
      setSyncing(false);
    }
  }

  async function handleDismiss(
    contestId: string,
    problemIndex: string,
    currentlyDismissed: boolean,
  ) {
    try {
      if (currentlyDismissed) {
        await api.undismissUpsolve(contestId, problemIndex);
      } else {
        await api.dismissUpsolve(contestId, problemIndex);
      }
      refetch();
    } catch {
      // silent
    }
  }

  if (loading) {
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

  const hasContests = queue && queue.contests.length > 0;

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Upsolve Queue</h1>
          <p className="mt-1 text-sm text-muted">
            {stats
              ? `${stats.total_pending} problem${stats.total_pending !== 1 ? "s" : ""} pending across ${queue?.contests.length ?? 0} contest${(queue?.contests.length ?? 0) !== 1 ? "s" : ""}`
              : "No data"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="rounded-md border border-accent-border bg-accent-dim px-4 py-2 text-[13px] font-medium text-accent transition-all hover:bg-accent/10 disabled:opacity-40"
        >
          {syncing ? "Syncing..." : "Sync from CF"}
        </button>
      </div>

      {/* Stats */}
      {stats && hasContests && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox value={stats.total_items} label="Total Items" />
          <StatBox
            value={stats.total_solved}
            label="Solved"
            color="#22c55e"
          />
          <StatBox
            value={stats.total_pending}
            label="Pending"
            color="#ef4444"
          />
          <StatBox
            value={`${stats.completion_pct}%`}
            label="Completion"
            color={stats.completion_pct >= 50 ? "#22c55e" : "#ef4444"}
          />
        </div>
      )}

      {/* Per-member stats */}
      {allMembers.length > 0 && hasContests && (
        <div className="flex flex-wrap gap-3">
          {allMembers.map((m) => {
            const pct = m.total > 0 ? (m.solved / m.total) * 100 : 0;
            return (
              <div key={m.member_id} className="min-w-[100px]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs text-foreground">
                    {m.member_name}
                  </span>
                  <span className="whitespace-nowrap text-[11px] text-muted">
                    {m.solved}/{m.total}
                  </span>
                </div>
                <ProgressBar
                  percentage={pct}
                  color={pct >= 50 ? "#22c55e" : "#ef4444"}
                  height={3}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      {hasContests && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Member filter */}
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setMemberFilter(null)}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition-all ${
                memberFilter === null
                  ? "border-accent-border bg-accent-dim text-accent"
                  : "border-border text-muted hover:border-border-hover hover:text-foreground"
              }`}
            >
              All Members
            </button>
            {allMembers.map((m) => (
              <button
                key={m.member_id}
                type="button"
                onClick={() =>
                  setMemberFilter(
                    memberFilter === m.member_id ? null : m.member_id,
                  )
                }
                className={`rounded-full border px-2.5 py-1 text-[11px] transition-all ${
                  memberFilter === m.member_id
                    ? "border-accent-border bg-accent-dim text-accent"
                    : "border-border text-muted hover:border-border-hover hover:text-foreground"
                }`}
              >
                {m.member_name}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-border" />

          {/* Status filter */}
          <div className="flex gap-1">
            {(["all", "pending", "complete"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-md border px-2.5 py-1 text-[11px] capitalize transition-all ${
                  statusFilter === s
                    ? "border-accent-border bg-accent-dim text-accent"
                    : "border-border text-muted hover:border-border-hover hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-border" />

          {/* Show dismissed */}
          <button
            type="button"
            onClick={() => setShowDismissed(!showDismissed)}
            className={`rounded-md border px-2.5 py-1 text-[11px] transition-all ${
              showDismissed
                ? "border-accent-border bg-accent-dim text-accent"
                : "border-border text-muted hover:border-border-hover hover:text-foreground"
            }`}
          >
            {showDismissed ? "Hide Dismissed" : "Show Dismissed"}
          </button>
        </div>
      )}

      {/* Contest groups */}
      {!hasContests ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-border bg-surface">
          <p className="text-sm text-muted">
            No contests logged yet. Log a virtual contest to start tracking
            upsolves.
          </p>
        </div>
      ) : filteredContests.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-border bg-surface">
          <p className="text-sm text-muted">
            {statusFilter === "pending"
              ? "All caught up! No pending problems."
              : "No problems match the current filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContests.map((group) => (
            <ContestGroup
              key={group.contest_id}
              group={group}
              expanded={expanded.has(group.contest_id)}
              onToggle={() => toggleExpanded(group.contest_id)}
              memberFilter={memberFilter}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contest group component
// ---------------------------------------------------------------------------

function ContestGroup({
  group,
  expanded,
  onToggle,
  memberFilter,
  onDismiss,
}: {
  group: UpsolveContestGroup;
  expanded: boolean;
  onToggle: () => void;
  memberFilter: number | null;
  onDismiss: (contestId: string, problemIndex: string, dismissed: boolean) => void;
}) {
  const groupPending = group.items.reduce((sum, i) => sum + i.pending_count, 0);
  const groupTotal = group.items.reduce(
    (sum, i) => sum + i.member_statuses.length,
    0,
  );
  const groupSolved = groupTotal - groupPending;
  const pct = groupTotal > 0 ? (groupSolved / groupTotal) * 100 : 0;

  return (
    <div className="rounded-lg border border-border bg-surface transition-colors hover:border-border-hover">
      {/* Header */}
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 p-4 text-left"
        onClick={onToggle}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-dim">{group.contest_date}</span>
            <span className="text-[11px] text-dim">
              CF #{group.cf_contest_id}
            </span>
          </div>
          <h3 className="mt-0.5 truncate text-sm font-medium text-foreground">
            {group.contest_name}
          </h3>
          <div className="mt-1.5 flex items-center gap-3">
            <span className="text-xs text-muted">
              {group.items.length} problem{group.items.length !== 1 ? "s" : ""}
            </span>
            <div className="w-24">
              <ProgressBar percentage={pct} color={pct >= 50 ? "#22c55e" : "#ef4444"} height={3} />
            </div>
            <span className="text-[11px] text-muted">
              {groupSolved}/{groupTotal}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="whitespace-nowrap rounded-md px-2 py-1 text-sm font-bold"
            style={{
              background: groupPending > 0 ? "#ef444410" : "#22c55e10",
              color: groupPending > 0 ? "#ef4444" : "#22c55e",
            }}
          >
            {groupPending > 0 ? `${groupPending} pending` : "done"}
          </span>
          <svg
            className={`h-4 w-4 text-dim transition-transform ${expanded ? "rotate-180" : ""}`}
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
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <div className="space-y-2">
            {group.items.map((item) => (
              <ProblemRow
                key={item.problem_index}
                item={item}
                memberFilter={memberFilter}
                onDismiss={onDismiss}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Problem row component
// ---------------------------------------------------------------------------

function ProblemRow({
  item,
  memberFilter,
  onDismiss,
}: {
  item: UpsolveItem;
  memberFilter: number | null;
  onDismiss: (contestId: string, problemIndex: string, dismissed: boolean) => void;
}) {
  const statuses =
    memberFilter !== null
      ? item.member_statuses.filter((s) => s.member_id === memberFilter)
      : item.member_statuses;

  return (
    <div
      className={`flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 ${item.dismissed ? "opacity-50" : ""}`}
    >
      {/* Problem info */}
      <span className="w-8 text-xs font-bold text-muted">
        {item.problem_index}
      </span>
      <a
        href={item.cf_url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 truncate text-xs text-foreground hover:text-accent"
      >
        {item.dismissed ? <s>{item.problem_name}</s> : item.problem_name}
      </a>

      {/* Editorial button */}
      <EditorialButton problemId={item.problem_cf_id} />

      {/* Solved during contest badge */}
      {item.solved_during_contest && (
        <span className="whitespace-nowrap rounded border border-accent-border bg-accent-dim px-1.5 py-0.5 text-[10px] text-accent">
          {item.solved_by_team}
        </span>
      )}

      {/* Member status pills */}
      <div className="flex gap-1">
        {statuses.map((ms) => (
          <span
            key={ms.member_id}
            className="rounded-full border px-2 py-0.5 text-[10px]"
            style={{
              borderColor: ms.has_solved ? "#22c55e50" : "#ef444450",
              color: ms.has_solved ? "#22c55e" : "#ef4444",
              background: ms.has_solved ? "#22c55e10" : "#ef444410",
            }}
            title={
              ms.has_solved
                ? `${ms.member_name} — solved`
                : `${ms.member_name} — pending`
            }
          >
            {ms.member_name.split(" ")[0]}
          </span>
        ))}
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={() =>
          onDismiss(item.contest_id, item.problem_index, item.dismissed)
        }
        className="text-[10px] text-dim transition-colors hover:text-foreground"
        title={item.dismissed ? "Undismiss" : "Dismiss"}
      >
        {item.dismissed ? "undo" : "dismiss"}
      </button>
    </div>
  );
}
