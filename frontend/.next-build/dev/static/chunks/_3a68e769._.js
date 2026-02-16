(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "api",
    ()=>api,
    "parseProblemId",
    ()=>parseProblemId
]);
async function fetchJSON(path, init) {
    const res = await fetch(path, init);
    if (!res.ok) {
        const text = await res.text().catch(()=>"Unknown error");
        throw new Error(`API error ${res.status}: ${text}`);
    }
    return res.json();
}
function parseProblemId(id) {
    const match = id.match(/^(\d+)([A-Za-z]\d*)$/);
    if (!match) {
        throw new Error(`Invalid problem ID format: ${id}`);
    }
    return {
        contestId: Number(match[1]),
        index: match[2]
    };
}
const api = {
    health: ()=>fetchJSON("/api/health"),
    getProblems: ()=>fetchJSON("/api/problems/"),
    getTopics: ()=>fetchJSON("/api/problems/topics"),
    getTeam: ()=>fetchJSON("/api/team/"),
    getMember: (id)=>fetchJSON(`/api/team/${id}`),
    updateMember: (id, data)=>fetchJSON(`/api/team/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }),
    syncMember: (id)=>fetchJSON(`/api/team/${id}/sync`, {
            method: "POST"
        }),
    syncAll: ()=>fetchJSON("/api/team/sync-all", {
            method: "POST"
        }),
    syncMemberLC: (id)=>fetchJSON(`/api/team/${id}/sync-lc`, {
            method: "POST"
        }),
    syncAllLC: ()=>fetchJSON("/api/team/sync-all-lc", {
            method: "POST"
        }),
    getGraphMeta: ()=>fetchJSON("/api/graph/"),
    getCuratedSubgraph: ()=>fetchJSON("/api/graph/curated-subgraph"),
    getNeighbors: (contestId, index, limit = 10)=>fetchJSON(`/api/graph/neighbors/${contestId}/${index}?limit=${limit}`),
    getCosmosData: ()=>fetchJSON("/api/graph/cosmos"),
    compose: ()=>fetchJSON("/api/team/compose", {
            method: "POST"
        }),
    getContests: ()=>fetchJSON("/api/contests/"),
    getContest: (id)=>fetchJSON(`/api/contests/${id}`),
    createContest: (data)=>fetchJSON("/api/contests/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }),
    updateContest: (id, data)=>fetchJSON(`/api/contests/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }),
    deleteContest: (id)=>fetchJSON(`/api/contests/${id}`, {
            method: "DELETE"
        }),
    getContestTrends: ()=>fetchJSON("/api/contests/trends"),
    getCFContestInfo: (contestId)=>fetchJSON(`/api/codeforces/contest/${contestId}`),
    getUpsolveQueue: ()=>fetchJSON("/api/upsolve/"),
    getUpsolveStats: ()=>fetchJSON("/api/upsolve/stats"),
    dismissUpsolve: (contestId, problemIndex)=>fetchJSON("/api/upsolve/dismiss", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contest_id: contestId,
                problem_index: problemIndex
            })
        }),
    undismissUpsolve: (contestId, problemIndex)=>fetchJSON("/api/upsolve/undismiss", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contest_id: contestId,
                problem_index: problemIndex
            })
        }),
    getRecommendations: (memberId, options)=>{
        const params = new URLSearchParams();
        if (options?.seedProblem) params.set("seed_problem", options.seedProblem);
        if (options?.limit) params.set("limit", options.limit.toString());
        if (options?.difficultyRange) params.set("difficulty_range", options.difficultyRange.toString());
        const query = params.toString();
        return fetchJSON(`/api/recommendations/${memberId}${query ? `?${query}` : ""}`);
    },
    getReviewTopics: (memberId, options)=>{
        const params = new URLSearchParams();
        if (options?.staleDays) params.set("stale_days", options.staleDays.toString());
        if (options?.limit) params.set("limit", options.limit.toString());
        const query = params.toString();
        return fetchJSON(`/api/review/${memberId}${query ? `?${query}` : ""}`);
    },
    getReviewStats: (memberId)=>fetchJSON(`/api/review/${memberId}/stats`),
    getRegionals: (options)=>{
        const params = new URLSearchParams();
        if (options?.limit) params.set("limit", options.limit.toString());
        if (options?.forceRefresh) params.set("force_refresh", "true");
        const query = params.toString();
        return fetchJSON(`/api/regionals/${query ? `?${query}` : ""}`);
    },
    getRegionalRecommendations: (topN = 10)=>fetchJSON(`/api/regionals/recommendations?top_n=${topN}`),
    refreshRegionals: (limit = 50)=>fetchJSON(`/api/regionals/refresh?limit=${limit}`, {
            method: "POST"
        }),
    getRegionalContest: (contestId)=>fetchJSON(`/api/regionals/contests/${contestId}`),
    getEditorial: (problemId)=>fetchJSON(`/api/editorials/${problemId}`),
    getEditorialsBulk: (problemIds, maxCount = 50)=>fetchJSON("/api/editorials/bulk", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                problem_ids: problemIds,
                max_count: maxCount
            })
        }),
    getCachedEditorials: ()=>fetchJSON("/api/editorials/"),
    getLeaderboard: (weeks)=>{
        const params = weeks ? `?weeks=${weeks}` : "";
        return fetchJSON(`/api/leaderboard/${params}`);
    },
    getWeeklySummary: (weekOffset)=>{
        const params = weekOffset ? `?week_offset=${weekOffset}` : "";
        return fetchJSON(`/api/leaderboard/weekly-summary${params}`);
    },
    // --- Tags ---
    getTags: ()=>fetchJSON("/api/tags/"),
    createTag: (data)=>fetchJSON("/api/tags/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }),
    updateTag: (tagId, data)=>fetchJSON(`/api/tags/${tagId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }),
    deleteTag: (tagId)=>fetchJSON(`/api/tags/${tagId}`, {
            method: "DELETE"
        }),
    getProblemTags: (problemId)=>fetchJSON(`/api/tags/problem/${problemId}`),
    addProblemTags: (problemId, tagIds)=>fetchJSON(`/api/tags/problem/${problemId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                tag_ids: tagIds
            })
        }),
    removeProblemTag: (problemId, tagId)=>fetchJSON(`/api/tags/problem/${problemId}/${tagId}`, {
            method: "DELETE"
        }),
    getTagProblems: (tagId)=>fetchJSON(`/api/tags/by-tag/${tagId}`),
    // --- Notes ---
    getMemberNotes: (memberId)=>fetchJSON(`/api/notes/member/${memberId}`),
    getProblemNotes: (problemId)=>fetchJSON(`/api/notes/problem/${problemId}`),
    getMemberProblemNote: (memberId, problemId)=>fetchJSON(`/api/notes/member/${memberId}/problem/${problemId}`),
    saveNote: (data)=>fetchJSON("/api/notes/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }),
    deleteNote: (noteId)=>fetchJSON(`/api/notes/${noteId}`, {
            method: "DELETE"
        }),
    getNoteRecommendations: (memberId, problemId, limit = 10)=>fetchJSON(`/api/notes/member/${memberId}/problem/${problemId}/recommend?limit=${limit}`),
    // --- Journals ---
    getMemberJournals: (memberId)=>fetchJSON(`/api/journals/member/${memberId}`),
    getJournal: (memberId, topicId)=>fetchJSON(`/api/journals/member/${memberId}/topic/${topicId}`),
    addJournalEntry: (memberId, topicId, content)=>fetchJSON(`/api/journals/member/${memberId}/topic/${topicId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                content
            })
        }),
    editJournalEntry: (memberId, topicId, entryId, content)=>fetchJSON(`/api/journals/member/${memberId}/topic/${topicId}/entry/${entryId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                content
            })
        }),
    deleteJournalEntry: (memberId, topicId, entryId)=>fetchJSON(`/api/journals/member/${memberId}/topic/${topicId}/entry/${entryId}`, {
            method: "DELETE"
        }),
    getJournalRecommendations: (memberId, topicId, limit = 10)=>fetchJSON(`/api/journals/member/${memberId}/topic/${topicId}/recommend?limit=${limit}`),
    // --- Journal Custom Topics ---
    getCustomJournalTopics: ()=>fetchJSON("/api/journals/topics"),
    createCustomJournalTopic: (data)=>fetchJSON("/api/journals/topics", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }),
    deleteCustomJournalTopic: (topicId)=>fetchJSON(`/api/journals/topics/${topicId}`, {
            method: "DELETE"
        }),
    // --- Journal All-Entries & Search ---
    getTopicAllEntries: (topicId, memberId)=>{
        const params = memberId !== undefined ? `?member_id=${memberId}` : "";
        return fetchJSON(`/api/journals/topic/${topicId}/all${params}`);
    },
    searchJournals: (query, options)=>{
        const params = new URLSearchParams({
            q: query
        });
        if (options?.memberId !== undefined) params.set("member_id", options.memberId.toString());
        if (options?.topicId) params.set("topic_id", options.topicId);
        if (options?.limit) params.set("limit", options.limit.toString());
        return fetchJSON(`/api/journals/search?${params}`);
    },
    // --- Solve Quality ---
    getSolveQuality: (memberId)=>fetchJSON(`/api/solve-quality/${memberId}`),
    flagEditorial: (memberId, problemId, platform)=>fetchJSON(`/api/solve-quality/${memberId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                problem_id: problemId,
                used_editorial: true,
                platform
            })
        }),
    unflagEditorial: (memberId, problemId)=>fetchJSON(`/api/solve-quality/${memberId}/${problemId}`, {
            method: "DELETE"
        }),
    // --- Team Management ---
    addMember: (data)=>fetchJSON("/api/team/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }),
    removeMember: (id)=>fetchJSON(`/api/team/${id}`, {
            method: "DELETE"
        }),
    toggleMemberActive: (id, active)=>fetchJSON(`/api/team/${id}/active`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                active
            })
        }),
    // --- Rotations ---
    getRotationCombos: ()=>fetchJSON("/api/rotations/combos"),
    getRotationSuggest: ()=>fetchJSON("/api/rotations/suggest"),
    getRotationRankings: ()=>fetchJSON("/api/rotations/rankings"),
    getRotationTimeline: ()=>fetchJSON("/api/rotations/timeline")
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/hooks.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useContests",
    ()=>useContests,
    "useCustomJournalTopics",
    ()=>useCustomJournalTopics,
    "useLeaderboard",
    ()=>useLeaderboard,
    "useMemberJournals",
    ()=>useMemberJournals,
    "useMemberNotes",
    ()=>useMemberNotes,
    "useProblems",
    ()=>useProblems,
    "useRotations",
    ()=>useRotations,
    "useTags",
    ()=>useTags,
    "useTeam",
    ()=>useTeam,
    "useTopics",
    ()=>useTopics,
    "useUpsolve",
    ()=>useUpsolve
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature(), _s4 = __turbopack_context__.k.signature(), _s5 = __turbopack_context__.k.signature(), _s6 = __turbopack_context__.k.signature(), _s7 = __turbopack_context__.k.signature(), _s8 = __turbopack_context__.k.signature(), _s9 = __turbopack_context__.k.signature(), _s10 = __turbopack_context__.k.signature();
;
;
function useProblems() {
    _s();
    const [problems, setProblems] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useProblems.useEffect": ()=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getProblems().then(setProblems).catch({
                "useProblems.useEffect": (e)=>setError(e.message)
            }["useProblems.useEffect"]).finally({
                "useProblems.useEffect": ()=>setLoading(false)
            }["useProblems.useEffect"]);
        }
    }["useProblems.useEffect"], []);
    return {
        problems,
        loading,
        error
    };
}
_s(useProblems, "8z7LmWsd4LxJJPdWGy9MWQaHl24=");
function useTopics() {
    _s1();
    const [topics, setTopics] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useTopics.useEffect": ()=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getTopics().then(setTopics).catch({
                "useTopics.useEffect": (e)=>setError(e.message)
            }["useTopics.useEffect"]).finally({
                "useTopics.useEffect": ()=>setLoading(false)
            }["useTopics.useEffect"]);
        }
    }["useTopics.useEffect"], []);
    return {
        topics,
        loading,
        error
    };
}
_s1(useTopics, "7pyRqaSc4qGcpz5Bhun86YzuTJQ=");
function useTeam() {
    _s2();
    const [members, setMembers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const fetchTeam = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useTeam.useCallback[fetchTeam]": ()=>{
            setLoading(true);
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getTeam().then(setMembers).catch({
                "useTeam.useCallback[fetchTeam]": (e)=>setError(e.message)
            }["useTeam.useCallback[fetchTeam]"]).finally({
                "useTeam.useCallback[fetchTeam]": ()=>setLoading(false)
            }["useTeam.useCallback[fetchTeam]"]);
        }
    }["useTeam.useCallback[fetchTeam]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useTeam.useEffect": ()=>{
            fetchTeam();
        }
    }["useTeam.useEffect"], [
        fetchTeam
    ]);
    return {
        members,
        loading,
        error,
        refetch: fetchTeam
    };
}
_s2(useTeam, "FRWXUh1egIh4JJKeiZcOdMZiKHA=");
function useContests() {
    _s3();
    const [contests, setContests] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const fetchContests = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useContests.useCallback[fetchContests]": ()=>{
            setLoading(true);
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getContests().then(setContests).catch({
                "useContests.useCallback[fetchContests]": (e)=>setError(e.message)
            }["useContests.useCallback[fetchContests]"]).finally({
                "useContests.useCallback[fetchContests]": ()=>setLoading(false)
            }["useContests.useCallback[fetchContests]"]);
        }
    }["useContests.useCallback[fetchContests]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useContests.useEffect": ()=>{
            fetchContests();
        }
    }["useContests.useEffect"], [
        fetchContests
    ]);
    return {
        contests,
        loading,
        error,
        refetch: fetchContests
    };
}
_s3(useContests, "fu3sFp5z41xO4WpHmhCTLdR8NUY=");
function useUpsolve() {
    _s4();
    const [queue, setQueue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [stats, setStats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const fetchUpsolve = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useUpsolve.useCallback[fetchUpsolve]": ()=>{
            setLoading(true);
            Promise.all([
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getUpsolveQueue(),
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getUpsolveStats()
            ]).then({
                "useUpsolve.useCallback[fetchUpsolve]": ([q, s])=>{
                    setQueue(q);
                    setStats(s);
                }
            }["useUpsolve.useCallback[fetchUpsolve]"]).catch({
                "useUpsolve.useCallback[fetchUpsolve]": (e)=>setError(e.message)
            }["useUpsolve.useCallback[fetchUpsolve]"]).finally({
                "useUpsolve.useCallback[fetchUpsolve]": ()=>setLoading(false)
            }["useUpsolve.useCallback[fetchUpsolve]"]);
        }
    }["useUpsolve.useCallback[fetchUpsolve]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useUpsolve.useEffect": ()=>{
            fetchUpsolve();
        }
    }["useUpsolve.useEffect"], [
        fetchUpsolve
    ]);
    return {
        queue,
        stats,
        loading,
        error,
        refetch: fetchUpsolve
    };
}
_s4(useUpsolve, "pbbMCvQ9CagmVZ9GwKcOXb6pXrM=");
function useLeaderboard() {
    _s5();
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const fetchLeaderboard = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useLeaderboard.useCallback[fetchLeaderboard]": ()=>{
            setLoading(true);
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getLeaderboard().then(setData).catch({
                "useLeaderboard.useCallback[fetchLeaderboard]": (e)=>setError(e.message)
            }["useLeaderboard.useCallback[fetchLeaderboard]"]).finally({
                "useLeaderboard.useCallback[fetchLeaderboard]": ()=>setLoading(false)
            }["useLeaderboard.useCallback[fetchLeaderboard]"]);
        }
    }["useLeaderboard.useCallback[fetchLeaderboard]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useLeaderboard.useEffect": ()=>{
            fetchLeaderboard();
        }
    }["useLeaderboard.useEffect"], [
        fetchLeaderboard
    ]);
    return {
        data,
        loading,
        error,
        refetch: fetchLeaderboard
    };
}
_s5(useLeaderboard, "LPL+2bC+WaP+KTtHNhZiX2gkn84=");
function useTags() {
    _s6();
    const [tags, setTags] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const fetchTags = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useTags.useCallback[fetchTags]": ()=>{
            setLoading(true);
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getTags().then(setTags).catch({
                "useTags.useCallback[fetchTags]": (e)=>setError(e.message)
            }["useTags.useCallback[fetchTags]"]).finally({
                "useTags.useCallback[fetchTags]": ()=>setLoading(false)
            }["useTags.useCallback[fetchTags]"]);
        }
    }["useTags.useCallback[fetchTags]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useTags.useEffect": ()=>{
            fetchTags();
        }
    }["useTags.useEffect"], [
        fetchTags
    ]);
    return {
        tags,
        loading,
        error,
        refetch: fetchTags
    };
}
_s6(useTags, "F3FYfrpW6N3W34VBt6+zYbXkkXQ=");
function useMemberNotes(memberId) {
    _s7();
    const [notes, setNotes] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const fetchNotes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useMemberNotes.useCallback[fetchNotes]": ()=>{
            if (memberId === null) {
                setNotes([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getMemberNotes(memberId).then(setNotes).catch({
                "useMemberNotes.useCallback[fetchNotes]": (e)=>setError(e.message)
            }["useMemberNotes.useCallback[fetchNotes]"]).finally({
                "useMemberNotes.useCallback[fetchNotes]": ()=>setLoading(false)
            }["useMemberNotes.useCallback[fetchNotes]"]);
        }
    }["useMemberNotes.useCallback[fetchNotes]"], [
        memberId
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useMemberNotes.useEffect": ()=>{
            fetchNotes();
        }
    }["useMemberNotes.useEffect"], [
        fetchNotes
    ]);
    return {
        notes,
        loading,
        error,
        refetch: fetchNotes
    };
}
_s7(useMemberNotes, "+CPL1IAAZVMRIUA38odVhuaYltI=");
function useMemberJournals(memberId) {
    _s8();
    const [journals, setJournals] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const fetchJournals = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useMemberJournals.useCallback[fetchJournals]": ()=>{
            if (memberId === null) {
                setJournals([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getMemberJournals(memberId).then(setJournals).catch({
                "useMemberJournals.useCallback[fetchJournals]": (e)=>setError(e.message)
            }["useMemberJournals.useCallback[fetchJournals]"]).finally({
                "useMemberJournals.useCallback[fetchJournals]": ()=>setLoading(false)
            }["useMemberJournals.useCallback[fetchJournals]"]);
        }
    }["useMemberJournals.useCallback[fetchJournals]"], [
        memberId
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useMemberJournals.useEffect": ()=>{
            fetchJournals();
        }
    }["useMemberJournals.useEffect"], [
        fetchJournals
    ]);
    return {
        journals,
        loading,
        error,
        refetch: fetchJournals
    };
}
_s8(useMemberJournals, "W5I6nl4gHVgElj7bL2hSMQwbwag=");
function useRotations() {
    _s9();
    const [rankings, setRankings] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [suggestion, setSuggestion] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [timeline, setTimeline] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const fetchAll = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useRotations.useCallback[fetchAll]": ()=>{
            setLoading(true);
            Promise.all([
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getRotationRankings(),
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getRotationSuggest(),
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getRotationTimeline()
            ]).then({
                "useRotations.useCallback[fetchAll]": ([r, s, t])=>{
                    setRankings(r);
                    setSuggestion(s);
                    setTimeline(t);
                }
            }["useRotations.useCallback[fetchAll]"]).catch({
                "useRotations.useCallback[fetchAll]": (e)=>setError(e.message)
            }["useRotations.useCallback[fetchAll]"]).finally({
                "useRotations.useCallback[fetchAll]": ()=>setLoading(false)
            }["useRotations.useCallback[fetchAll]"]);
        }
    }["useRotations.useCallback[fetchAll]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useRotations.useEffect": ()=>{
            fetchAll();
        }
    }["useRotations.useEffect"], [
        fetchAll
    ]);
    return {
        rankings,
        suggestion,
        timeline,
        loading,
        error,
        refetch: fetchAll
    };
}
_s9(useRotations, "oRVA3d2sutfCNn2DlaXVQUTj9RE=");
function useCustomJournalTopics() {
    _s10();
    const [topics, setTopics] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const fetchTopics = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useCustomJournalTopics.useCallback[fetchTopics]": ()=>{
            setLoading(true);
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getCustomJournalTopics().then(setTopics).catch({
                "useCustomJournalTopics.useCallback[fetchTopics]": (e)=>setError(e.message)
            }["useCustomJournalTopics.useCallback[fetchTopics]"]).finally({
                "useCustomJournalTopics.useCallback[fetchTopics]": ()=>setLoading(false)
            }["useCustomJournalTopics.useCallback[fetchTopics]"]);
        }
    }["useCustomJournalTopics.useCallback[fetchTopics]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useCustomJournalTopics.useEffect": ()=>{
            fetchTopics();
        }
    }["useCustomJournalTopics.useEffect"], [
        fetchTopics
    ]);
    return {
        topics,
        loading,
        error,
        refetch: fetchTopics
    };
}
_s10(useCustomJournalTopics, "5/3wIoIGkeL3RqvIGiJ/THwu2+M=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/stat-box.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "StatBox",
    ()=>StatBox
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
function StatBox({ value, label, color = "#e0aa0f" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "rounded-lg border border-border bg-surface p-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-2xl font-bold",
                style: {
                    color
                },
                children: value
            }, void 0, false, {
                fileName: "[project]/components/stat-box.tsx",
                lineNumber: 10,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-1 text-xs text-muted",
                children: label
            }, void 0, false, {
                fileName: "[project]/components/stat-box.tsx",
                lineNumber: 13,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/stat-box.tsx",
        lineNumber: 9,
        columnNumber: 5
    }, this);
}
_c = StatBox;
var _c;
__turbopack_context__.k.register(_c, "StatBox");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/progress-bar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProgressBar",
    ()=>ProgressBar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
function ProgressBar({ percentage, color = "#e0aa0f", height = 4 }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "w-full overflow-hidden rounded-full bg-surface-hover",
        style: {
            height
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "rounded-full transition-[width] duration-500 ease-out",
            style: {
                width: `${Math.min(100, Math.max(0, percentage))}%`,
                height: "100%",
                background: color
            }
        }, void 0, false, {
            fileName: "[project]/components/progress-bar.tsx",
            lineNumber: 17,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/progress-bar.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
_c = ProgressBar;
var _c;
__turbopack_context__.k.register(_c, "ProgressBar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/topic-card.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TopicCard",
    ()=>TopicCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$progress$2d$bar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/progress-bar.tsx [app-client] (ecmascript)");
;
;
function TopicCard({ topic, stats, tierColor, tierBg, tierLabel, variant = "dashboard", prereqsMet = true, prereqIcons, onClick }) {
    const pct = stats.total > 0 ? Math.round(stats.solved / stats.total * 100) : 0;
    const isLocked = variant === "skill-tree" && !prereqsMet && topic.tier > 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        onClick: onClick,
        className: "cursor-pointer rounded-[10px] border border-border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-border-hover hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]",
        style: {
            background: tierBg,
            opacity: isLocked ? 0.5 : 1,
            borderColor: pct === 100 ? tierColor + "60" : undefined
        },
        children: [
            variant === "skill-tree" && prereqIcons && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-1.5 text-[10px] text-dim",
                children: [
                    "← ",
                    prereqIcons
                ]
            }, void 0, true, {
                fileName: "[project]/components/topic-card.tsx",
                lineNumber: 43,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-1 flex items-center gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-base",
                        children: topic.icon
                    }, void 0, false, {
                        fileName: "[project]/components/topic-card.tsx",
                        lineNumber: 48,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-[13px] font-medium text-foreground",
                        children: topic.name
                    }, void 0, false, {
                        fileName: "[project]/components/topic-card.tsx",
                        lineNumber: 49,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/topic-card.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-2 flex items-center gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                        style: {
                            color: tierColor,
                            background: tierBg
                        },
                        children: tierLabel
                    }, void 0, false, {
                        fileName: "[project]/components/topic-card.tsx",
                        lineNumber: 54,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-[11px] text-muted",
                        children: [
                            stats.solved,
                            "/",
                            stats.total
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/topic-card.tsx",
                        lineNumber: 60,
                        columnNumber: 9
                    }, this),
                    pct > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-[11px] font-medium",
                        style: {
                            color: tierColor
                        },
                        children: [
                            pct,
                            "%"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/topic-card.tsx",
                        lineNumber: 64,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/topic-card.tsx",
                lineNumber: 53,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$progress$2d$bar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ProgressBar"], {
                percentage: pct,
                color: tierColor
            }, void 0, false, {
                fileName: "[project]/components/topic-card.tsx",
                lineNumber: 69,
                columnNumber: 7
            }, this),
            isLocked && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-1 text-[9px] text-danger",
                children: "🔒 Complete prereqs first"
            }, void 0, false, {
                fileName: "[project]/components/topic-card.tsx",
                lineNumber: 71,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/topic-card.tsx",
        lineNumber: 33,
        columnNumber: 5
    }, this);
}
_c = TopicCard;
var _c;
__turbopack_context__.k.register(_c, "TopicCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/constants.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MONTHS_PLAN",
    ()=>MONTHS_PLAN,
    "ratingColor",
    ()=>ratingColor
]);
const MONTHS_PLAN = [
    {
        month: "Feb\u2013Mar",
        focus: "Foundations",
        topics: [
            "implementation",
            "math_basic",
            "sorting"
        ],
        goal: "Solve Div2 A/B consistently in < 10 min each"
    },
    {
        month: "Mar\u2013Apr",
        focus: "Core Algorithms I",
        topics: [
            "binary_search",
            "two_pointers",
            "prefix_sums",
            "number_theory"
        ],
        goal: "Comfortable with Div2 C, start solving some D"
    },
    {
        month: "Apr\u2013May",
        focus: "Core Algorithms II",
        topics: [
            "bfs_dfs",
            "dp_basic"
        ],
        goal: "Graph traversal & basic DP on autopilot"
    },
    {
        month: "May\u2013Jun",
        focus: "Intermediate I",
        topics: [
            "shortest_paths",
            "dsu",
            "topo_sort",
            "trees"
        ],
        goal: "Solve Div2 D consistently, attempt E"
    },
    {
        month: "Jun\u2013Jul",
        focus: "Intermediate II",
        topics: [
            "strings",
            "dp_intermediate",
            "combinatorics"
        ],
        goal: "Handle most Div2 D/E problems"
    },
    {
        month: "Jul\u2013Aug",
        focus: "Advanced",
        topics: [
            "seg_tree",
            "game_theory",
            "graphs_advanced",
            "geometry"
        ],
        goal: "Competitive at regional level"
    },
    {
        month: "Aug\u2013Sep",
        focus: "Polish & Team Strategy",
        topics: [
            "dp_advanced",
            "advanced"
        ],
        goal: "Virtual contests, team coordination, speed"
    }
];
function ratingColor(rating) {
    if (rating <= 1200) return "#22c55e";
    if (rating <= 1600) return "#3b82f6";
    if (rating <= 2000) return "#a855f7";
    if (rating <= 2400) return "#f59e0b";
    return "#ef4444";
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/rating-badge.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RatingBadge",
    ()=>RatingBadge
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/constants.ts [app-client] (ecmascript)");
;
;
function RatingBadge({ rating }) {
    const color = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ratingColor"])(rating);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: "inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold",
        style: {
            color,
            background: color + "18"
        },
        children: rating
    }, void 0, false, {
        fileName: "[project]/components/rating-badge.tsx",
        lineNumber: 10,
        columnNumber: 5
    }, this);
}
_c = RatingBadge;
var _c;
__turbopack_context__.k.register(_c, "RatingBadge");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/recommendations-widget.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RecommendationsWidget",
    ()=>RecommendationsWidget
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$rating$2d$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/rating-badge.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function RecommendationsWidget({ members }) {
    _s();
    const [recommendations, setRecommendations] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Find a member with some progress (prefer the one with most progress)
    const activeMember = members.length > 0 ? members.reduce((best, m)=>m.solved_count > best.solved_count ? m : best, members[0]) : null;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RecommendationsWidget.useEffect": ()=>{
            if (!activeMember) {
                setLoading(false);
                return;
            }
            const fetchRecs = {
                "RecommendationsWidget.useEffect.fetchRecs": async ()=>{
                    setLoading(true);
                    setError(null);
                    try {
                        const data = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getRecommendations(activeMember.id, {
                            limit: 5
                        });
                        setRecommendations(data);
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed to load");
                    } finally{
                        setLoading(false);
                    }
                }
            }["RecommendationsWidget.useEffect.fetchRecs"];
            fetchRecs();
        }
    }["RecommendationsWidget.useEffect"], [
        activeMember
    ]);
    if (!activeMember) {
        return null;
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "rounded-lg border border-border bg-surface/50 p-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-4 flex items-center justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-[15px] font-semibold text-foreground",
                                children: "💡 Recommended for You"
                            }, void 0, false, {
                                fileName: "[project]/components/recommendations-widget.tsx",
                                lineNumber: 54,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-0.5 text-[12px] text-muted",
                                children: [
                                    "Next problems for ",
                                    recommendations?.member_name ?? activeMember.name
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/recommendations-widget.tsx",
                                lineNumber: 57,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/recommendations-widget.tsx",
                        lineNumber: 53,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/recommendations",
                        className: "rounded-md border border-accent-border bg-accent-dim px-3 py-1.5 text-[12px] text-accent transition-all hover:bg-accent hover:text-background",
                        children: "View All"
                    }, void 0, false, {
                        fileName: "[project]/components/recommendations-widget.tsx",
                        lineNumber: 61,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/recommendations-widget.tsx",
                lineNumber: 52,
                columnNumber: 7
            }, this),
            loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "py-8 text-center text-muted",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "pulse-slow text-[13px]",
                    children: "Loading..."
                }, void 0, false, {
                    fileName: "[project]/components/recommendations-widget.tsx",
                    lineNumber: 71,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/recommendations-widget.tsx",
                lineNumber: 70,
                columnNumber: 9
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded border border-red-500/20 bg-red-500/5 p-3 text-[12px] text-red-400",
                children: error
            }, void 0, false, {
                fileName: "[project]/components/recommendations-widget.tsx",
                lineNumber: 76,
                columnNumber: 9
            }, this),
            !loading && !error && recommendations && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-2",
                children: recommendations.recommendations.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "py-8 text-center text-[13px] text-muted",
                    children: "No recommendations available yet. Solve more problems to get personalized suggestions."
                }, void 0, false, {
                    fileName: "[project]/components/recommendations-widget.tsx",
                    lineNumber: 84,
                    columnNumber: 13
                }, this) : recommendations.recommendations.map((rec)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-3 rounded border border-transparent px-2 py-2 transition-all hover:border-border hover:bg-background",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$rating$2d$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RatingBadge"], {
                                rating: rec.rating
                            }, void 0, false, {
                                fileName: "[project]/components/recommendations-widget.tsx",
                                lineNumber: 93,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: rec.url,
                                target: "_blank",
                                rel: "noopener noreferrer",
                                className: "flex-1 text-[13px] text-foreground transition-colors hover:text-accent",
                                children: rec.name
                            }, void 0, false, {
                                fileName: "[project]/components/recommendations-widget.tsx",
                                lineNumber: 94,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[10px] text-muted",
                                children: rec.topic
                            }, void 0, false, {
                                fileName: "[project]/components/recommendations-widget.tsx",
                                lineNumber: 102,
                                columnNumber: 17
                            }, this)
                        ]
                    }, rec.id, true, {
                        fileName: "[project]/components/recommendations-widget.tsx",
                        lineNumber: 89,
                        columnNumber: 15
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/recommendations-widget.tsx",
                lineNumber: 82,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/recommendations-widget.tsx",
        lineNumber: 51,
        columnNumber: 5
    }, this);
}
_s(RecommendationsWidget, "KlxOWSboAJlIMK5zHxdS5u4mbec=");
_c = RecommendationsWidget;
var _c;
__turbopack_context__.k.register(_c, "RecommendationsWidget");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Dashboard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/hooks.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$stat$2d$box$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/stat-box.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$topic$2d$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/topic-card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$recommendations$2d$widget$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/recommendations-widget.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
function Dashboard() {
    _s();
    const { problems, loading: pLoading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProblems"])();
    const { topics, loading: tLoading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTopics"])();
    const { members, loading: mLoading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTeam"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const loading = pLoading || tLoading || mLoading;
    // Union of all members' solved problems
    const allSolved = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Dashboard.useMemo[allSolved]": ()=>{
            const set = new Set();
            for (const m of members){
                for (const id of m.solved_curated){
                    set.add(id);
                }
            }
            return set;
        }
    }["Dashboard.useMemo[allSolved]"], [
        members
    ]);
    // Per-topic stats
    const topicStats = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Dashboard.useMemo[topicStats]": ()=>{
            const stats = {};
            if (!topics) return stats;
            for (const key of Object.keys(topics.topics)){
                stats[key] = {
                    total: 0,
                    solved: 0
                };
            }
            for (const p of problems){
                if (stats[p.topic]) {
                    stats[p.topic].total++;
                    if (allSolved.has(p.id)) {
                        stats[p.topic].solved++;
                    }
                }
            }
            return stats;
        }
    }["Dashboard.useMemo[topicStats]"], [
        problems,
        topics,
        allSolved
    ]);
    const totalProblems = problems.length;
    const totalSolved = allSolved.size;
    const topicsCompleted = topics ? Object.keys(topics.topics).filter((k)=>{
        const s = topicStats[k];
        return s && s.total > 0 && s.solved === s.total;
    }).length : 0;
    const pct = totalProblems > 0 ? Math.round(totalSolved / totalProblems * 100) : 0;
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex min-h-[60vh] items-center justify-center text-muted",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "pulse-slow",
                children: "Loading..."
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 62,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/page.tsx",
            lineNumber: 61,
            columnNumber: 7
        }, this);
    }
    if (!topics) return null;
    // Group topics by tier
    const topicsByTier = [];
    for (const [key, topic] of Object.entries(topics.topics)){
        while(topicsByTier.length <= topic.tier)topicsByTier.push([]);
        topicsByTier[topic.tier].push({
            key,
            tier: topic.tier
        });
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fade-in space-y-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "font-heading text-2xl font-bold",
                        children: "Dashboard"
                    }, void 0, false, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 79,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-1 text-sm text-muted",
                        children: [
                            members.length,
                            " members · ",
                            totalProblems,
                            " curated problems"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 80,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 78,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-2 gap-4 sm:grid-cols-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$stat$2d$box$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatBox"], {
                        value: totalSolved,
                        label: "Problems Solved"
                    }, void 0, false, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 86,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$stat$2d$box$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatBox"], {
                        value: topicsCompleted,
                        label: "Topics Completed",
                        color: "#3b82f6"
                    }, void 0, false, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 87,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$stat$2d$box$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatBox"], {
                        value: members.length,
                        label: "Team Members",
                        color: "#a855f7"
                    }, void 0, false, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 92,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$stat$2d$box$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatBox"], {
                        value: `${pct}%`,
                        label: "Overall Progress",
                        color: "#f59e0b"
                    }, void 0, false, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 93,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 85,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$recommendations$2d$widget$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RecommendationsWidget"], {
                members: members
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 96,
                columnNumber: 7
            }, this),
            topicsByTier.map((tier, tierIdx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-3 flex items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-[11px] font-semibold uppercase",
                                    style: {
                                        color: topics.tier_colors[tierIdx]
                                    },
                                    children: [
                                        "Tier ",
                                        tierIdx,
                                        ": ",
                                        topics.tier_labels[tierIdx]
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 101,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "h-px flex-1",
                                    style: {
                                        background: topics.tier_colors[tierIdx] + "30"
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 107,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/page.tsx",
                            lineNumber: 100,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
                            children: tier.map(({ key })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$topic$2d$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TopicCard"], {
                                    topicKey: key,
                                    topic: topics.topics[key],
                                    stats: topicStats[key] || {
                                        total: 0,
                                        solved: 0
                                    },
                                    tierColor: topics.tier_colors[tierIdx],
                                    tierBg: topics.tier_bg[tierIdx],
                                    tierLabel: topics.tier_labels[tierIdx],
                                    onClick: ()=>router.push(`/problems?topic=${key}`)
                                }, key, false, {
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 114,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/app/page.tsx",
                            lineNumber: 112,
                            columnNumber: 11
                        }, this)
                    ]
                }, tierIdx, true, {
                    fileName: "[project]/app/page.tsx",
                    lineNumber: 99,
                    columnNumber: 9
                }, this))
        ]
    }, void 0, true, {
        fileName: "[project]/app/page.tsx",
        lineNumber: 77,
        columnNumber: 5
    }, this);
}
_s(Dashboard, "IbF85FdeqyAGWDRQbWo/yuslpp0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProblems"],
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTopics"],
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTeam"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = Dashboard;
var _c;
__turbopack_context__.k.register(_c, "Dashboard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_3a68e769._.js.map