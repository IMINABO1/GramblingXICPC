"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useProblems, useTopics, useTeam } from "@/lib/hooks";
import { api } from "@/lib/api";
import type { ComposeResponse, MemberProfile, TopicsResponse } from "@/lib/types";
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

type Slot = "team_a" | "team_b" | "alternates";
const SLOT_CYCLE: Slot[] = ["team_a", "team_b", "alternates"];

export default function Compose() {
  const { problems, loading: pLoading } = useProblems();
  const { topics, loading: tLoading } = useTopics();
  const { members, loading: mLoading } = useTeam();

  const [profiles, setProfiles] = useState<MemberProfile[]>([]);
  const [assignments, setAssignments] = useState<Record<number, Slot>>({});
  const [composeLoading, setComposeLoading] = useState(true);

  const loading = pLoading || tLoading || mLoading;

  const fetchCompose = useCallback(async () => {
    setComposeLoading(true);
    try {
      const data: ComposeResponse = await api.compose();
      setProfiles(data.profiles);
      const map: Record<number, Slot> = {};
      for (const id of data.suggestion.team_a) map[id] = "team_a";
      for (const id of data.suggestion.team_b) map[id] = "team_b";
      for (const id of data.suggestion.alternates) map[id] = "alternates";
      setAssignments(map);
    } catch {
      // If compose fails (e.g. no data), initialize all as alternates
      if (members.length > 0) {
        const map: Record<number, Slot> = {};
        for (const m of members) map[m.id] = "alternates";
        setAssignments(map);
      }
    } finally {
      setComposeLoading(false);
    }
  }, [members]);

  useEffect(() => {
    if (!loading && members.length > 0) {
      fetchCompose();
    }
  }, [loading, members.length, fetchCompose]);

  // Cycle a member to next slot, respecting max 3 per team
  function cycleMember(memberId: number) {
    setAssignments((prev) => {
      const current = prev[memberId];
      const currentIdx = SLOT_CYCLE.indexOf(current);

      // Try next slots in order until we find one that's not full
      for (let i = 1; i <= SLOT_CYCLE.length; i++) {
        const next = SLOT_CYCLE[(currentIdx + i) % SLOT_CYCLE.length];
        if (next === "alternates") {
          return { ...prev, [memberId]: next };
        }
        const count = Object.values(prev).filter((s) => s === next).length;
        if (count < 3) {
          return { ...prev, [memberId]: next };
        }
      }
      return prev;
    });
  }

  // Compute coverage per cluster for a set of member IDs
  function teamCoverage(memberIds: number[]): Record<string, number> {
    const coverage: Record<string, number> = {};
    for (const cluster of Object.keys(CLUSTER_LABELS)) {
      coverage[cluster] = Math.max(
        ...memberIds.map(
          (id) =>
            profiles.find((p) => p.id === id)?.cluster_scores[cluster] ?? 0,
        ),
        0,
      );
    }
    return coverage;
  }

  // Derived: members in each slot
  const slots = useMemo(() => {
    const result: Record<Slot, number[]> = {
      team_a: [],
      team_b: [],
      alternates: [],
    };
    for (const [idStr, slot] of Object.entries(assignments)) {
      result[slot].push(Number(idStr));
    }
    return result;
  }, [assignments]);

  const coverageA = useMemo(
    () => teamCoverage(slots.team_a),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots.team_a, profiles],
  );
  const coverageB = useMemo(
    () => teamCoverage(slots.team_b),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots.team_b, profiles],
  );

  if (loading || composeLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        <span className="pulse-slow">Loading...</span>
      </div>
    );
  }

  if (!topics) return null;

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Team Composer</h1>
          <p className="mt-1 text-sm text-muted">
            {members.length} members &middot; Click a member to reassign
          </p>
        </div>
        <button
          onClick={fetchCompose}
          className="rounded-md border border-accent-border bg-accent-dim px-4 py-2 text-[13px] font-medium text-accent transition-all hover:bg-accent/10"
        >
          Auto-Balance
        </button>
      </div>

      {/* Team columns */}
      <div className="grid gap-4 md:grid-cols-3">
        <TeamColumn
          title="Team 1"
          memberIds={slots.team_a}
          profiles={profileMap}
          topics={topics}
          coverage={coverageA}
          onCycle={cycleMember}
          accent="#00ffa3"
        />
        <TeamColumn
          title="Team 2"
          memberIds={slots.team_b}
          profiles={profileMap}
          topics={topics}
          coverage={coverageB}
          onCycle={cycleMember}
          accent="#3b82f6"
        />
        <TeamColumn
          title="Bench"
          memberIds={slots.alternates}
          profiles={profileMap}
          topics={topics}
          onCycle={cycleMember}
          accent="#8888a0"
        />
      </div>

      {/* Strength profiles grid */}
      <div>
        <h2 className="mb-3 font-heading text-lg font-semibold">
          Member Strengths
        </h2>
        <div className="space-y-2">
          {profiles.map((p) => (
            <MemberStrengthRow
              key={p.id}
              profile={p}
              topics={topics}
              slot={assignments[p.id]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Team column                                                         */
/* ------------------------------------------------------------------ */

function TeamColumn({
  title,
  memberIds,
  profiles,
  topics,
  coverage,
  onCycle,
  accent,
}: {
  title: string;
  memberIds: number[];
  profiles: Map<number, MemberProfile>;
  topics: TopicsResponse;
  coverage?: Record<string, number>;
  onCycle: (id: number) => void;
  accent: string;
}) {
  return (
    <div
      className="rounded-lg border border-border bg-surface p-4"
      style={{ borderTopColor: accent, borderTopWidth: 2 }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold" style={{ color: accent }}>
          {title}
        </h3>
        <span className="text-[11px] text-muted">{memberIds.length}/3</span>
      </div>

      <div className="mb-4 min-h-[120px] space-y-2">
        {memberIds.length === 0 && (
          <p className="py-4 text-center text-[12px] text-dim">No members</p>
        )}
        {memberIds.map((id) => {
          const p = profiles.get(id);
          if (!p) return null;
          return (
            <button
              key={id}
              onClick={() => onCycle(id)}
              className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-left transition-all hover:border-accent-border"
            >
              <span className="text-[13px] font-medium text-foreground">
                {p.name}
              </span>
              <div className="ml-auto flex gap-1">
                {Object.entries(CLUSTER_LABELS).map(([key, label]) => (
                  <span
                    key={key}
                    className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                    style={{
                      color: CLUSTER_COLORS[key],
                      background: CLUSTER_COLORS[key] + "15",
                    }}
                    title={`${label}: ${Math.round((p.cluster_scores[key] ?? 0) * 100)}%`}
                  >
                    {Math.round((p.cluster_scores[key] ?? 0) * 100)}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Coverage bars */}
      {coverage && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-medium uppercase text-muted">
            Coverage
          </span>
          {Object.entries(CLUSTER_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <span
                className="w-16 text-[10px]"
                style={{ color: CLUSTER_COLORS[key] }}
              >
                {label}
              </span>
              <div className="flex-1">
                <ProgressBar
                  percentage={(coverage[key] ?? 0) * 100}
                  color={CLUSTER_COLORS[key]}
                  height={6}
                />
              </div>
              <span className="w-8 text-right text-[10px] text-muted">
                {Math.round((coverage[key] ?? 0) * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Member strength row                                                 */
/* ------------------------------------------------------------------ */

function MemberStrengthRow({
  profile,
  topics,
  slot,
}: {
  profile: MemberProfile;
  topics: TopicsResponse;
  slot: Slot;
}) {
  const slotLabel =
    slot === "team_a" ? "T1" : slot === "team_b" ? "T2" : "B";
  const slotColor =
    slot === "team_a" ? "#00ffa3" : slot === "team_b" ? "#3b82f6" : "#8888a0";

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2">
      <span
        className="w-6 text-center text-[10px] font-bold"
        style={{ color: slotColor }}
      >
        {slotLabel}
      </span>
      <span className="w-24 truncate text-[12px] font-medium text-foreground">
        {profile.name}
      </span>
      <div className="flex flex-1 gap-px">
        {Object.entries(topics.topics).map(([key, topic]) => {
          const val = profile.strengths[key] ?? 0;
          const tierColor = topics.tier_colors[topic.tier];
          return (
            <div
              key={key}
              className="h-5 flex-1 rounded-sm"
              style={{
                background:
                  val > 0
                    ? tierColor + Math.round(val * 200 + 55).toString(16).padStart(2, "0")
                    : "#1e1e2e",
              }}
              title={`${topic.name}: ${Math.round(val * 100)}%`}
            />
          );
        })}
      </div>
    </div>
  );
}
