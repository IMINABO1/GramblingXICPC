"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { CustomTag } from "@/lib/types";
import { TagPill } from "./tag-pill";

const TAG_COLORS = [
  "#e0aa0f",
  "#f59e0b",
  "#3b82f6",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

interface TagManagerProps {
  problemId: string;
  currentTagIds: string[];
  allTags: CustomTag[];
  memberId: number;
  onChanged: () => void;
}

export function TagManager({
  problemId,
  currentTagIds,
  allTags,
  memberId,
  onChanged,
}: TagManagerProps) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const currentSet = new Set(currentTagIds);

  async function toggleTag(tagId: string) {
    if (currentSet.has(tagId)) {
      await api.removeProblemTag(problemId, tagId);
    } else {
      await api.addProblemTags(problemId, [tagId]);
    }
    onChanged();
  }

  async function createTag() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const tag = await api.createTag({
        name: newName.trim(),
        color: newColor,
        created_by: memberId,
      });
      await api.addProblemTags(problemId, [tag.id]);
      setNewName("");
      onChanged();
    } finally {
      setCreating(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted hover:border-border-hover hover:text-foreground"
      >
        + tag
      </button>
    );
  }

  return (
    <div className="absolute z-20 mt-1 w-64 rounded-lg border border-border bg-surface p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-medium text-foreground">Tags</span>
        <button
          onClick={() => setOpen(false)}
          className="text-[11px] text-muted hover:text-foreground"
        >
          &times;
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {allTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={`rounded-full border px-2 py-0.5 text-[11px] transition-all ${
                currentSet.has(tag.id) ? "opacity-100" : "opacity-40 hover:opacity-70"
              }`}
              style={{
                color: tag.color,
                borderColor: tag.color + "40",
                background: currentSet.has(tag.id) ? tag.color + "18" : "transparent",
              }}
            >
              {currentSet.has(tag.id) ? "\u2713 " : ""}
              {tag.name}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-2">
        <div className="flex gap-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New tag name..."
            className="flex-1 rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && createTag()}
          />
          <button
            onClick={createTag}
            disabled={creating || !newName.trim()}
            className="rounded bg-accent px-2 py-1 text-[11px] font-medium text-background disabled:opacity-40"
          >
            Add
          </button>
        </div>
        <div className="mt-1.5 flex gap-1">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              className={`h-4 w-4 rounded-full border-2 ${
                newColor === c ? "border-foreground" : "border-transparent"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
