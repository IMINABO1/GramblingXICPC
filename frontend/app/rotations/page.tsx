"use client";

import { useState } from "react";
import { useRotations } from "@/lib/hooks";
import { StatBox } from "@/components/stat-box";
import { ProgressBar } from "@/components/progress-bar";
import { Sparkline } from "@/components/sparkline";
import { ComboTimelineChart } from "@/components/combo-timeline-chart";
import type { ComboRanking } from "@/lib/types";

const CLUSTER_LABELS: Record<string, string> = {
  graphs: "Graphs",
  dp_math: "DP / Math",
  impl_ds: "Impl / DS",
};

type LeaderboardTab = "trios" | "duos";

export default function Rotations() {
  const { rankings, suggestion, timeline, loading, error } = useRotations();
  const [tab, setTab] = useState<LeaderboardTab>("trios");

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        <span className="pulse-slow">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-red-400">
        Error: {error}
      </div>
    );
  }

  const trios = rankings.filter((r) => r.combo.team_size === 3);
  const duos = rankings.filter((r) => r.combo.team_size === 2);
  const activeTab = tab === "trios" ? trios : duos;

  const bestCombo =
    rankings.length > 0 ? rankings[0].combo.member_names.join(", ") : "--";
  const avgSolveRate =
    rankings.length > 0
      ? Math.round(
          (rankings.reduce((s, r) => s + r.combo.solve_rate, 0) /
            rankings.length) *
            100,
        )
      : 0;
  const totalContests = rankings.reduce(
    (s, r) => s + r.combo.contests_played,
    0,
  );
  // Dedupe contests (same contest can appear for multiple combos)
  const uniqueContests = new Set(
    rankings.flatMap((r) =>
      r.combo.best_contest ? [r.combo.best_contest.contest_id] : [],
    ),
  ).size;

  const testedTrios = suggestion?.tested_trios ?? 0;
  const totalPossible = suggestion?.total_possible_trios ?? 0;
  const coveragePct =
    totalPossible > 0 ? Math.round((testedTrios / totalPossible) * 100) : 0;

  // Build combo name map for the timeline chart
  const comboNames: Record<string, string> = {};
  for (const r of rankings) {
    comboNames[r.combo.combo_key] = r.combo.member_names.join(", ");
  }

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Rotations</h1>
        <p className="mt-1 text-sm text-muted">
          Track team combos, measure real performance, find the best chemistry
        </p>
      </div>

      {/* Empty state */}
      {rankings.length === 0 && !suggestion?.teams.length ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-lg font-medium text-foreground">
            No rotation data yet
          </p>
          <p className="mt-2 text-sm text-muted">
            Log your first virtual contest at{" "}
            <a href="/contests" className="text-accent hover:underline">
              /contests
            </a>{" "}
            with 3-member teams to start tracking combos.
          </p>
          {suggestion && suggestion.teams.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-muted">
                Meanwhile, here&apos;s a suggested first partition:
              </p>
            </div>
          )}
        </div>
      ) : null}

      {/* Stats bar */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox
          value={`${testedTrios}/${totalPossible}`}
          label="Trios Tested"
        />
        <StatBox
          value={bestCombo.length > 25 ? bestCombo.slice(0, 22) + "..." : bestCombo}
          label="Top Combo"
          color="#f59e0b"
        />
        <StatBox value={`${avgSolveRate}%`} label="Avg Solve Rate" />
        <StatBox
          value={uniqueContests}
          label="Contests Played"
          color="#3b82f6"
        />
      </div>

      {/* Next Up panel */}
      {suggestion && suggestion.teams.length > 0 && (
        <div className="rounded-lg border border-accent-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold text-accent">
              NEXT UP
            </h2>
            <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
              {suggestion.reason}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suggestion.teams.map((team, i) => (
              <div
                key={team.member_ids.join("-")}
                className="rounded-md border border-border bg-background p-3"
              >
                <div className="mb-2 text-[11px] font-medium text-muted">
                  Team {String.fromCharCode(65 + i)} ({team.member_ids.length})
                </div>
                <div className="mb-3 flex flex-wrap gap-1">
                  {team.member_names.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent"
                    >
                      {name}
                    </span>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {Object.entries(team.coverage).map(([cluster, score]) => (
                    <div key={cluster}>
                      <div className="mb-0.5 flex items-center justify-between text-[10px]">
                        <span className="text-muted">
                          {CLUSTER_LABELS[cluster] ?? cluster}
                        </span>
                        <span className="text-foreground">
                          {Math.round(score * 100)}%
                        </span>
                      </div>
                      <ProgressBar percentage={score * 100} height={3} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Rotation coverage progress */}
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-muted">
                Rotation Coverage: {testedTrios} / {totalPossible} trios tested
              </span>
              <span className="text-foreground">{coveragePct}%</span>
            </div>
            <ProgressBar percentage={coveragePct} color="#3b82f6" height={3} />
          </div>
        </div>
      )}

      {/* Combo Leaderboard */}
      {rankings.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold text-foreground">
              Combo Leaderboard
            </h2>
            <div className="flex gap-1">
              {(["trios", "duos"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded px-2.5 py-1 text-[11px] font-medium transition-all ${
                    tab === t
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t === "trios"
                    ? `Trios (${trios.length})`
                    : `Duos (${duos.length})`}
                </button>
              ))}
            </div>
          </div>

          {activeTab.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-muted">
              No {tab} tested yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted">
                    <th className="pb-2 pr-3">#</th>
                    <th className="pb-2 pr-3">Members</th>
                    <th className="pb-2 pr-3 text-right">Contests</th>
                    <th className="pb-2 pr-3 text-right">Solve Rate</th>
                    <th className="pb-2 pr-3 text-right">Avg Time</th>
                    <th className="pb-2 text-right">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTab.map((r, idx) => (
                    <LeaderboardRow key={r.combo.combo_key} ranking={r} index={idx} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Performance Timeline */}
      {timeline && Object.keys(timeline.combos).length > 0 && (
        <ComboTimelineChart
          combos={timeline.combos}
          comboNames={comboNames}
        />
      )}

      {/* Coverage Grid */}
      {totalPossible > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-3 font-heading text-sm font-semibold text-foreground">
            Trio Coverage Map
          </h2>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: totalPossible }, (_, i) => {
              const tested = i < testedTrios;
              return (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-sm ${
                    tested ? "bg-accent" : "bg-surface-hover"
                  }`}
                  title={tested ? "Tested" : "Not tested"}
                />
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-muted">
            {testedTrios} of {totalPossible} possible trios have been tested in
            contests
          </p>
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({
  ranking,
  index,
}: {
  ranking: ComboRanking;
  index: number;
}) {
  const { combo, trend } = ranking;
  const isFirst = index === 0;
  const solveRatePct = Math.round(combo.solve_rate * 100);

  const rateColor =
    solveRatePct >= 60
      ? "text-accent"
      : solveRatePct >= 30
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <tr
      className={`border-b border-border/50 ${
        isFirst ? "bg-accent/5" : ""
      }`}
    >
      <td className="py-2 pr-3">
        <span
          className={`text-[12px] font-bold ${
            isFirst ? "text-accent" : "text-muted"
          }`}
        >
          #{index + 1}
        </span>
      </td>
      <td className="py-2 pr-3">
        <div className="flex flex-wrap gap-1">
          {combo.member_names.map((name) => (
            <span
              key={name}
              className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px] text-foreground"
            >
              {name}
            </span>
          ))}
        </div>
      </td>
      <td className="py-2 pr-3 text-right text-muted">
        {combo.contests_played}
      </td>
      <td className={`py-2 pr-3 text-right font-medium ${rateColor}`}>
        {solveRatePct}%
      </td>
      <td className="py-2 pr-3 text-right text-muted">
        {combo.avg_solve_time !== null
          ? `${Math.round(combo.avg_solve_time)}m`
          : "--"}
      </td>
      <td className="py-2 text-right">
        <Sparkline data={trend} />
      </td>
    </tr>
  );
}
