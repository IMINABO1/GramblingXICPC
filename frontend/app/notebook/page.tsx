"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useTeam, useTopics, useTags, useMemberNotes, useMemberJournals, useCustomJournalTopics } from "@/lib/hooks";
import { api } from "@/lib/api";
import type { CustomJournalTopic, CustomTag, JournalEntryWithMember, Member, ProblemNote, TopicJournal, Problem } from "@/lib/types";
import { TagPill } from "@/components/tag-pill";
import { NoteEditor } from "@/components/note-editor";
import { JournalEditor } from "@/components/journal-editor";
import { RatingBadge } from "@/components/rating-badge";

const TAG_COLORS = [
  "#00ffa3",
  "#f59e0b",
  "#3b82f6",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export default function Notebook() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-muted">
          <span className="pulse-slow">Loading...</span>
        </div>
      }
    >
      <NotebookContent />
    </Suspense>
  );
}

type Tab = "notes" | "tags" | "journals";

function NotebookContent() {
  const { members, loading: teamLoading } = useTeam();
  const { topics } = useTopics();
  const [selectedMember, setSelectedMember] = useState(0);
  const [tab, setTab] = useState<Tab>("notes");

  if (teamLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        <span className="pulse-slow">Loading...</span>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Notebook</h1>
        <p className="mt-1 text-sm text-muted">
          Personal notes, custom tags, and topic journals with AI-powered problem recommendations
        </p>
      </div>

      {/* Member selector */}
      <div className="flex flex-wrap items-center gap-2">
        {members.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMember(m.id)}
            className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition-all ${
              selectedMember === m.id
                ? "bg-accent text-background"
                : "bg-surface/80 text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["notes", "tags", "journals"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[13px] font-medium capitalize transition-all ${
              tab === t
                ? "border-b-2 border-accent text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "notes" && (
        <NotesTab memberId={selectedMember} />
      )}
      {tab === "tags" && (
        <TagsTab memberId={selectedMember} />
      )}
      {tab === "journals" && (
        <JournalsTab
          memberId={selectedMember}
          members={members}
          topicsData={topics?.topics}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notes Tab                                                          */
/* ------------------------------------------------------------------ */

function NotesTab({ memberId }: { memberId: number }) {
  const { notes, loading, refetch } = useMemberNotes(memberId);
  const [problems, setProblems] = useState<Record<string, Problem>>({});
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  useEffect(() => {
    api.getProblems().then((probs) => {
      const map: Record<string, Problem> = {};
      for (const p of probs) map[p.id] = p;
      setProblems(map);
    });
  }, []);

  if (loading) {
    return <div className="text-[13px] text-muted">Loading notes...</div>;
  }

  if (notes.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface/50 p-8 text-center">
        <p className="text-[14px] text-muted">No notes yet</p>
        <p className="mt-1 text-[12px] text-muted">
          Write notes on problems from the Problems page to track your observations and get similar problem recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => {
        const prob = problems[note.problem_id];
        const expanded = expandedNote === note.id;
        return (
          <div
            key={note.id}
            className="rounded-lg border border-border bg-surface/50 p-4"
          >
            <div
              className="flex cursor-pointer items-center gap-3"
              onClick={() => setExpandedNote(expanded ? null : note.id)}
            >
              {prob && <RatingBadge rating={prob.rating} />}
              <div className="flex-1">
                <span className="text-[13px] font-medium text-foreground">
                  {prob ? prob.name : note.problem_id}
                </span>
                <span className="ml-2 text-[11px] text-muted">
                  {note.problem_id}
                </span>
              </div>
              <span className="text-[10px] text-muted">
                {new Date(note.updated_at).toLocaleDateString()}
              </span>
              <span className="text-[12px] text-muted">
                {expanded ? "\u25B2" : "\u25BC"}
              </span>
            </div>

            {!expanded && (
              <p className="mt-2 truncate text-[12px] text-muted">
                {note.content}
              </p>
            )}

            {expanded && (
              <div className="mt-3">
                <NoteEditor
                  memberId={memberId}
                  problemId={note.problem_id}
                  existingNote={note}
                  onSaved={refetch}
                  onDeleted={refetch}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tags Tab                                                           */
/* ------------------------------------------------------------------ */

function TagsTab({ memberId }: { memberId: number }) {
  const { tags, loading, refetch } = useTags();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [selectedTag, setSelectedTag] = useState<CustomTag | null>(null);
  const [tagProblems, setTagProblems] = useState<string[]>([]);
  const [problems, setProblems] = useState<Record<string, Problem>>({});
  const [loadingProblems, setLoadingProblems] = useState(false);

  useEffect(() => {
    api.getProblems().then((probs) => {
      const map: Record<string, Problem> = {};
      for (const p of probs) map[p.id] = p;
      setProblems(map);
    });
  }, []);

  const selectTag = useCallback(async (tag: CustomTag) => {
    setSelectedTag(tag);
    setLoadingProblems(true);
    try {
      const pids = await api.getTagProblems(tag.id);
      setTagProblems(pids);
    } finally {
      setLoadingProblems(false);
    }
  }, []);

  async function createTag() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.createTag({ name: newName.trim(), color: newColor, created_by: memberId });
      setNewName("");
      refetch();
    } finally {
      setCreating(false);
    }
  }

  async function deleteTag(tagId: string) {
    await api.deleteTag(tagId);
    if (selectedTag?.id === tagId) {
      setSelectedTag(null);
      setTagProblems([]);
    }
    refetch();
  }

  if (loading) {
    return <div className="text-[13px] text-muted">Loading tags...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Create tag form */}
      <div className="rounded-lg border border-border bg-surface/50 p-4">
        <h3 className="mb-2 text-[13px] font-medium text-foreground">Create Tag</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. inversion question, monotonic stack trick..."
            className="flex-1 rounded border border-border bg-background px-3 py-1.5 text-[12px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && createTag()}
          />
          <button
            onClick={createTag}
            disabled={creating || !newName.trim()}
            className="rounded bg-accent px-3 py-1.5 text-[12px] font-medium text-background disabled:opacity-40"
          >
            Create
          </button>
        </div>
        <div className="mt-2 flex gap-1.5">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              className={`h-5 w-5 rounded-full border-2 ${
                newColor === c ? "border-foreground" : "border-transparent"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      {/* Tag list */}
      {tags.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface/50 p-8 text-center">
          <p className="text-[14px] text-muted">No tags created yet</p>
          <p className="mt-1 text-[12px] text-muted">
            Create concept tags to categorize problems by technique or pattern.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div key={tag.id} className="group relative">
              <TagPill
                tag={tag}
                onClick={() => selectTag(tag)}
                removable
                onRemove={() => deleteTag(tag.id)}
              />
              <span className="ml-1 text-[10px] text-muted">
                {tag.problem_count}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Problems with selected tag */}
      {selectedTag && (
        <div className="rounded-lg border border-border bg-surface/50 p-4">
          <h3 className="mb-3 text-[13px] font-medium text-foreground">
            Problems tagged{" "}
            <span style={{ color: selectedTag.color }}>{selectedTag.name}</span>
          </h3>
          {loadingProblems ? (
            <p className="text-[12px] text-muted">Loading...</p>
          ) : tagProblems.length === 0 ? (
            <p className="text-[12px] text-muted">
              No problems have this tag yet. Tag problems from the Problems page.
            </p>
          ) : (
            <div className="space-y-1.5">
              {tagProblems.map((pid) => {
                const prob = problems[pid];
                return (
                  <a
                    key={pid}
                    href={prob?.url ?? `https://codeforces.com/problemset/problem/${pid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-[12px] transition-colors hover:bg-surface-hover"
                  >
                    {prob && <RatingBadge rating={prob.rating} />}
                    <span className="flex-1 text-foreground">
                      {prob ? prob.name : pid}
                    </span>
                    <span className="font-mono text-[10px] text-muted">{pid}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Journals Tab                                                       */
/* ------------------------------------------------------------------ */

const TOPIC_ICONS = [
  "\u{1F4DD}", "\u{1F4A1}", "\u{1F527}", "\u{1F3AF}", "\u{1F9E9}",
  "\u{1F4CA}", "\u{1F680}", "\u{2699}\uFE0F", "\u{1F50D}", "\u{1F4D6}",
];

function JournalsTab({
  memberId,
  members,
  topicsData,
}: {
  memberId: number;
  members: Member[];
  topicsData?: Record<string, { name: string; icon: string; prereqs: string[]; tier: number }>;
}) {
  const { journals, loading, refetch } = useMemberJournals(memberId);
  const { topics: customTopics, refetch: refetchCustom } = useCustomJournalTopics();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedTopicName, setSelectedTopicName] = useState("");
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicIcon, setNewTopicIcon] = useState(TOPIC_ICONS[0]);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<JournalEntryWithMember[] | null>(null);
  const [searching, setSearching] = useState(false);

  const journalMap = new Map<string, TopicJournal>();
  for (const j of journals) journalMap.set(j.topic_id, j);

  const topicEntries = topicsData
    ? Object.entries(topicsData).sort((a, b) => a[1].tier - b[1].tier)
    : [];

  const tierColors = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444"];

  async function createTopic() {
    if (!newTopicName.trim()) return;
    setCreating(true);
    try {
      await api.createCustomJournalTopic({
        name: newTopicName.trim(),
        icon: newTopicIcon,
        created_by: memberId,
      });
      setNewTopicName("");
      setShowCreateTopic(false);
      refetchCustom();
    } finally {
      setCreating(false);
    }
  }

  async function deleteCustomTopic(topicId: string) {
    await api.deleteCustomJournalTopic(topicId);
    refetchCustom();
  }

  function openTopic(topicId: string, topicName: string) {
    setSelectedTopic(topicId);
    setSelectedTopicName(topicName);
  }

  async function runSearch() {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const results = await api.searchJournals(searchQuery.trim());
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  }

  if (loading) {
    return <div className="text-[13px] text-muted">Loading journals...</div>;
  }

  // Topic detail view
  if (selectedTopic) {
    return (
      <TopicJournalView
        topicId={selectedTopic}
        topicName={selectedTopicName}
        memberId={memberId}
        members={members}
        onBack={() => setSelectedTopic(null)}
        onChanged={refetch}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!e.target.value.trim()) setSearchResults(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder="Search journal entries..."
          className="flex-1 rounded border border-border bg-background px-3 py-1.5 text-[12px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={searching || !searchQuery.trim()}
          className="rounded bg-accent px-3 py-1.5 text-[12px] font-medium text-background disabled:opacity-40"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Search results */}
      {searchResults !== null && (
        <div className="rounded-lg border border-border bg-surface/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-medium text-foreground">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
            </h3>
            <button
              type="button"
              onClick={() => { setSearchResults(null); setSearchQuery(""); }}
              className="text-[11px] text-muted hover:text-foreground"
            >
              Clear
            </button>
          </div>
          {searchResults.length === 0 ? (
            <p className="text-[12px] text-muted">No matching entries found.</p>
          ) : (
            <div className="space-y-2">
              {searchResults.map((entry) => {
                const topicName = topicsData?.[entry.topic_id ?? ""]?.name ?? entry.topic_id ?? "Custom";
                return (
                  <div
                    key={entry.id}
                    className="rounded border border-border bg-background px-3 py-2"
                  >
                    <div className="mb-1 flex items-center gap-2 text-[10px] text-muted">
                      <span className="font-medium text-accent">{entry.member_name}</span>
                      <span>&middot;</span>
                      <span>{topicName}</span>
                      <span>&middot;</span>
                      <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                      {entry.score !== undefined && (
                        <>
                          <span>&middot;</span>
                          <span>{Math.round(entry.score * 100)}% match</span>
                        </>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap font-mono text-[12px] text-foreground">
                      {entry.content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create custom topic */}
      {showCreateTopic ? (
        <div className="rounded-lg border border-accent-border bg-surface/50 p-4">
          <h3 className="mb-2 text-[13px] font-medium text-foreground">New Custom Topic</h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="e.g. Segment Trees Edge Cases, DP Optimization Tricks..."
              className="flex-1 rounded border border-border bg-background px-3 py-1.5 text-[12px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && createTopic()}
            />
            <button
              type="button"
              onClick={createTopic}
              disabled={creating || !newTopicName.trim()}
              className="rounded bg-accent px-3 py-1.5 text-[12px] font-medium text-background disabled:opacity-40"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreateTopic(false)}
              className="text-[11px] text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          <div className="mt-2 flex gap-1.5">
            {TOPIC_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setNewTopicIcon(icon)}
                className={`flex h-7 w-7 items-center justify-center rounded text-[16px] ${
                  newTopicIcon === icon
                    ? "bg-accent/20 ring-1 ring-accent"
                    : "hover:bg-surface-hover"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreateTopic(true)}
          className="w-full rounded-lg border border-dashed border-border p-3 text-[12px] text-muted transition-all hover:border-accent hover:text-accent"
        >
          + Create Custom Topic
        </button>
      )}

      {/* Custom topics */}
      {customTopics.length > 0 && (
        <div>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Custom Topics</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customTopics.map((ct) => {
              const journal = journalMap.get(ct.id);
              return (
                <div
                  key={ct.id}
                  className="group relative rounded-lg border border-accent-border/30 bg-surface/50 p-4 text-left transition-all hover:border-accent-border"
                >
                  <button
                    type="button"
                    onClick={() => openTopic(ct.id, ct.name)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[18px]">{ct.icon}</span>
                      <span className="flex-1 text-[13px] font-medium text-foreground">
                        {ct.name}
                      </span>
                      <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">
                        CUSTOM
                      </span>
                    </div>
                    {journal ? (
                      <p className="mt-2 text-[11px] text-accent">
                        {journal.entries.length} {journal.entries.length === 1 ? "entry" : "entries"}
                      </p>
                    ) : (
                      <p className="mt-2 text-[11px] text-muted">No entries yet</p>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCustomTopic(ct.id)}
                    className="absolute right-2 top-2 hidden text-[10px] text-muted hover:text-red-400 group-hover:block"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Predefined topics */}
      <div>
        {customTopics.length > 0 && (
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Training Topics</h3>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topicEntries.map(([topicId, topic]) => {
            const journal = journalMap.get(topicId);
            const tierColor = tierColors[topic.tier];
            return (
              <button
                key={topicId}
                type="button"
                onClick={() => openTopic(topicId, topic.name)}
                className="rounded-lg border border-border bg-surface/50 p-4 text-left transition-all hover:border-border-hover"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[18px]">{topic.icon}</span>
                  <span className="flex-1 text-[13px] font-medium text-foreground">
                    {topic.name}
                  </span>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase"
                    style={{
                      backgroundColor: tierColor + "20",
                      color: tierColor,
                    }}
                  >
                    T{topic.tier}
                  </span>
                </div>
                {journal ? (
                  <p className="mt-2 text-[11px] text-accent">
                    {journal.entries.length} {journal.entries.length === 1 ? "entry" : "entries"}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-muted">No entries yet</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Topic Journal View — multi-member entries with filter + write      */
/* ------------------------------------------------------------------ */

function TopicJournalView({
  topicId,
  topicName,
  memberId,
  members,
  onBack,
  onChanged,
}: {
  topicId: string;
  topicName: string;
  memberId: number;
  members: Member[];
  onBack: () => void;
  onChanged: () => void;
}) {
  const [allEntries, setAllEntries] = useState<JournalEntryWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMember, setFilterMember] = useState<number | "all">("all");
  const [newEntry, setNewEntry] = useState("");
  const [adding, setAdding] = useState(false);
  const [activeJournal, setActiveJournal] = useState<TopicJournal | null>(null);
  const [recommendations, setRecommendations] = useState<import("@/lib/types").NoteRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await api.getTopicAllEntries(topicId);
      setAllEntries(entries);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  const fetchMyJournal = useCallback(async () => {
    const j = await api.getJournal(memberId, topicId);
    setActiveJournal(j);
  }, [memberId, topicId]);

  useEffect(() => {
    fetchEntries();
    fetchMyJournal();
  }, [fetchEntries, fetchMyJournal]);

  async function addEntry() {
    if (!newEntry.trim()) return;
    setAdding(true);
    try {
      await api.addJournalEntry(memberId, topicId, newEntry.trim());
      setNewEntry("");
      await fetchEntries();
      await fetchMyJournal();
      onChanged();
    } finally {
      setAdding(false);
    }
  }

  async function deleteEntry(entryMemberId: number, entryId: string) {
    await api.deleteJournalEntry(entryMemberId, topicId, entryId);
    await fetchEntries();
    await fetchMyJournal();
    onChanged();
  }

  async function findSimilar() {
    if (!activeJournal || activeJournal.entries.length === 0) return;
    setLoadingRecs(true);
    try {
      let recs: import("@/lib/types").NoteRecommendation[];
      try {
        recs = await api.getJournalRecommendations(memberId, topicId);
      } catch {
        recs = await api.getJournalRecommendations(memberId, topicId);
      }
      setRecommendations(recs);
    } finally {
      setLoadingRecs(false);
    }
  }

  const filtered = filterMember === "all"
    ? allEntries
    : allEntries.filter((e) => e.member_id === filterMember);

  // Unique members who have entries
  const contributingMembers = Array.from(
    new Set(allEntries.map((e) => e.member_id))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-[12px] text-muted hover:text-foreground"
        >
          &larr; Back
        </button>
        <h3 className="flex-1 text-[14px] font-medium text-foreground">
          {topicName} Journal
        </h3>
        {activeJournal && activeJournal.entries.length > 0 && (
          <button
            type="button"
            onClick={findSimilar}
            disabled={loadingRecs}
            className="rounded border border-accent-border px-3 py-1 text-[12px] font-medium text-accent disabled:opacity-40"
          >
            {loadingRecs ? "Finding..." : "Find Similar Problems"}
          </button>
        )}
      </div>

      {/* Write new entry */}
      <div className="rounded-lg border border-border bg-surface/50 p-4">
        <p className="mb-2 text-[11px] text-muted">
          Writing as <span className="font-medium text-accent">{members.find((m) => m.id === memberId)?.name ?? `Member ${memberId + 1}`}</span>
        </p>
        <textarea
          value={newEntry}
          onChange={(e) => setNewEntry(e.target.value)}
          placeholder={`Add a tip, strategy, or observation about ${topicName}...`}
          className="w-full resize-y rounded border border-border bg-background px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          rows={3}
        />
        <button
          type="button"
          onClick={addEntry}
          disabled={adding || !newEntry.trim()}
          className="mt-2 rounded bg-accent px-3 py-1 text-[12px] font-medium text-background disabled:opacity-40"
        >
          {adding ? "Adding..." : "Add Entry"}
        </button>
      </div>

      {/* Member filter */}
      {contributingMembers.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted">Filter:</span>
          <button
            type="button"
            onClick={() => setFilterMember("all")}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all ${
              filterMember === "all"
                ? "bg-accent text-background"
                : "bg-surface text-muted hover:text-foreground"
            }`}
          >
            All ({allEntries.length})
          </button>
          {contributingMembers.map((mid) => {
            const m = members.find((mm) => mm.id === mid);
            const count = allEntries.filter((e) => e.member_id === mid).length;
            return (
              <button
                key={mid}
                type="button"
                onClick={() => setFilterMember(mid)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                  filterMember === mid
                    ? "bg-accent text-background"
                    : "bg-surface text-muted hover:text-foreground"
                }`}
              >
                {m?.name ?? `Member ${mid + 1}`} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Entries list */}
      {loading ? (
        <p className="text-[12px] text-muted">Loading entries...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface/50 p-6 text-center">
          <p className="text-[13px] text-muted">No entries yet for this topic.</p>
          <p className="mt-1 text-[11px] text-muted">Be the first to write about {topicName}!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="rounded border border-border bg-surface/50 px-3 py-2"
            >
              <div className="mb-1 flex items-center gap-2 text-[10px] text-muted">
                <span
                  className={`font-medium ${
                    entry.member_id === memberId ? "text-accent" : "text-foreground"
                  }`}
                >
                  {entry.member_name}
                </span>
                <span>&middot;</span>
                <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                {entry.member_id === memberId && (
                  <button
                    type="button"
                    onClick={() => deleteEntry(entry.member_id, entry.id)}
                    className="ml-auto text-[10px] text-muted hover:text-red-400"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap font-mono text-[12px] text-foreground">
                {entry.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-lg border border-border bg-surface/50 p-4">
          <h4 className="mb-2 text-[12px] font-medium text-foreground">
            Similar Problems
          </h4>
          <div className="space-y-1.5">
            {recommendations.map((rec) => (
              <a
                key={rec.id}
                href={rec.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded px-2 py-1.5 text-[12px] transition-colors hover:bg-surface-hover"
              >
                <RatingBadge rating={rec.rating} />
                <span className="flex-1 text-foreground">{rec.name}</span>
                <span className="font-mono text-[10px] text-muted">
                  {Math.round(rec.impact * 100)}%
                </span>
                {rec.curated && (
                  <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] text-accent">
                    curated
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
      {loadingRecs && (
        <p className="text-[12px] text-muted">Finding similar problems...</p>
      )}
    </div>
  );
}
