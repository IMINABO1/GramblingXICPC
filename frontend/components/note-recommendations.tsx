"use client";

import type { NoteRecommendation } from "@/lib/types";
import { RatingBadge } from "./rating-badge";

interface NoteRecommendationsProps {
  recommendations: NoteRecommendation[];
  loading: boolean;
}

export function NoteRecommendations({
  recommendations,
  loading,
}: NoteRecommendationsProps) {
  if (loading) {
    return (
      <div className="py-3 text-center text-[12px] text-muted">
        Finding similar problems...
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
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
            <span className="flex-1 truncate text-foreground">{rec.name}</span>
            <span className="text-[10px] text-muted">
              {Math.round(rec.impact * 100)}%
            </span>
            {rec.curated && (
              <span className="text-[10px] text-accent">curated</span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
