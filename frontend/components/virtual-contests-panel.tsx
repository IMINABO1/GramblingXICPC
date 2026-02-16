"use client";

import { useState, useEffect } from "react";
import { useContests, useUpsolve } from "@/lib/hooks";
import { ProgressBar } from "@/components/progress-bar";

export function VirtualContestsPanel() {
  const { contests, loading: cLoading } = useContests();
  const { queue, stats, loading: uLoading } = useUpsolve();
  const [expanded, setExpanded] = useState(false);

  const loading = cLoading || uLoading;

  // Recent contests (last 5)
  const recentContests = contests.slice(0, 5);

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-all hover:bg-surface/80"
      >
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">
            🏆 Virtual Contests & Upsolve
          </h2>
          <p className="mt-0.5 text-[12px] text-muted">
            {loading
              ? "Loading..."
              : stats
                ? `${contests.length} contests logged • ${stats.total_pending} problems pending`
                : "Track virtual contest performance"}
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
        <div className="space-y-4 border-t border-border p-4">
          {loading && (
            <div className="flex items-center justify-center py-8 text-muted">
              <span className="pulse-slow">Loading contests...</span>
            </div>
          )}

          {!loading && contests.length === 0 && (
            <div className="rounded-md border border-border bg-background p-6 text-center">
              <p className="text-[13px] text-muted">
                No virtual contests logged yet. Log your team's virtual contest
                attempts to track upsolve progress.
              </p>
              <a
                href="/contests"
                className="mt-3 inline-block rounded-md border border-accent-border bg-accent-dim px-4 py-2 text-[12px] font-medium text-accent transition-all hover:bg-accent/10"
              >
                Log a Contest
              </a>
            </div>
          )}

          {!loading && contests.length > 0 && (
            <>
              {/* Overall stats */}
              {stats && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-md border border-border bg-background p-3 text-center">
                    <div className="text-[20px] font-bold text-foreground">
                      {contests.length}
                    </div>
                    <div className="text-[10px] text-muted">Contests</div>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3 text-center">
                    <div className="text-[20px] font-bold text-accent">
                      {stats.total_solved}
                    </div>
                    <div className="text-[10px] text-muted">Upsolved</div>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3 text-center">
                    <div className="text-[20px] font-bold text-red-400">
                      {stats.total_pending}
                    </div>
                    <div className="text-[10px] text-muted">Pending</div>
                  </div>
                </div>
              )}

              {/* Recent contests */}
              <div>
                <h3 className="mb-2 text-[13px] font-medium text-foreground">
                  Recent Contests
                </h3>
                <div className="space-y-2">
                  {recentContests.map((contest) => {
                    const groupData = queue?.contests.find(
                      (g) => g.contest_id === contest.id,
                    );
                    const pendingCount = groupData?.items.reduce(
                      (sum, item) => sum + item.pending_count,
                      0,
                    ) ?? 0;
                    const totalCount = groupData?.items.reduce(
                      (sum, item) => sum + item.member_statuses.length,
                      0,
                    ) ?? 0;
                    const solvedCount = totalCount - pendingCount;
                    const pct = totalCount > 0 ? (solvedCount / totalCount) * 100 : 0;

                    return (
                      <div
                        key={contest.id}
                        className="rounded-md border border-border bg-background p-3"
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] font-medium text-foreground">
                              {contest.name}
                            </div>
                            <div className="text-[10px] text-muted">
                              {contest.date} • CF #{contest.cf_contest_id}
                            </div>
                          </div>
                          {totalCount > 0 && (
                            <span
                              className="whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-bold"
                              style={{
                                background: pendingCount > 0 ? "#ef444410" : "#22c55e10",
                                color: pendingCount > 0 ? "#ef4444" : "#22c55e",
                              }}
                            >
                              {pendingCount > 0 ? `${pendingCount} left` : "done"}
                            </span>
                          )}
                        </div>
                        {totalCount > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1">
                              <ProgressBar
                                percentage={pct}
                                color={pct >= 50 ? "#22c55e" : "#ef4444"}
                                height={4}
                              />
                            </div>
                            <span className="text-[10px] text-muted">
                              {solvedCount}/{totalCount}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Link to full pages */}
              <div className="flex gap-2">
                <a
                  href="/contests"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-center text-[12px] text-foreground transition-all hover:border-accent-border hover:text-accent"
                >
                  View All Contests
                </a>
                <a
                  href="/upsolve"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-center text-[12px] text-foreground transition-all hover:border-accent-border hover:text-accent"
                >
                  Upsolve Queue
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
