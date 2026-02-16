"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { Member, Problem, TopicsResponse } from "@/lib/types";
import { ProgressBar } from "./progress-bar";

interface MemberCardProps {
  member: Member;
  problems: Problem[];
  topics: TopicsResponse;
  onUpdated: () => void;
}

export function MemberCard({
  member,
  problems,
  topics,
  onUpdated,
}: MemberCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.name);
  const [handle, setHandle] = useState(member.cf_handle ?? "");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [lcHandle, setLcHandle] = useState(member.lc_handle ?? "");
  const [lcSyncing, setLcSyncing] = useState(false);
  const [lcSyncMsg, setLcSyncMsg] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [toggling, setToggling] = useState(false);

  const solvedSet = new Set(member.solved_curated);
  const totalProblems = problems.length;
  const pct =
    totalProblems > 0
      ? Math.round((member.solved_count / totalProblems) * 100)
      : 0;

  // Compute top 3 topics for this member
  const topicCounts: Record<string, number> = {};
  for (const p of problems) {
    if (solvedSet.has(p.id)) {
      topicCounts[p.topic] = (topicCounts[p.topic] || 0) + 1;
    }
  }
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  async function saveName() {
    if (!name.trim()) return;
    await api.updateMember(member.id, { name: name.trim() });
    setEditing(false);
    onUpdated();
  }

  async function saveHandle() {
    await api.updateMember(member.id, { cf_handle: handle.trim() || "" });
    onUpdated();
  }

  async function sync() {
    if (!member.cf_handle) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await api.syncMember(member.id);
      const count = result.new_solved.length;
      setSyncMsg(
        count > 0
          ? `+${count} new problem${count > 1 ? "s" : ""} synced!`
          : "Already up to date",
      );
      onUpdated();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      setSyncMsg(msg);
    } finally {
      setSyncing(false);
    }
  }

  async function saveLcHandle() {
    await api.updateMember(member.id, { lc_handle: lcHandle.trim() || "" });
    onUpdated();
  }

  async function toggleActive() {
    setToggling(true);
    try {
      await api.toggleMemberActive(member.id, !member.active);
      onUpdated();
    } catch {
      // silently fail
    } finally {
      setToggling(false);
    }
  }

  async function removeMember() {
    try {
      await api.removeMember(member.id);
      onUpdated();
    } catch {
      // silently fail
    }
  }

  async function syncLC() {
    if (!member.lc_handle) return;
    setLcSyncing(true);
    setLcSyncMsg(null);
    try {
      const result = await api.syncMemberLC(member.id);
      setLcSyncMsg(
        `LC synced: ${result.total_lc_solved} solved (${result.easy}E/${result.medium}M/${result.hard}H)`,
      );
      onUpdated();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "LC sync failed";
      setLcSyncMsg(msg);
    } finally {
      setLcSyncing(false);
    }
  }

  return (
    <div className={`rounded-lg border border-border bg-surface p-4 transition-opacity ${!member.active ? "opacity-50" : ""}`}>
      {/* Header: name + edit + controls */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-accent-border"
                autoFocus
              />
              <button
                onClick={saveName}
                className="text-[11px] text-accent hover:underline"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setName(member.name);
                }}
                className="text-[11px] text-muted hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <span className="font-heading text-sm font-semibold">
                {member.name}
              </span>
              <button
                onClick={() => setEditing(true)}
                className="text-[11px] text-muted hover:text-foreground"
              >
                Edit
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleActive}
            disabled={toggling}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-all ${
              member.active
                ? "bg-accent/10 text-accent"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {member.active ? "Active" : "Inactive"}
          </button>
          {confirmRemove ? (
            <div className="flex items-center gap-1">
              <button
                onClick={removeMember}
                className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/30"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmRemove(false)}
                className="text-[10px] text-muted hover:text-foreground"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmRemove(true)}
              className="text-[10px] text-muted hover:text-red-400"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* CF Handle */}
      <div className="mb-3 flex items-center gap-2">
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onBlur={saveHandle}
          onKeyDown={(e) => e.key === "Enter" && saveHandle()}
          placeholder="CF handle"
          className="w-36 rounded border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-accent-border"
        />
        <button
          onClick={sync}
          disabled={!member.cf_handle || syncing}
          className="rounded border border-accent-border bg-accent-dim px-2 py-1 text-[11px] text-accent transition-all hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {syncing ? "Syncing..." : "Sync"}
        </button>
      </div>

      {syncMsg && (
        <div className="mb-2 text-[11px] text-accent">{syncMsg}</div>
      )}

      {/* LC Handle */}
      <div className="mb-3 flex items-center gap-2">
        <input
          value={lcHandle}
          onChange={(e) => setLcHandle(e.target.value)}
          onBlur={saveLcHandle}
          onKeyDown={(e) => e.key === "Enter" && saveLcHandle()}
          placeholder="LC handle (optional)"
          className="w-36 rounded border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-yellow-500/50"
        />
        <button
          onClick={syncLC}
          disabled={!member.lc_handle || lcSyncing}
          className="rounded border border-yellow-500/20 bg-yellow-500/5 px-2 py-1 text-[11px] text-yellow-400 transition-all hover:bg-yellow-500/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {lcSyncing ? "Syncing..." : "LC Sync"}
        </button>
      </div>

      {lcSyncMsg && (
        <div className="mb-2 text-[11px] text-yellow-400">{lcSyncMsg}</div>
      )}

      {member.lc_total_solved > 0 && (
        <div className="mb-2 text-[11px] text-muted">
          LC: {member.lc_total_solved} solved
        </div>
      )}

      {/* Progress */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[12px] text-muted">
          {member.solved_count}/{totalProblems} solved
        </span>
        <span className="text-[12px] font-medium text-accent">{pct}%</span>
      </div>
      <ProgressBar percentage={pct} />

      {/* Last synced */}
      {member.last_synced && (
        <div className="mt-2 text-[10px] text-dim">
          Last synced:{" "}
          {new Date(member.last_synced).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}

      {/* Top topics */}
      {topTopics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {topTopics.map(([key, count]) => {
            const t = topics.topics[key];
            if (!t) return null;
            const color = topics.tier_colors[t.tier];
            return (
              <span
                key={key}
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{ color, background: color + "15" }}
              >
                {t.icon} {t.name} ({count})
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
