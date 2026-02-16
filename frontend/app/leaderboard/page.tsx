"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useLeaderboard } from "@/lib/hooks";
import { api } from "@/lib/api";
import { ratingColor } from "@/lib/constants";
import { StatBox } from "@/components/stat-box";
import { ProgressBar } from "@/components/progress-bar";
import type {
  MemberLeaderboard,
  WeeklySolves,
  TopicCoverageEntry,
  WeeklySummaryResponse,
} from "@/lib/types";

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-muted">
          Loading leaderboard...
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/*  Sparkline                                                          */
/* ------------------------------------------------------------------ */

function WeeklySparkline({ weeks }: { weeks: WeeklySolves[] }) {
  const max = Math.max(...weeks.map((w) => w.count), 1);
  return (
    <div className="flex items-end gap-0.5" style={{ height: 24 }}>
      {weeks
        .slice()
        .reverse()
        .map((w) => (
          <div
            key={w.week_start}
            className="w-2 rounded-sm bg-accent"
            style={{
              height: `${(w.count / max) * 100}%`,
              minHeight: w.count > 0 ? 2 : 0,
              opacity: w.count > 0 ? 1 : 0.15,
            }}
            title={`${w.week_start}: ${w.count} solved`}
          />
        ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Topic Heatmap                                                      */
/* ------------------------------------------------------------------ */

const TIER_COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444"];

function TopicHeatmap({ members }: { members: MemberLeaderboard[] }) {
  if (members.length === 0) return null;

  // Get ordered topic list from first member (all members have same topics)
  const topics = members[0].topic_coverage;

  // Group by tier for column headers
  const tiers = useMemo(() => {
    const tierMap = new Map<number, TopicCoverageEntry[]>();
    for (const t of topics) {
      const list = tierMap.get(t.tier) ?? [];
      list.push(t);
      tierMap.set(t.tier, list);
    }
    return Array.from(tierMap.entries()).sort(([a], [b]) => a - b);
  }, [topics]);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Topic Coverage
      </h3>
      <div className="min-w-[700px]">
        {/* Topic headers */}
        <div className="mb-1 flex items-end gap-0.5 pl-28">
          {tiers.map(([tier, tierTopics]) =>
            tierTopics.map((t) => (
              <div
                key={t.topic_id}
                className="flex w-5 flex-shrink-0 items-center justify-center"
                title={`${t.topic_name} (Tier ${tier})`}
              >
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: TIER_COLORS[tier] }}
                />
              </div>
            )),
          )}
        </div>

        {/* Rows */}
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-0.5">
            <div className="w-28 flex-shrink-0 truncate pr-2 text-[11px] text-muted">
              {m.name}
            </div>
            {m.topic_coverage.map((tc) => {
              const intensity = tc.pct / 100;
              return (
                <div
                  key={tc.topic_id}
                  className="h-5 w-5 flex-shrink-0 rounded-sm transition-colors"
                  style={{
                    background:
                      intensity > 0
                        ? `rgba(0, 255, 163, ${0.1 + intensity * 0.7})`
                        : "rgba(255, 255, 255, 0.03)",
                  }}
                  title={`${m.name} \u2014 ${tc.topic_name}: ${tc.solved}/${tc.total} (${tc.pct}%)`}
                />
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="mt-3 flex items-center gap-4 text-[10px] text-muted">
          <span>Coverage:</span>
          {[0, 25, 50, 75, 100].map((pct) => (
            <div key={pct} className="flex items-center gap-1">
              <div
                className="h-3 w-3 rounded-sm"
                style={{
                  background:
                    pct > 0
                      ? `rgba(0, 255, 163, ${0.1 + (pct / 100) * 0.7})`
                      : "rgba(255, 255, 255, 0.03)",
                }}
              />
              <span>{pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Weekly Summary                                                     */
/* ------------------------------------------------------------------ */

function WeeklySummaryBox() {
  const [summary, setSummary] = useState<WeeklySummaryResponse | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchSummary = useCallback(() => {
    setLoading(true);
    api
      .getWeeklySummary(weekOffset)
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [weekOffset]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  async function handleCopy() {
    if (!summary) return;
    await navigator.clipboard.writeText(summary.summary_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Weekly Summary
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={weekOffset}
            onChange={(e) => setWeekOffset(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground"
          >
            <option value={0}>This Week</option>
            <option value={1}>Last Week</option>
            <option value={2}>2 Weeks Ago</option>
          </select>
          <button
            onClick={handleCopy}
            disabled={!summary}
            className="rounded-md border border-accent-border bg-accent-dim px-3 py-1 text-[11px] font-medium text-accent transition-all hover:bg-accent/10 disabled:opacity-40"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      {loading ? (
        <div className="py-8 text-center text-xs text-muted">Loading...</div>
      ) : summary ? (
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-background p-3 font-mono text-[11px] leading-relaxed text-muted">
          {summary.summary_text}
        </pre>
      ) : (
        <div className="py-8 text-center text-xs text-muted">
          No summary available.
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main content                                                       */
/* ------------------------------------------------------------------ */

function LeaderboardContent() {
  const { data, loading, error } = useLeaderboard();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted">
        Loading leaderboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-red-400">
        Error: {error}
      </div>
    );
  }

  if (!data) return null;

  const { members, curated_total, total_topics } = data;

  // Aggregate stats
  const totalTeamSolves = members.reduce((s, m) => s + m.curated_solved, 0);
  const activeThisWeek = members.filter(
    (m) => m.weekly_solves.length > 0 && m.weekly_solves[0].count > 0,
  ).length;
  const longestActiveStreak = Math.max(
    ...members.map((m) => m.streak.current_streak),
    0,
  );
  const allTimeStreak = Math.max(
    ...members.map((m) => m.streak.longest_streak),
    0,
  );

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Leaderboard
        </h1>
        <p className="mt-1 text-sm text-muted">
          Rankings, streaks, and weekly stats. Gamify the grind.
        </p>
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox
          value={totalTeamSolves}
          label={`Team Solves (of ${curated_total})`}
          color="#00ffa3"
        />
        <StatBox
          value={activeThisWeek}
          label="Active This Week"
          color="#3b82f6"
        />
        <StatBox
          value={longestActiveStreak > 0 ? `${longestActiveStreak}d` : "\u2014"}
          label="Best Active Streak"
          color="#a855f7"
        />
        <StatBox
          value={allTimeStreak > 0 ? `${allTimeStreak}d` : "\u2014"}
          label="All-Time Best Streak"
          color="#f59e0b"
        />
      </div>

      {/* Rankings table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Solved</th>
              <th className="px-4 py-3 font-medium">Avg Rating</th>
              <th className="px-4 py-3 font-medium">Topics</th>
              <th className="px-4 py-3 font-medium">Streak</th>
              <th className="px-4 py-3 font-medium">This Week</th>
              <th className="px-4 py-3 font-medium">8-Week Trend</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => {
              const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
              const rank =
                i < 3 && m.curated_solved > 0 ? medals[i] : `${i + 1}`;
              const pct = curated_total
                ? (m.curated_solved / curated_total) * 100
                : 0;
              const thisWeek =
                m.weekly_solves.length > 0 ? m.weekly_solves[0].count : 0;

              return (
                <tr
                  key={m.id}
                  className="border-b border-border/50 transition-colors hover:bg-surface-hover"
                >
                  <td className="px-4 py-3 text-center text-base">{rank}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{m.name}</div>
                    {m.cf_handle && (
                      <div className="text-[11px] text-muted">
                        @{m.cf_handle}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-foreground">
                      {m.curated_solved}
                      <span className="text-muted">/{curated_total}</span>
                    </div>
                    <div className="mt-1 w-20">
                      <ProgressBar percentage={pct} height={3} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {m.avg_rating_solved > 0 ? (
                      <span
                        className="font-mono font-medium"
                        style={{ color: ratingColor(m.avg_rating_solved) }}
                      >
                        {Math.round(m.avg_rating_solved)}
                      </span>
                    ) : (
                      <span className="text-muted">{"\u2014"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-foreground">{m.topics_touched}</span>
                    <span className="text-muted">/{total_topics}</span>
                  </td>
                  <td className="px-4 py-3">
                    {m.streak.current_streak > 0 ? (
                      <div>
                        <span className="font-medium text-foreground">
                          {m.streak.current_streak}d{" "}
                          <span className="text-orange-400">
                            {"\u{1F525}"}
                          </span>
                        </span>
                        {m.streak.longest_streak >
                          m.streak.current_streak && (
                          <div className="text-[10px] text-muted">
                            best: {m.streak.longest_streak}d
                          </div>
                        )}
                      </div>
                    ) : m.streak.longest_streak > 0 ? (
                      <div>
                        <span className="text-muted">{"\u2014"}</span>
                        <div className="text-[10px] text-muted">
                          best: {m.streak.longest_streak}d
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted">{"\u2014"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {thisWeek > 0 ? (
                      <span className="font-medium text-accent">
                        +{thisWeek}
                      </span>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <WeeklySparkline weeks={m.weekly_solves} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Topic heatmap */}
      <TopicHeatmap members={members} />

      {/* Weekly summary */}
      <WeeklySummaryBox />

      {/* Info box */}
      <div className="rounded-lg border border-border/50 bg-surface/50 p-4 text-[12px] leading-relaxed text-muted">
        <strong className="text-foreground">How rankings work:</strong> Members
        are ranked by curated problems solved (out of {curated_total}). Streaks
        count consecutive days with at least one solve on Codeforces. Weekly
        stats count curated problems only. Topic coverage shows completion
        percentage per topic &mdash; brighter green means more solved.
      </div>
    </div>
  );
}
