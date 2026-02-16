"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type {
  Member,
  VirtualContest,
  ContestTeamEntry,
  ContestProblemResult,
  ContestCreatePayload,
  ContestUpdatePayload,
} from "@/lib/types";

interface ContestFormProps {
  members: Member[];
  editing?: VirtualContest | null;
  onClose: () => void;
  onSaved: () => void;
}

type TeamSlot = "Team A" | "Team B" | "none";

export function ContestForm({
  members,
  editing,
  onClose,
  onSaved,
}: ContestFormProps) {
  // Contest info
  const [cfIdInput, setCfIdInput] = useState(
    editing ? String(editing.cf_contest_id) : "",
  );
  const [contestName, setContestName] = useState(editing?.contest_name ?? "");
  const [date, setDate] = useState(
    editing?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [durationMinutes, setDurationMinutes] = useState(
    editing?.duration_minutes ?? 120,
  );

  // Problems
  const [problems, setProblems] = useState<
    { index: string; name: string }[]
  >(
    editing?.results.map((r) => ({
      index: r.problem_index,
      name: r.problem_name,
    })) ?? [],
  );

  // Team assignments
  const [memberSlots, setMemberSlots] = useState<Record<number, TeamSlot>>(
    () => {
      const map: Record<number, TeamSlot> = {};
      if (editing) {
        for (const m of members) map[m.id] = "none";
        for (const t of editing.teams) {
          for (const id of t.member_ids) {
            map[id] = t.label as TeamSlot;
          }
        }
      } else {
        for (const m of members) map[m.id] = "none";
      }
      return map;
    },
  );

  // Results: solved_by_team and time per problem index
  const [results, setResults] = useState<
    Record<string, { solved_by: TeamSlot | "none"; time: string }>
  >(() => {
    const map: Record<string, { solved_by: TeamSlot | "none"; time: string }> =
      {};
    if (editing) {
      for (const r of editing.results) {
        map[r.problem_index] = {
          solved_by: (r.solved_by_team as TeamSlot) ?? "none",
          time: r.solve_time_minutes != null ? String(r.solve_time_minutes) : "",
        };
      }
    }
    return map;
  });

  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup() {
    const id = parseInt(cfIdInput, 10);
    if (isNaN(id) || id <= 0) return;

    setLookupLoading(true);
    setLookupError(null);
    try {
      const info = await api.getCFContestInfo(id);
      setContestName(info.name);
      setDurationMinutes(Math.floor(info.duration_seconds / 60));
      setProblems(info.problems);
      // Init results for new problems
      const newResults: Record<
        string,
        { solved_by: TeamSlot | "none"; time: string }
      > = {};
      for (const p of info.problems) {
        newResults[p.index] = { solved_by: "none", time: "" };
      }
      setResults(newResults);
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  }

  function cycleMember(id: number) {
    setMemberSlots((prev) => {
      const current = prev[id];
      const next: TeamSlot =
        current === "none"
          ? "Team A"
          : current === "Team A"
            ? "Team B"
            : "none";
      return { ...prev, [id]: next };
    });
  }

  function setResultField(
    index: string,
    field: "solved_by" | "time",
    value: string,
  ) {
    setResults((prev) => ({
      ...prev,
      [index]: { ...prev[index], [field]: value },
    }));
  }

  async function handleSubmit() {
    if (!contestName || problems.length === 0) {
      setError("Contest name and problems are required");
      return;
    }

    const cfId = parseInt(cfIdInput, 10);
    if (isNaN(cfId) || cfId <= 0) {
      setError("Valid CF contest ID is required");
      return;
    }

    // Build teams
    const teams: ContestTeamEntry[] = [];
    const teamA = Object.entries(memberSlots)
      .filter(([, s]) => s === "Team A")
      .map(([id]) => Number(id));
    const teamB = Object.entries(memberSlots)
      .filter(([, s]) => s === "Team B")
      .map(([id]) => Number(id));
    if (teamA.length > 0)
      teams.push({ label: "Team A", member_ids: teamA });
    if (teamB.length > 0)
      teams.push({ label: "Team B", member_ids: teamB });

    // Build results
    const contestResults: ContestProblemResult[] = problems.map((p) => {
      const r = results[p.index];
      const solvedBy =
        r?.solved_by && r.solved_by !== "none" ? r.solved_by : null;
      const time =
        r?.time && solvedBy ? parseInt(r.time, 10) : null;
      return {
        problem_index: p.index,
        problem_name: p.name,
        solved_by_team: solvedBy,
        solve_time_minutes: isNaN(time as number) ? null : time,
      };
    });

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const payload: ContestUpdatePayload = {
          contest_name: contestName,
          date,
          duration_minutes: durationMinutes,
          teams,
          results: contestResults,
          notes,
        };
        await api.updateContest(editing.id, payload);
      } else {
        const payload: ContestCreatePayload = {
          cf_contest_id: cfId,
          contest_name: contestName,
          date,
          duration_minutes: durationMinutes,
          teams,
          results: contestResults,
          notes,
        };
        await api.createContest(payload);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const slotColor = (s: TeamSlot | "none") =>
    s === "Team A" ? "#00ffa3" : s === "Team B" ? "#3b82f6" : "#55556a";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-background p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">
            {editing ? "Edit Contest" : "Log Virtual Contest"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground"
          >
            &times;
          </button>
        </div>

        {/* Section 1: Contest Info */}
        <div className="mb-5 space-y-3">
          <label className="text-[11px] font-medium uppercase text-muted">
            Contest Info
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="CF Contest ID"
              value={cfIdInput}
              onChange={(e) => setCfIdInput(e.target.value)}
              className="w-40 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent-border focus:outline-none"
            />
            <button
              type="button"
              onClick={handleLookup}
              disabled={lookupLoading || !cfIdInput}
              className="rounded-md border border-accent-border bg-accent-dim px-3 py-2 text-[13px] font-medium text-accent transition-all hover:bg-accent/10 disabled:opacity-40"
            >
              {lookupLoading ? "..." : "Lookup"}
            </button>
          </div>
          {lookupError && (
            <p className="text-[11px] text-danger">{lookupError}</p>
          )}
          <input
            type="text"
            placeholder="Contest name"
            value={contestName}
            onChange={(e) => setContestName(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent-border focus:outline-none"
          />
          <div className="flex gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent-border focus:outline-none"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) =>
                  setDurationMinutes(parseInt(e.target.value, 10) || 0)
                }
                className="w-20 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent-border focus:outline-none"
              />
              <span className="text-xs text-muted">min</span>
            </div>
          </div>
        </div>

        {/* Section 2: Team Assignment */}
        <div className="mb-5">
          <label className="mb-2 block text-[11px] font-medium uppercase text-muted">
            Teams — Click to assign
          </label>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const slot = memberSlots[m.id] ?? "none";
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => cycleMember(m.id)}
                  className="rounded-md border px-3 py-1.5 text-[12px] font-medium transition-all hover:border-accent-border"
                  style={{
                    borderColor: slotColor(slot),
                    color: slotColor(slot),
                    background: slotColor(slot) + "10",
                  }}
                >
                  {m.name}
                  {slot !== "none" && (
                    <span className="ml-1 text-[10px] opacity-70">
                      ({slot === "Team A" ? "A" : "B"})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Results */}
        {problems.length > 0 && (
          <div className="mb-5">
            <label className="mb-2 block text-[11px] font-medium uppercase text-muted">
              Results
            </label>
            <div className="space-y-1.5">
              {problems.map((p) => {
                const r = results[p.index] ?? {
                  solved_by: "none",
                  time: "",
                };
                return (
                  <div
                    key={p.index}
                    className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5"
                  >
                    <span className="w-8 text-xs font-bold text-muted">
                      {p.index}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                      {p.name}
                    </span>
                    <select
                      value={r.solved_by}
                      onChange={(e) =>
                        setResultField(p.index, "solved_by", e.target.value)
                      }
                      className="rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground focus:border-accent-border focus:outline-none"
                    >
                      <option value="none">Unsolved</option>
                      <option value="Team A">Team A</option>
                      <option value="Team B">Team B</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="--"
                        value={r.time}
                        onChange={(e) =>
                          setResultField(p.index, "time", e.target.value)
                        }
                        disabled={r.solved_by === "none"}
                        className="w-14 rounded border border-border bg-background px-2 py-1 text-right text-[11px] text-foreground focus:border-accent-border focus:outline-none disabled:opacity-30"
                      />
                      <span className="text-[10px] text-dim">m</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 4: Notes + Submit */}
        <div className="mb-5">
          <label className="mb-2 block text-[11px] font-medium uppercase text-muted">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about this contest..."
            rows={2}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent-border focus:outline-none"
          />
        </div>

        {error && (
          <p className="mb-3 rounded border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-[13px] text-muted transition-colors hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-md border border-accent-border bg-accent-dim px-4 py-2 text-[13px] font-medium text-accent transition-all hover:bg-accent/10 disabled:opacity-40"
          >
            {saving ? "Saving..." : editing ? "Update" : "Log Contest"}
          </button>
        </div>
      </div>
    </div>
  );
}
