import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type {
  ComboRanking,
  ComboTimelineResponse,
  CustomJournalTopic,
  CustomTag,
  LeaderboardResponse,
  Member,
  ProblemNote,
  Problem,
  SuggestResponse,
  TopicJournal,
  TopicsResponse,
  UpsolveQueueResponse,
  UpsolveStatsResponse,
  VirtualContest,
} from "./types";

export function useProblems() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProblems()
      .then(setProblems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { problems, loading, error };
}

export function useTopics() {
  const [topics, setTopics] = useState<TopicsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getTopics()
      .then(setTopics)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { topics, loading, error };
}

export function useTeam() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = useCallback(() => {
    setLoading(true);
    api
      .getTeam()
      .then(setMembers)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  return { members, loading, error, refetch: fetchTeam };
}

export function useContests() {
  const [contests, setContests] = useState<VirtualContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContests = useCallback(() => {
    setLoading(true);
    api
      .getContests()
      .then(setContests)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  return { contests, loading, error, refetch: fetchContests };
}

export function useUpsolve() {
  const [queue, setQueue] = useState<UpsolveQueueResponse | null>(null);
  const [stats, setStats] = useState<UpsolveStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpsolve = useCallback(() => {
    setLoading(true);
    Promise.all([api.getUpsolveQueue(), api.getUpsolveStats()])
      .then(([q, s]) => {
        setQueue(q);
        setStats(s);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUpsolve();
  }, [fetchUpsolve]);

  return { queue, stats, loading, error, refetch: fetchUpsolve };
}

export function useLeaderboard() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(() => {
    setLoading(true);
    api
      .getLeaderboard()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { data, loading, error, refetch: fetchLeaderboard };
}

export function useTags() {
  const [tags, setTags] = useState<CustomTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(() => {
    setLoading(true);
    api
      .getTags()
      .then(setTags)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return { tags, loading, error, refetch: fetchTags };
}

export function useMemberNotes(memberId: number | null) {
  const [notes, setNotes] = useState<ProblemNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(() => {
    if (memberId === null) {
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getMemberNotes(memberId)
      .then(setNotes)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [memberId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return { notes, loading, error, refetch: fetchNotes };
}

export function useMemberJournals(memberId: number | null) {
  const [journals, setJournals] = useState<TopicJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJournals = useCallback(() => {
    if (memberId === null) {
      setJournals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getMemberJournals(memberId)
      .then(setJournals)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [memberId]);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  return { journals, loading, error, refetch: fetchJournals };
}

export function useRotations() {
  const [rankings, setRankings] = useState<ComboRanking[]>([]);
  const [suggestion, setSuggestion] = useState<SuggestResponse | null>(null);
  const [timeline, setTimeline] = useState<ComboTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.getRotationRankings(),
      api.getRotationSuggest(),
      api.getRotationTimeline(),
    ])
      .then(([r, s, t]) => {
        setRankings(r);
        setSuggestion(s);
        setTimeline(t);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { rankings, suggestion, timeline, loading, error, refetch: fetchAll };
}

export function useCustomJournalTopics() {
  const [topics, setTopics] = useState<CustomJournalTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopics = useCallback(() => {
    setLoading(true);
    api
      .getCustomJournalTopics()
      .then(setTopics)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return { topics, loading, error, refetch: fetchTopics };
}
