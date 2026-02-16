"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { RecommendationsResponse, Member } from "@/lib/types";
import { RatingBadge } from "./rating-badge";

interface RecommendationsWidgetProps {
  members: Member[];
}

export function RecommendationsWidget({ members }: RecommendationsWidgetProps) {
  const [recommendations, setRecommendations] =
    useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Find a member with some progress (prefer the one with most progress)
  const activeMember = members.length > 0
    ? members.reduce((best, m) => (m.solved_count > best.solved_count ? m : best), members[0])
    : null;

  useEffect(() => {
    if (!activeMember) {
      setLoading(false);
      return;
    }

    const fetchRecs = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getRecommendations(activeMember.id, { limit: 5 });
        setRecommendations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };

    fetchRecs();
  }, [activeMember]);

  if (!activeMember) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-surface/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">
            💡 Recommended for You
          </h2>
          <p className="mt-0.5 text-[12px] text-muted">
            Next problems for {recommendations?.member_name ?? activeMember.name}
          </p>
        </div>
        <Link
          href="/recommendations"
          className="rounded-md border border-accent-border bg-accent-dim px-3 py-1.5 text-[12px] text-accent transition-all hover:bg-accent hover:text-background"
        >
          View All
        </Link>
      </div>

      {loading && (
        <div className="py-8 text-center text-muted">
          <span className="pulse-slow text-[13px]">Loading...</span>
        </div>
      )}

      {error && (
        <div className="rounded border border-red-500/20 bg-red-500/5 p-3 text-[12px] text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && recommendations && (
        <div className="space-y-2">
          {recommendations.recommendations.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-muted">
              No recommendations available yet. Solve more problems to get personalized suggestions.
            </div>
          ) : (
            recommendations.recommendations.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center gap-3 rounded border border-transparent px-2 py-2 transition-all hover:border-border hover:bg-background"
              >
                <RatingBadge rating={rec.rating} />
                <a
                  href={rec.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-[13px] text-foreground transition-colors hover:text-accent"
                >
                  {rec.name}
                </a>
                <span className="text-[10px] text-muted">{rec.topic}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
