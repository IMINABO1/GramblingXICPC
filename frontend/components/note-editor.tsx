"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { NoteRecommendation, ProblemNote } from "@/lib/types";
import { NoteRecommendations } from "./note-recommendations";

interface NoteEditorProps {
  memberId: number;
  problemId: string;
  existingNote: ProblemNote | null;
  onSaved: () => void;
  onDeleted?: () => void;
}

export function NoteEditor({
  memberId,
  problemId,
  existingNote,
  onSaved,
  onDeleted,
}: NoteEditorProps) {
  const [content, setContent] = useState(existingNote?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [recommendations, setRecommendations] = useState<NoteRecommendation[]>(
    [],
  );
  const [loadingRecs, setLoadingRecs] = useState(false);

  const dirty = content !== (existingNote?.content ?? "");

  async function save() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await api.saveNote({
        member_id: memberId,
        problem_id: problemId,
        content: content.trim(),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function findSimilar() {
    setLoadingRecs(true);
    try {
      // Save first if there are unsaved changes
      if (dirty && content.trim()) {
        await api.saveNote({
          member_id: memberId,
          problem_id: problemId,
          content: content.trim(),
        });
        onSaved();
      }
      // Retry once on failure (handles cold-start model loading timeout)
      let recs: NoteRecommendation[];
      try {
        recs = await api.getNoteRecommendations(memberId, problemId);
      } catch {
        recs = await api.getNoteRecommendations(memberId, problemId);
      }
      setRecommendations(recs);
    } finally {
      setLoadingRecs(false);
    }
  }

  async function remove() {
    if (!existingNote) return;
    await api.deleteNote(existingNote.id);
    setContent("");
    setRecommendations([]);
    onDeleted?.();
  }

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your observations about this problem... What was the key insight? What technique did you use?"
        className="w-full resize-y rounded border border-border bg-background px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        rows={4}
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving || !content.trim() || !dirty}
          className="rounded bg-accent px-3 py-1 text-[12px] font-medium text-background disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save Note"}
        </button>
        {existingNote && (
          <button
            onClick={findSimilar}
            disabled={loadingRecs || content.trim().length < 10}
            className="rounded border border-accent-border px-3 py-1 text-[12px] font-medium text-accent disabled:opacity-40"
          >
            Find Similar Problems
          </button>
        )}
        {existingNote && onDeleted && (
          <button
            onClick={remove}
            className="ml-auto text-[11px] text-muted hover:text-red-400"
          >
            Delete
          </button>
        )}
      </div>
      <NoteRecommendations
        recommendations={recommendations}
        loading={loadingRecs}
      />
    </div>
  );
}
