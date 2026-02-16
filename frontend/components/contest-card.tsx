"use client";

import { useState } from "react";
import type { VirtualContest, Member } from "@/lib/types";

interface ContestCardProps {
  contest: VirtualContest;
  members: Member[];
  onEdit: (contest: VirtualContest) => void;
  onDelete: (id: string) => void;
}

export function ContestCard({
  contest,
  members,
  onEdit,
  onDelete,
}: ContestCardProps) {
  const [expanded, setExpanded] = useState(false);

  const memberName = (id: number) =>
    members.find((m) => m.id === id)?.name ?? `#${id}`;

  return (
    <div className="rounded-lg border border-border bg-surface transition-colors hover:border-border-hover">
      {/* Summary row */}
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-dim">{contest.date}</span>
            <span className="text-[11px] text-dim">
              {contest.duration_minutes}m
            </span>
          </div>
          <h3 className="mt-0.5 truncate text-sm font-medium text-foreground">
            {contest.contest_name}
          </h3>
          {/* Per-team solve counts */}
          <div className="mt-1.5 flex flex-wrap gap-3">
            {contest.teams.map((t) => (
              <span key={t.label} className="text-xs text-muted">
                {t.label}:{" "}
                <span className="text-accent">
                  {contest.solve_counts_by_team[t.label] ?? 0}
                </span>
                /{contest.total_problems}
              </span>
            ))}
          </div>
          {contest.notes && !expanded && (
            <p className="mt-1 truncate text-[11px] text-dim">
              {contest.notes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap rounded-md bg-accent-dim px-2 py-1 text-sm font-bold text-accent">
            {contest.solved_count}/{contest.total_problems}
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

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {/* Teams */}
          <div className="mb-3 flex flex-wrap gap-4">
            {contest.teams.map((t) => (
              <div key={t.label}>
                <span className="text-[11px] font-medium text-muted">
                  {t.label}
                </span>
                <div className="mt-0.5 flex gap-1">
                  {t.member_ids.map((id) => (
                    <span
                      key={id}
                      className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-foreground"
                    >
                      {memberName(id)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Results table */}
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[11px] text-dim">
                <th className="pb-1.5 font-medium">Problem</th>
                <th className="pb-1.5 font-medium">Solved By</th>
                <th className="pb-1.5 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {contest.results.map((r) => (
                <tr key={r.problem_index} className="border-b border-border/50">
                  <td className="py-1.5 text-foreground">
                    {r.problem_index}. {r.problem_name}
                  </td>
                  <td className="py-1.5">
                    {r.solved_by_team ? (
                      <span className="text-accent">{r.solved_by_team}</span>
                    ) : (
                      <span className="text-dim">--</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right text-muted">
                    {r.solve_time_minutes != null
                      ? `${r.solve_time_minutes}m`
                      : "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Notes */}
          {contest.notes && (
            <p className="mt-3 text-xs text-muted">{contest.notes}</p>
          )}

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted transition-colors hover:text-foreground"
              onClick={() => onEdit(contest)}
            >
              Edit
            </button>
            <button
              type="button"
              className="rounded-md border border-danger/30 px-2.5 py-1 text-[11px] text-danger/70 transition-colors hover:text-danger"
              onClick={() => onDelete(contest.id)}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
