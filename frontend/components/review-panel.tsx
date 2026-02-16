"use client";

import { useCallback, useEffect, useState } from "react";
import { useTeam } from "@/lib/hooks";
import { api } from "@/lib/api";
import type { ReviewTopicsResponse } from "@/lib/types";
import { EditorialButton } from "./editorial-button";

const tierColors = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444"];

const topicIcons: Record<string, string> = {
  implementation: "⚙️",
  math_basic: "🔢",
  sorting: "📊",
  binary_search: "🎯",
  two_pointers: "👆",
  prefix_sums: "∑",
  number_theory: "🔐",
  bfs_dfs: "🌐",
  shortest_paths: "🛤️",
  dsu: "🔗",
  topo_sort: "📐",
  dp_basic: "📦",
  trees: "🌲",
  strings: "🔤",
  dp_intermediate: "🧩",
  seg_tree: "🏗️",
  combinatorics: "🎲",
  game_theory: "♟️",
  graphs_advanced: "🕸️",
  geometry: "📐",
  dp_advanced: "🧬",
  advanced: "🚀",
};

export function ReviewPanel() {
  const { members, loading: teamLoading } = useTeam();
  const [selectedMember, setSelectedMember] = useState(0);
  const [staleDays, setStaleDays] = useState(30);
  const [reviewData, setReviewData] = useState<ReviewTopicsResponse | null>(
    null,
  );
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchReview = useCallback(() => {
    setReviewLoading(true);
    api
      .getReviewTopics(selectedMember, { staleDays })
      .then(setReviewData)
      .catch(console.error)
      .finally(() => setReviewLoading(false));
  }, [selectedMember, staleDays]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  if (teamLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted">
        <span className="pulse-slow">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Member selector */}
      <div className="flex flex-wrap items-center gap-2">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
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

      {/* Stale days selector */}
      <div className="flex items-center gap-3">
        <label className="text-[13px] text-muted">
          Flag topics not practiced in:
        </label>
        <select
          value={staleDays}
          onChange={(e) => setStaleDays(Number(e.target.value))}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] text-foreground"
        >
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
          <option value={60}>60 days</option>
          <option value={90}>90 days</option>
        </select>
      </div>

      {/* No sync message */}
      {reviewData?.message && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="text-[13px] text-yellow-200">
            ⚠️ {reviewData.message} Visit the{" "}
            <a href="/team" className="underline">
              Team page
            </a>{" "}
            to sync CF submissions.
          </p>
        </div>
      )}

      {/* Stale topics */}
      {reviewData && !reviewData.message && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-medium text-foreground">
              🔄 Topics Needing Review ({reviewData.stale_count})
            </h2>
            <button
              type="button"
              onClick={fetchReview}
              disabled={reviewLoading}
              className="rounded-md bg-surface px-3 py-1.5 text-[12px] text-muted hover:bg-surface/80 hover:text-foreground disabled:opacity-50"
            >
              {reviewLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {reviewData.stale_count === 0 && (
            <div className="rounded-lg border border-accent/30 bg-accent/10 p-6">
              <p className="text-[13px] text-accent">
                ✅ Great work! All practiced topics are still fresh.
              </p>
            </div>
          )}

          {reviewData.stale_topics.map((staleTopic) => {
            const tierColor = tierColors[staleTopic.tier];
            const icon = topicIcons[staleTopic.topic_id] || "📚";

            return (
              <div
                key={staleTopic.topic_id}
                className="space-y-4 rounded-lg border border-border bg-surface/50 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[20px]">{icon}</span>
                      <h3 className="text-[16px] font-medium text-foreground">
                        {staleTopic.topic_name}
                      </h3>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
                        style={{
                          backgroundColor: `${tierColor}20`,
                          color: tierColor,
                        }}
                      >
                        Tier {staleTopic.tier}
                      </span>
                    </div>
                    <p className="mt-2 text-[12px] text-muted">
                      Last practiced{" "}
                      <strong className="text-foreground">
                        {staleTopic.days_since}
                      </strong>{" "}
                      days ago •{" "}
                      <strong className="text-foreground">
                        {staleTopic.problems_solved}
                      </strong>{" "}
                      problems solved
                    </p>
                  </div>
                </div>

                {staleTopic.review_count > 0 ? (
                  <div>
                    <h4 className="mb-2 text-[12px] font-medium text-muted">
                      Suggested Review Problems ({staleTopic.review_count})
                    </h4>
                    <div className="space-y-2">
                      {staleTopic.review_problems.map((prob) => (
                        <a
                          key={prob.id}
                          href={prob.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-4 rounded-md bg-background/50 p-3 transition-all hover:bg-background hover:outline hover:outline-1 hover:outline-accent"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[11px] text-accent">
                              {prob.id}
                            </span>
                            <span className="text-[12px] text-foreground">
                              {prob.name}
                            </span>
                            <EditorialButton problemId={prob.id} />
                          </div>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor:
                                prob.rating >= 1800
                                  ? "#ef444420"
                                  : prob.rating >= 1400
                                    ? "#f59e0b20"
                                    : "#22c55e20",
                              color:
                                prob.rating >= 1800
                                  ? "#ef4444"
                                  : prob.rating >= 1400
                                    ? "#f59e0b"
                                    : "#22c55e",
                            }}
                          >
                            {prob.rating}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-muted">
                    ✓ All curated problems in this topic already solved!
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
