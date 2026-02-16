"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useProblems, useTopics, useTeam, useTags } from "@/lib/hooks";
import { api } from "@/lib/api";
import type { CustomTag, ProblemNote, SolveQualityResponse } from "@/lib/types";
import { RatingBadge } from "@/components/rating-badge";
import { RecommendationsPanel } from "@/components/recommendations-panel";
import { ReviewPanel } from "@/components/review-panel";
import { EditorialButton } from "@/components/editorial-button";
import { TagPill } from "@/components/tag-pill";
import { TagManager } from "@/components/tag-manager";
import { NoteEditor } from "@/components/note-editor";
import { exportProblemsCSV } from "@/lib/export-csv";

type TabView = "browse" | "recommended" | "review";

export default function Problems() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-muted">
          <span className="pulse-slow">Loading...</span>
        </div>
      }
    >
      <ProblemsContent />
    </Suspense>
  );
}

function ProblemsContent() {
  const searchParams = useSearchParams();
  const initialTopic = searchParams.get("topic") || "";

  const { problems, loading: pLoading } = useProblems();
  const { topics, loading: tLoading } = useTopics();
  const { members, loading: mLoading } = useTeam();

  const { tags, refetch: refetchTags } = useTags();

  const [activeTab, setActiveTab] = useState<TabView>("browse");
  const [selectedTopic, setSelectedTopic] = useState(initialTopic);
  const [minRating, setMinRating] = useState(0);
  const [maxRating, setMaxRating] = useState(3000);
  const [selectedMember, setSelectedMember] = useState(0);
  const [memberNotes, setMemberNotes] = useState<ProblemNote[]>([]);
  const [problemTagMap, setProblemTagMap] = useState<Record<string, string[]>>({});
  const [taggingProblem, setTaggingProblem] = useState<string | null>(null);
  const [noteProblem, setNoteProblem] = useState<string | null>(null);
  const [noteForEdit, setNoteForEdit] = useState<ProblemNote | null>(null);
  const [solveQuality, setSolveQuality] = useState<SolveQualityResponse | null>(null);

  // Load member notes and all problem-tag mappings
  const fetchMemberNotes = useCallback(() => {
    api.getMemberNotes(selectedMember).then(setMemberNotes).catch(() => {});
  }, [selectedMember]);

  const fetchSolveQuality = useCallback(() => {
    api.getSolveQuality(selectedMember).then(setSolveQuality).catch(() => {});
  }, [selectedMember]);

  useEffect(() => {
    fetchMemberNotes();
    fetchSolveQuality();
  }, [fetchMemberNotes, fetchSolveQuality]);

  async function toggleEditorial(problemId: string) {
    if (!solveQuality) return;
    const isCurrentlyFlagged = problemId in (solveQuality.editorial_flags ?? {});
    try {
      if (isCurrentlyFlagged) {
        await api.unflagEditorial(selectedMember, problemId);
      } else {
        await api.flagEditorial(selectedMember, problemId, "cf");
      }
      fetchSolveQuality();
    } catch { /* ignore */ }
  }

  // Build note lookup
  const noteByProblem = useMemo(() => {
    const map = new Map<string, ProblemNote>();
    for (const n of memberNotes) map.set(n.problem_id, n);
    return map;
  }, [memberNotes]);

  // Load problem-tag mappings from tags data
  useEffect(() => {
    // Rebuild problem_tags from individual tag.problem_count data
    // We need the raw tags.json data, so fetch all tags and their problems
    async function loadProblemTags() {
      const map: Record<string, string[]> = {};
      for (const tag of tags) {
        if (tag.problem_count > 0) {
          try {
            const pids = await api.getTagProblems(tag.id);
            for (const pid of pids) {
              if (!map[pid]) map[pid] = [];
              map[pid].push(tag.id);
            }
          } catch { /* ignore */ }
        }
      }
      setProblemTagMap(map);
    }
    if (tags.length > 0) loadProblemTags();
    else setProblemTagMap({});
  }, [tags]);

  const tagMap = useMemo(() => {
    const m = new Map<string, CustomTag>();
    for (const t of tags) m.set(t.id, t);
    return m;
  }, [tags]);

  function handleTagsChanged() {
    refetchTags();
    setTaggingProblem(null);
  }

  function openNote(problemId: string) {
    const existing = noteByProblem.get(problemId) ?? null;
    setNoteForEdit(existing);
    setNoteProblem(problemId);
  }

  const loading = pLoading || tLoading || mLoading;

  // Build member solved sets for fast lookup
  const memberSolvedSets = useMemo(() => {
    return members.map((m) => new Set(m.solved_curated));
  }, [members]);

  // Filter problems
  const filtered = useMemo(() => {
    return problems
      .filter((p) => {
        if (selectedTopic && p.topic !== selectedTopic) return false;
        if (p.rating < minRating || p.rating > maxRating) return false;
        return true;
      })
      .sort((a, b) => a.rating - b.rating);
  }, [problems, selectedTopic, minRating, maxRating]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        <span className="pulse-slow">Loading...</span>
      </div>
    );
  }

  if (!topics) return null;

  const topicEntries = Object.entries(topics.topics).sort(
    (a, b) => a[1].tier - b[1].tier,
  );

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Problems</h1>
        <p className="mt-1 text-sm text-muted">
          {activeTab === "browse"
            ? `${filtered.length} of ${problems.length} problems`
            : activeTab === "recommended"
              ? "Personalized problem suggestions"
              : "Spaced repetition review queue"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(
          [
            ["browse", "Browse"],
            ["recommended", "Recommended"],
            ["review", "Review"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-4 py-2 text-[13px] font-medium transition-all ${
              activeTab === tab
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Browse Tab */}
      {activeTab === "browse" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
        <select
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] text-foreground outline-none focus:border-accent-border"
        >
          <option value="">All Topics</option>
          {topicEntries.map(([key, t]) => (
            <option key={key} value={key}>
              {t.icon} {t.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 text-[12px] text-muted">
          <span>Rating:</span>
          <input
            type="number"
            value={minRating || ""}
            onChange={(e) => setMinRating(Number(e.target.value) || 0)}
            placeholder="Min"
            className="w-16 rounded border border-border bg-surface px-2 py-1 text-[12px] text-foreground outline-none focus:border-accent-border"
          />
          <span>&ndash;</span>
          <input
            type="number"
            value={maxRating === 3000 ? "" : maxRating}
            onChange={(e) => setMaxRating(Number(e.target.value) || 3000)}
            placeholder="Max"
            className="w-16 rounded border border-border bg-surface px-2 py-1 text-[12px] text-foreground outline-none focus:border-accent-border"
          />
        </div>

        <button
          type="button"
          onClick={() =>
            exportProblemsCSV(filtered, members, memberSolvedSets, topics!, {
              topic: selectedTopic,
              minRating,
              maxRating,
            })
          }
          className="ml-auto flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-accent-border hover:text-foreground"
          title="Export filtered problems to CSV"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Member legend — hidden on mobile */}
      <div className="hidden flex-wrap items-center gap-2 text-[11px] text-muted sm:flex">
        <span>Members:</span>
        {members.map((m, idx) => (
          <span
            key={m.id}
            className="rounded border border-border px-1.5 py-0.5"
            title={m.name}
          >
            {idx + 1}. {m.name?.split(" ")[0] ?? "?"}
          </span>
        ))}
      </div>

      {/* Problem list */}
      <div className="space-y-1">
        {filtered.map((problem) => {
          const solvedBy = memberSolvedSets.filter((s) =>
            s.has(problem.id),
          ).length;

          return (
            <div key={problem.id}>
            <div
              className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-all hover:border-border hover:bg-surface"
            >
              {/* Per-member solved indicators — hidden on mobile */}
              <div className="hidden gap-1 sm:flex">
                {members.map((m, idx) => {
                  const solved = memberSolvedSets[idx].has(problem.id);
                  return (
                    <div
                      key={m.id}
                      className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 text-[10px] ${
                        solved
                          ? "border-accent bg-accent text-background"
                          : "border-border-hover bg-transparent"
                      }`}
                      title={`${m.name}${solved ? " ✓" : ""}`}
                    >
                      {solved && "✓"}
                    </div>
                  );
                })}
              </div>

              {/* Problem info */}
              <RatingBadge rating={problem.rating} />
              <a
                href={problem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-foreground transition-colors hover:text-accent"
              >
                {problem.name}
              </a>

              {/* Custom tags */}
              {(problemTagMap[problem.id] ?? []).map((tid) => {
                const tag = tagMap.get(tid);
                return tag ? <TagPill key={tid} tag={tag} /> : null;
              })}

              {/* Tag + Note actions */}
              <div className="relative ml-auto flex items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTaggingProblem(taggingProblem === problem.id ? null : problem.id);
                    setNoteProblem(null);
                  }}
                  className="rounded px-1 py-0.5 text-[10px] text-muted hover:text-foreground"
                  title="Manage tags"
                >
                  #
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openNote(problem.id);
                    setTaggingProblem(null);
                  }}
                  className={`rounded px-1 py-0.5 text-[10px] ${
                    noteByProblem.has(problem.id)
                      ? "text-accent"
                      : "text-muted hover:text-foreground"
                  }`}
                  title={noteByProblem.has(problem.id) ? "Edit note" : "Add note"}
                >
                  {noteByProblem.has(problem.id) ? "\u270E" : "\u270D"}
                </button>
                {memberSolvedSets[selectedMember]?.has(problem.id) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEditorial(problem.id);
                    }}
                    className={`rounded px-1 py-0.5 text-[10px] ${
                      solveQuality?.editorial_flags?.[problem.id]
                        ? "text-yellow-400"
                        : "text-muted hover:text-foreground"
                    }`}
                    title={
                      solveQuality?.editorial_flags?.[problem.id]
                        ? "Unmark editorial (click to toggle)"
                        : "Mark as used editorial"
                    }
                  >
                    {solveQuality?.editorial_flags?.[problem.id] ? "\uD83D\uDCD6" : "\uD83D\uDCD5"}
                  </button>
                )}

                {taggingProblem === problem.id && (
                  <TagManager
                    problemId={problem.id}
                    currentTagIds={problemTagMap[problem.id] ?? []}
                    allTags={tags}
                    memberId={selectedMember}
                    onChanged={handleTagsChanged}
                  />
                )}
              </div>

              {/* Editorial button */}
              <EditorialButton problemId={problem.id} />

              {/* Topic tag (when showing all topics) — hidden on small screens */}
              {!selectedTopic && topics.topics[problem.topic] && (
                <span
                  className="hidden rounded px-1.5 py-0.5 text-[10px] lg:inline"
                  style={{
                    color:
                      topics.tier_colors[topics.topics[problem.topic].tier],
                    background:
                      topics.tier_bg[topics.topics[problem.topic].tier],
                  }}
                >
                  {topics.topics[problem.topic].icon}{" "}
                  {topics.topics[problem.topic].name}
                </span>
              )}

              {/* Solved count */}
              <span className="min-w-[32px] text-right text-[11px] text-muted">
                {solvedBy}/{members.length}
              </span>
            </div>

            {/* Inline note editor */}
            {noteProblem === problem.id && (
              <div className="rounded-lg border border-border bg-surface/50 px-4 py-3">
                <NoteEditor
                  memberId={selectedMember}
                  problemId={problem.id}
                  existingNote={noteForEdit}
                  onSaved={() => {
                    fetchMemberNotes();
                  }}
                  onDeleted={() => {
                    setNoteProblem(null);
                    fetchMemberNotes();
                  }}
                />
              </div>
            )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted">
            No problems match the current filters.
          </div>
        )}
      </div>
        </>
      )}

      {/* Recommended Tab */}
      {activeTab === "recommended" && (
        <div className="rounded-lg border border-border bg-surface/50 p-6">
          <RecommendationsPanel members={members} limit={20} />
        </div>
      )}

      {/* Review Tab */}
      {activeTab === "review" && <ReviewPanel />}
    </div>
  );
}
