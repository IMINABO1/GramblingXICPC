"use client";

import { useState } from "react";
import { useProblems, useTopics, useTeam } from "@/lib/hooks";
import { api } from "@/lib/api";
import { MemberCard } from "@/components/member-card";
import { TeamComposition } from "@/components/team-composition";

export default function Team() {
  const { problems, loading: pLoading } = useProblems();
  const { topics, loading: tLoading } = useTopics();
  const { members, loading: mLoading, refetch } = useTeam();
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncAllMsg, setSyncAllMsg] = useState<string | null>(null);
  const [syncingAllLC, setSyncingAllLC] = useState(false);
  const [syncAllLCMsg, setSyncAllLCMsg] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCfHandle, setNewCfHandle] = useState("");
  const [newLcHandle, setNewLcHandle] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const loading = pLoading || tLoading || mLoading;

  async function handleSyncAll() {
    setSyncingAll(true);
    setSyncAllMsg(null);
    try {
      const results = await api.syncAll();
      const totalNew = results.reduce(
        (sum, r) => sum + (r.new_solved?.length ?? 0),
        0,
      );
      setSyncAllMsg(
        totalNew > 0
          ? `Synced ${results.length} member${results.length > 1 ? "s" : ""}: +${totalNew} new problem${totalNew > 1 ? "s" : ""}`
          : `Synced ${results.length} member${results.length > 1 ? "s" : ""}: all up to date`,
      );
      refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      setSyncAllMsg(msg);
    } finally {
      setSyncingAll(false);
    }
  }

  async function handleAddMember() {
    if (!newName.trim()) return;
    setAddingMember(true);
    try {
      await api.addMember({
        name: newName.trim(),
        cf_handle: newCfHandle.trim() || undefined,
        lc_handle: newLcHandle.trim() || undefined,
      });
      setShowAddForm(false);
      setNewName("");
      setNewCfHandle("");
      setNewLcHandle("");
      refetch();
    } catch {
      // silently fail
    } finally {
      setAddingMember(false);
    }
  }

  async function handleSyncAllLC() {
    setSyncingAllLC(true);
    setSyncAllLCMsg(null);
    try {
      const results = await api.syncAllLC();
      const total = results.reduce((s, r) => s + (r.total_lc_solved ?? 0), 0);
      setSyncAllLCMsg(
        `LC synced for ${results.length} member${results.length > 1 ? "s" : ""}: ${total} total problems`,
      );
      refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "LC sync failed";
      setSyncAllLCMsg(msg);
    } finally {
      setSyncingAllLC(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        <span className="pulse-slow">Loading...</span>
      </div>
    );
  }

  if (!topics) return null;

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Team</h1>
          <p className="mt-1 text-sm text-muted">
            {members.length} members &middot; Set CF handles to sync progress
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="rounded-md border border-accent-border bg-accent-dim px-4 py-2 text-[13px] font-medium text-accent transition-all hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {syncingAll ? "Syncing..." : "Sync All CF"}
          </button>
          <button
            onClick={handleSyncAllLC}
            disabled={syncingAllLC}
            className="rounded-md border border-yellow-500/20 bg-yellow-500/5 px-4 py-2 text-[13px] font-medium text-yellow-400 transition-all hover:bg-yellow-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {syncingAllLC ? "Syncing..." : "Sync All LC"}
          </button>
        </div>
      </div>

      {syncAllMsg && (
        <div className="rounded-md border border-accent-border bg-accent-dim px-3 py-2 text-[12px] text-accent">
          {syncAllMsg}
        </div>
      )}

      {syncAllLCMsg && (
        <div className="rounded-md border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-[12px] text-yellow-400">
          {syncAllLCMsg}
        </div>
      )}

      {/* Team Composition Analyzer */}
      <TeamComposition />

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Team Members
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-md border border-accent-border bg-accent-dim px-3 py-1.5 text-[12px] font-medium text-accent transition-all hover:bg-accent/10"
          >
            + Add Member
          </button>
        </div>

        {showAddForm && (
          <div className="mb-4 rounded-lg border border-accent-border bg-surface p-4">
            <h3 className="mb-3 text-sm font-medium text-foreground">New Member</h3>
            <div className="flex flex-wrap gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                className="rounded border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-accent-border"
                autoFocus
              />
              <input
                value={newCfHandle}
                onChange={(e) => setNewCfHandle(e.target.value)}
                placeholder="CF handle (optional)"
                className="rounded border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-accent-border"
              />
              <input
                value={newLcHandle}
                onChange={(e) => setNewLcHandle(e.target.value)}
                placeholder="LC handle (optional)"
                className="rounded border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-accent-border"
              />
              <button
                onClick={handleAddMember}
                disabled={!newName.trim() || addingMember}
                className="rounded border border-accent-border bg-accent-dim px-3 py-1 text-[12px] text-accent transition-all hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {addingMember ? "Adding..." : "Add"}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewName("");
                  setNewCfHandle("");
                  setNewLcHandle("");
                }}
                className="rounded px-3 py-1 text-[12px] text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <MemberCard
            key={m.id}
            member={m}
            problems={problems}
            topics={topics}
            onUpdated={refetch}
          />
        ))}
        </div>
      </div>
    </div>
  );
}
