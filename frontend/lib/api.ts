import type {
  Problem,
  TopicsResponse,
  Member,
  SyncResult,
  SyncAllResult,
  LCSyncResult,
  GraphMeta,
  GraphNeighbor,
  CuratedSubgraph,
  CosmosData,
  ComposeResponse,
  VirtualContest,
  ContestCreatePayload,
  ContestUpdatePayload,
  TrendsResponse,
  CFContestInfo,
  UpsolveQueueResponse,
  UpsolveStatsResponse,
  RecommendationsResponse,
  ReviewTopicsResponse,
  ReviewStatsResponse,
  RegionalsResponse,
  RegionalRecommendationsResponse,
  RegionalContest,
  Editorial,
  BulkEditorialsResponse,
  LeaderboardResponse,
  WeeklySummaryResponse,
  CustomTag,
  ProblemNote,
  TopicJournal,
  NoteRecommendation,
  CustomJournalTopic,
  JournalEntryWithMember,
  SolveQualityResponse,
  ComboStats,
  ComboRanking,
  SuggestResponse,
  ComboTimelineResponse,
} from "./types";

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/** Split a problem ID like "1A" or "1352C2" into contestId + index for the graph API */
export function parseProblemId(id: string): {
  contestId: number;
  index: string;
} {
  const match = id.match(/^(\d+)([A-Za-z]\d*)$/);
  if (!match) {
    throw new Error(`Invalid problem ID format: ${id}`);
  }
  return { contestId: Number(match[1]), index: match[2] };
}

export const api = {
  health: () => fetchJSON<{ status: string }>("/api/health"),

  getProblems: () => fetchJSON<Problem[]>("/api/problems/"),

  getTopics: () => fetchJSON<TopicsResponse>("/api/problems/topics"),

  getTeam: () => fetchJSON<Member[]>("/api/team/"),

  getMember: (id: number) => fetchJSON<Member>(`/api/team/${id}`),

  updateMember: (id: number, data: { name?: string; cf_handle?: string; lc_handle?: string }) =>
    fetchJSON<Member>(`/api/team/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  syncMember: (id: number) =>
    fetchJSON<SyncResult>(`/api/team/${id}/sync`, { method: "POST" }),

  syncAll: () =>
    fetchJSON<SyncAllResult[]>("/api/team/sync-all", { method: "POST" }),

  syncMemberLC: (id: number) =>
    fetchJSON<LCSyncResult>(`/api/team/${id}/sync-lc`, { method: "POST" }),

  syncAllLC: () =>
    fetchJSON<LCSyncResult[]>("/api/team/sync-all-lc", { method: "POST" }),

  getGraphMeta: () => fetchJSON<GraphMeta>("/api/graph/"),

  getCuratedSubgraph: () =>
    fetchJSON<CuratedSubgraph>("/api/graph/curated-subgraph"),

  getNeighbors: (contestId: number, index: string, limit = 10) =>
    fetchJSON<GraphNeighbor[]>(
      `/api/graph/neighbors/${contestId}/${index}?limit=${limit}`,
    ),

  getCosmosData: () => fetchJSON<CosmosData>("/api/graph/cosmos"),

  compose: () =>
    fetchJSON<ComposeResponse>("/api/team/compose", { method: "POST" }),

  getContests: () => fetchJSON<VirtualContest[]>("/api/contests/"),

  getContest: (id: string) => fetchJSON<VirtualContest>(`/api/contests/${id}`),

  createContest: (data: ContestCreatePayload) =>
    fetchJSON<VirtualContest>("/api/contests/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  updateContest: (id: string, data: ContestUpdatePayload) =>
    fetchJSON<VirtualContest>(`/api/contests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deleteContest: (id: string) =>
    fetchJSON<{ status: string; id: string }>(`/api/contests/${id}`, {
      method: "DELETE",
    }),

  getContestTrends: () => fetchJSON<TrendsResponse>("/api/contests/trends"),

  getCFContestInfo: (contestId: number) =>
    fetchJSON<CFContestInfo>(`/api/codeforces/contest/${contestId}`),

  getUpsolveQueue: () => fetchJSON<UpsolveQueueResponse>("/api/upsolve/"),

  getUpsolveStats: () => fetchJSON<UpsolveStatsResponse>("/api/upsolve/stats"),

  dismissUpsolve: (contestId: string, problemIndex: string) =>
    fetchJSON<{ status: string }>("/api/upsolve/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contest_id: contestId, problem_index: problemIndex }),
    }),

  undismissUpsolve: (contestId: string, problemIndex: string) =>
    fetchJSON<{ status: string }>("/api/upsolve/undismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contest_id: contestId, problem_index: problemIndex }),
    }),

  getRecommendations: (
    memberId: number,
    options?: { seedProblem?: string; limit?: number; difficultyRange?: number }
  ) => {
    const params = new URLSearchParams();
    if (options?.seedProblem) params.set("seed_problem", options.seedProblem);
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.difficultyRange) params.set("difficulty_range", options.difficultyRange.toString());

    const query = params.toString();
    return fetchJSON<RecommendationsResponse>(
      `/api/recommendations/${memberId}${query ? `?${query}` : ""}`
    );
  },

  getReviewTopics: (
    memberId: number,
    options?: { staleDays?: number; limit?: number }
  ) => {
    const params = new URLSearchParams();
    if (options?.staleDays) params.set("stale_days", options.staleDays.toString());
    if (options?.limit) params.set("limit", options.limit.toString());

    const query = params.toString();
    return fetchJSON<ReviewTopicsResponse>(
      `/api/review/${memberId}${query ? `?${query}` : ""}`
    );
  },

  getReviewStats: (memberId: number) =>
    fetchJSON<ReviewStatsResponse>(`/api/review/${memberId}/stats`),

  getRegionals: (options?: { limit?: number; forceRefresh?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.forceRefresh) params.set("force_refresh", "true");

    const query = params.toString();
    return fetchJSON<RegionalsResponse>(
      `/api/regionals/${query ? `?${query}` : ""}`
    );
  },

  getRegionalRecommendations: (topN: number = 10) =>
    fetchJSON<RegionalRecommendationsResponse>(
      `/api/regionals/recommendations?top_n=${topN}`
    ),

  refreshRegionals: (limit: number = 50) =>
    fetchJSON<{ message: string; metadata: any }>(
      `/api/regionals/refresh?limit=${limit}`,
      { method: "POST" }
    ),

  getRegionalContest: (contestId: number) =>
    fetchJSON<RegionalContest>(`/api/regionals/contests/${contestId}`),

  getEditorial: (problemId: string) =>
    fetchJSON<Editorial>(`/api/editorials/${problemId}`),

  getEditorialsBulk: (problemIds: string[], maxCount: number = 50) =>
    fetchJSON<BulkEditorialsResponse>("/api/editorials/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem_ids: problemIds, max_count: maxCount }),
    }),

  getCachedEditorials: () =>
    fetchJSON<{ editorials: Record<string, Editorial>; count: number }>(
      "/api/editorials/"
    ),

  getLeaderboard: (weeks?: number) => {
    const params = weeks ? `?weeks=${weeks}` : "";
    return fetchJSON<LeaderboardResponse>(`/api/leaderboard/${params}`);
  },

  getWeeklySummary: (weekOffset?: number) => {
    const params = weekOffset ? `?week_offset=${weekOffset}` : "";
    return fetchJSON<WeeklySummaryResponse>(
      `/api/leaderboard/weekly-summary${params}`
    );
  },

  // --- Tags ---

  getTags: () => fetchJSON<CustomTag[]>("/api/tags/"),

  createTag: (data: { name: string; color: string; created_by: number }) =>
    fetchJSON<CustomTag>("/api/tags/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  updateTag: (tagId: string, data: { name?: string; color?: string }) =>
    fetchJSON<CustomTag>(`/api/tags/${tagId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deleteTag: (tagId: string) =>
    fetchJSON<{ status: string; id: string }>(`/api/tags/${tagId}`, {
      method: "DELETE",
    }),

  getProblemTags: (problemId: string) =>
    fetchJSON<CustomTag[]>(`/api/tags/problem/${problemId}`),

  addProblemTags: (problemId: string, tagIds: string[]) =>
    fetchJSON<{ status: string; problem_id: string; tag_count: number }>(
      `/api/tags/problem/${problemId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_ids: tagIds }),
      },
    ),

  removeProblemTag: (problemId: string, tagId: string) =>
    fetchJSON<{ status: string }>(`/api/tags/problem/${problemId}/${tagId}`, {
      method: "DELETE",
    }),

  getTagProblems: (tagId: string) =>
    fetchJSON<string[]>(`/api/tags/by-tag/${tagId}`),

  // --- Notes ---

  getMemberNotes: (memberId: number) =>
    fetchJSON<ProblemNote[]>(`/api/notes/member/${memberId}`),

  getProblemNotes: (problemId: string) =>
    fetchJSON<ProblemNote[]>(`/api/notes/problem/${problemId}`),

  getMemberProblemNote: (memberId: number, problemId: string) =>
    fetchJSON<ProblemNote | null>(
      `/api/notes/member/${memberId}/problem/${problemId}`,
    ),

  saveNote: (data: { member_id: number; problem_id: string; content: string }) =>
    fetchJSON<ProblemNote>("/api/notes/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deleteNote: (noteId: string) =>
    fetchJSON<{ status: string; id: string }>(`/api/notes/${noteId}`, {
      method: "DELETE",
    }),

  getNoteRecommendations: (memberId: number, problemId: string, limit = 10) =>
    fetchJSON<NoteRecommendation[]>(
      `/api/notes/member/${memberId}/problem/${problemId}/recommend?limit=${limit}`,
    ),

  // --- Journals ---

  getMemberJournals: (memberId: number) =>
    fetchJSON<TopicJournal[]>(`/api/journals/member/${memberId}`),

  getJournal: (memberId: number, topicId: string) =>
    fetchJSON<TopicJournal | null>(
      `/api/journals/member/${memberId}/topic/${topicId}`,
    ),

  addJournalEntry: (memberId: number, topicId: string, content: string) =>
    fetchJSON<TopicJournal>(
      `/api/journals/member/${memberId}/topic/${topicId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      },
    ),

  editJournalEntry: (
    memberId: number,
    topicId: string,
    entryId: string,
    content: string,
  ) =>
    fetchJSON<TopicJournal>(
      `/api/journals/member/${memberId}/topic/${topicId}/entry/${entryId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      },
    ),

  deleteJournalEntry: (memberId: number, topicId: string, entryId: string) =>
    fetchJSON<{ status: string; entry_id: string }>(
      `/api/journals/member/${memberId}/topic/${topicId}/entry/${entryId}`,
      { method: "DELETE" },
    ),

  getJournalRecommendations: (
    memberId: number,
    topicId: string,
    limit = 10,
  ) =>
    fetchJSON<NoteRecommendation[]>(
      `/api/journals/member/${memberId}/topic/${topicId}/recommend?limit=${limit}`,
    ),

  // --- Journal Custom Topics ---

  getCustomJournalTopics: () =>
    fetchJSON<CustomJournalTopic[]>("/api/journals/topics"),

  createCustomJournalTopic: (data: {
    name: string;
    icon: string;
    created_by: number;
  }) =>
    fetchJSON<CustomJournalTopic>("/api/journals/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deleteCustomJournalTopic: (topicId: string) =>
    fetchJSON<{ status: string; id: string }>(
      `/api/journals/topics/${topicId}`,
      { method: "DELETE" },
    ),

  // --- Journal All-Entries & Search ---

  getTopicAllEntries: (topicId: string, memberId?: number) => {
    const params = memberId !== undefined ? `?member_id=${memberId}` : "";
    return fetchJSON<JournalEntryWithMember[]>(
      `/api/journals/topic/${topicId}/all${params}`,
    );
  },

  searchJournals: (
    query: string,
    options?: { memberId?: number; topicId?: string; limit?: number },
  ) => {
    const params = new URLSearchParams({ q: query });
    if (options?.memberId !== undefined)
      params.set("member_id", options.memberId.toString());
    if (options?.topicId) params.set("topic_id", options.topicId);
    if (options?.limit) params.set("limit", options.limit.toString());
    return fetchJSON<JournalEntryWithMember[]>(
      `/api/journals/search?${params}`,
    );
  },

  // --- Solve Quality ---

  getSolveQuality: (memberId: number) =>
    fetchJSON<SolveQualityResponse>(`/api/solve-quality/${memberId}`),

  flagEditorial: (memberId: number, problemId: string, platform: "cf" | "lc") =>
    fetchJSON<{ problem_id: string; platform: string; used_editorial: boolean; flagged_at: string | null }>(
      `/api/solve-quality/${memberId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem_id: problemId, used_editorial: true, platform }),
      },
    ),

  unflagEditorial: (memberId: number, problemId: string) =>
    fetchJSON<{ status: string; problem_id: string }>(
      `/api/solve-quality/${memberId}/${problemId}`,
      { method: "DELETE" },
    ),

  // --- Team Management ---

  addMember: (data: { name: string; cf_handle?: string; lc_handle?: string }) =>
    fetchJSON<Member>("/api/team/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  removeMember: (id: number) =>
    fetchJSON<{ status: string; id: string }>(`/api/team/${id}`, {
      method: "DELETE",
    }),

  toggleMemberActive: (id: number, active: boolean) =>
    fetchJSON<Member>(`/api/team/${id}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    }),

  // --- Rotations ---

  getRotationCombos: () =>
    fetchJSON<ComboStats[]>("/api/rotations/combos"),

  getRotationSuggest: () =>
    fetchJSON<SuggestResponse>("/api/rotations/suggest"),

  getRotationRankings: () =>
    fetchJSON<ComboRanking[]>("/api/rotations/rankings"),

  getRotationTimeline: () =>
    fetchJSON<ComboTimelineResponse>("/api/rotations/timeline"),
};
