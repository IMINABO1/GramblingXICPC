"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { NoteRecommendation, TopicJournal } from "@/lib/types";
import { NoteRecommendations } from "./note-recommendations";

interface JournalEditorProps {
  memberId: number;
  topicId: string;
  topicName: string;
  journal: TopicJournal | null;
  onChanged: () => void;
}

export function JournalEditor({
  memberId,
  topicId,
  topicName,
  journal,
  onChanged,
}: JournalEditorProps) {
  const [newEntry, setNewEntry] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [recommendations, setRecommendations] = useState<NoteRecommendation[]>(
    [],
  );
  const [loadingRecs, setLoadingRecs] = useState(false);

  async function addEntry() {
    if (!newEntry.trim()) return;
    setAdding(true);
    try {
      await api.addJournalEntry(memberId, topicId, newEntry.trim());
      setNewEntry("");
      onChanged();
    } finally {
      setAdding(false);
    }
  }

  async function saveEdit(entryId: string) {
    if (!editContent.trim()) return;
    await api.editJournalEntry(memberId, topicId, entryId, editContent.trim());
    setEditingId(null);
    onChanged();
  }

  async function deleteEntry(entryId: string) {
    await api.deleteJournalEntry(memberId, topicId, entryId);
    onChanged();
  }

  async function findSimilar() {
    setLoadingRecs(true);
    try {
      const recs = await api.getJournalRecommendations(memberId, topicId);
      setRecommendations(recs);
    } finally {
      setLoadingRecs(false);
    }
  }

  const entries = journal?.entries ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[14px] font-medium text-foreground">
          {topicName} Journal
        </h3>
        {entries.length > 0 && (
          <button
            onClick={findSimilar}
            disabled={loadingRecs}
            className="rounded border border-accent-border px-3 py-1 text-[12px] font-medium text-accent disabled:opacity-40"
          >
            Find Similar Problems
          </button>
        )}
      </div>

      {entries.length > 0 && (
        <div className="mb-4 space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded border border-border bg-surface px-3 py-2"
            >
              {editingId === entry.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full resize-y rounded border border-border bg-background px-2 py-1.5 font-mono text-[12px] text-foreground focus:border-accent focus:outline-none"
                    rows={3}
                  />
                  <div className="mt-1.5 flex gap-2">
                    <button
                      onClick={() => saveEdit(entry.id)}
                      className="rounded bg-accent px-2 py-0.5 text-[11px] font-medium text-background"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-[11px] text-muted hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="whitespace-pre-wrap font-mono text-[12px] text-foreground">
                    {entry.content}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="text-[10px] text-muted">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => {
                        setEditingId(entry.id);
                        setEditContent(entry.content);
                      }}
                      className="text-[10px] text-muted hover:text-foreground"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-[10px] text-muted hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <textarea
          value={newEntry}
          onChange={(e) => setNewEntry(e.target.value)}
          placeholder={`Add a tip, strategy, or observation about ${topicName}...`}
          className="w-full resize-y rounded border border-border bg-background px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          rows={3}
        />
        <button
          onClick={addEntry}
          disabled={adding || !newEntry.trim()}
          className="mt-2 rounded bg-accent px-3 py-1 text-[12px] font-medium text-background disabled:opacity-40"
        >
          {adding ? "Adding..." : "Add Entry"}
        </button>
      </div>

      <NoteRecommendations
        recommendations={recommendations}
        loading={loadingRecs}
      />
    </div>
  );
}
