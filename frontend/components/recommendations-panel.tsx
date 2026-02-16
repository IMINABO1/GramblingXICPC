"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { RecommendationsResponse, Member } from "@/lib/types";
import { RatingBadge } from "./rating-badge";
import { EditorialButton } from "./editorial-button";

interface RecommendationsPanelProps {
  members: Member[];
  selectedMemberId?: number | null;
  seedProblem?: string | null;
  limit?: number;
  onMemberChange?: (memberId: number) => void;
}

export function RecommendationsPanel({
  members,
  selectedMemberId,
  seedProblem,
  limit = 10,
  onMemberChange,
}: RecommendationsPanelProps) {
  const [memberId, setMemberId] = useState<number | null>(
    selectedMemberId ?? (members.length > 0 ? members[0].id : null)
  );
  const [recommendations, setRecommendations] =
    useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedMemberId !== undefined) {
      setMemberId(selectedMemberId);
    }
  }, [selectedMemberId]);

  useEffect(() => {
    if (memberId === null) return;

    const fetchRecs = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getRecommendations(memberId, {
          seedProblem: seedProblem ?? undefined,
          limit,
          difficultyRange: 200,
        });
        setRecommendations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load recommendations");
      } finally {
        setLoading(false);
      }
    };

    fetchRecs();
  }, [memberId, seedProblem, limit]);

  const handleMemberChange = (newMemberId: number) => {
    setMemberId(newMemberId);
    if (onMemberChange) {
      onMemberChange(newMemberId);
    }
  };

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center text-muted">
        No team members found
      </div>
    );
  }

  return (
    <div className="fade-in space-y-4">
      {/* Member selector */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-muted">Get recommendations for:</span>
        <select
          value={memberId ?? ""}
          onChange={(e) => handleMemberChange(Number(e.target.value))}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] text-foreground outline-none focus:border-accent-border"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.solved_count} solved)
            </option>
          ))}
        </select>
      </div>

      {/* Loading/Error states */}
      {loading && (
        <div className="py-12 text-center text-muted">
          <span className="pulse-slow">Loading recommendations...</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-[13px] text-red-400">
          {error}
        </div>
      )}

      {/* Recommendations list */}
      {!loading && !error && recommendations && (
        <div className="space-y-3">
          {/* Header with member stats */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
            <span>
              <span className="text-foreground">{recommendations.member_name}</span>{" "}
              has solved {recommendations.solved_count} problems
            </span>
            <span>•</span>
            <span>
              Average rating:{" "}
              <span className="text-foreground">{recommendations.member_avg_rating}</span>
            </span>
            {seedProblem && (
              <>
                <span>•</span>
                <span className="text-accent">Based on {seedProblem}</span>
              </>
            )}
          </div>

          {/* Recommendations */}
          {recommendations.recommendations.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface p-6 text-center text-muted">
              No recommendations available. Try adjusting filters or solving more problems.
            </div>
          ) : (
            <div className="space-y-1.5">
              {recommendations.recommendations.map((rec, idx) => (
                <div
                  key={rec.id}
                  className="group flex flex-col gap-2 rounded-lg border border-transparent px-3 py-2.5 transition-all hover:border-border hover:bg-surface"
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-medium text-accent">
                      {idx + 1}
                    </span>

                    {/* Rating */}
                    <RatingBadge rating={rec.rating} />

                    {/* Problem name */}
                    <a
                      href={rec.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-[13px] text-foreground transition-colors hover:text-accent"
                    >
                      {rec.name}
                    </a>

                    {/* Editorial button */}
                    <EditorialButton problemId={rec.id} />

                    {/* Score */}
                    <span className="text-[11px] text-muted" title="Recommendation score">
                      {(rec.score * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Reason */}
                  <div className="ml-9 text-[11px] leading-relaxed text-muted">
                    {rec.reason}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
