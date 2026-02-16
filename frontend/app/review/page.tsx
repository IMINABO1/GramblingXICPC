"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useTeam } from "@/lib/hooks";
import { api } from "@/lib/api";
import type { ReviewTopicsResponse, ReviewStatsResponse } from "@/lib/types";

export default function Review() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-muted">
          <span className="pulse-slow">Loading...</span>
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}

function ReviewContent() {
  const { members, loading: teamLoading } = useTeam();
  const [selectedMember, setSelectedMember] = useState(0);
  const [staleDays, setStaleDays] = useState(30);
  const [reviewData, setReviewData] = useState<ReviewTopicsResponse | null>(null);
  const [statsData, setStatsData] = useState<ReviewStatsResponse | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchReview = useCallback(() => {
    setReviewLoading(true);
    api
      .getReviewTopics(selectedMember, { staleDays })
      .then(setReviewData)
      .catch(console.error)
      .finally(() => setReviewLoading(false));
  }, [selectedMember, staleDays]);

  const fetchStats = useCallback(() => {
    api
      .getReviewStats(selectedMember)
      .then(setStatsData)
      .catch(console.error);
  }, [selectedMember]);

  useEffect(() => {
    fetchReview();
    fetchStats();
  }, [fetchReview, fetchStats]);

  if (teamLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        <span className="pulse-slow">Loading...</span>
      </div>
    );
  }

  // Tier colors matching the design
  const tierColors = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444"];

  // Topic metadata (simplified - in production would come from useTopics hook)
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

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Spaced Repetition</h1>
        <p className="mt-1 text-sm text-muted">
          Track topic practice recency and surface areas that need review
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

      {/* Stale days threshold selector */}
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

      {/* Stats overview */}
      {statsData && !statsData.message && (
        <div className="rounded-lg border border-border bg-surface/50 p-6">
          <h2 className="mb-4 text-[14px] font-medium text-foreground">
            📊 Practice Overview
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
            <div className="rounded-md bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted">
                This Week
              </div>
              <div className="mt-1 text-[20px] font-bold text-accent">
                {statsData.topics_by_recency.this_week}
              </div>
            </div>
            <div className="rounded-md bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted">
                This Month
              </div>
              <div className="mt-1 text-[20px] font-bold text-foreground">
                {statsData.topics_by_recency.this_month}
              </div>
            </div>
            <div className="rounded-md bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted">
                1–3 Months
              </div>
              <div className="mt-1 text-[20px] font-bold text-yellow-500">
                {statsData.topics_by_recency["1_3_months"]}
              </div>
            </div>
            <div className="rounded-md bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted">
                3–6 Months
              </div>
              <div className="mt-1 text-[20px] font-bold text-orange-500">
                {statsData.topics_by_recency["3_6_months"]}
              </div>
            </div>
            <div className="rounded-md bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted">
                6+ Months
              </div>
              <div className="mt-1 text-[20px] font-bold text-red-500">
                {statsData.topics_by_recency["6_months_plus"]}
              </div>
            </div>
            <div className="rounded-md bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted">
                Untouched
              </div>
              <div className="mt-1 text-[20px] font-bold text-muted">
                {statsData.topics_untouched}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No sync message */}
      {reviewData?.message && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-6">
          <p className="text-[13px] text-yellow-200">
            ⚠️ {reviewData.message} Visit the{" "}
            <a href="/team" className="underline">
              Team page
            </a>{" "}
            to sync CF submissions.
          </p>
        </div>
      )}

      {/* Stale topics list */}
      {reviewData && !reviewData.message && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-medium text-foreground">
              🔄 Topics Needing Review ({reviewData.stale_count})
            </h2>
            <button
              onClick={() => fetchReview()}
              disabled={reviewLoading}
              className="rounded-md bg-surface px-3 py-1.5 text-[12px] text-muted hover:bg-surface/80 hover:text-foreground disabled:opacity-50"
            >
              {reviewLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {reviewData.stale_count === 0 && (
            <div className="rounded-lg border border-accent/30 bg-accent/10 p-6">
              <p className="text-[13px] text-accent">
                ✅ Great work! All practiced topics are still fresh. Keep up the
                momentum!
              </p>
            </div>
          )}

          {reviewData.stale_topics.map((staleTopic) => {
            const tierColor = tierColors[staleTopic.tier];
            const icon = topicIcons[staleTopic.topic_id] || "📚";

            return (
              <div
                key={staleTopic.topic_id}
                className="rounded-lg border border-border bg-surface/50 p-6 space-y-4"
              >
                {/* Header */}
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
                    {staleTopic.last_problem.id && (
                      <p className="mt-1 text-[11px] text-muted">
                        Most recent:{" "}
                        <span className="text-accent">
                          {staleTopic.last_problem.id}
                        </span>{" "}
                        — {staleTopic.last_problem.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Review problems */}
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

      {/* How it works */}
      <div className="rounded-lg border border-accent/20 bg-accent/5 p-6">
        <h2 className="mb-3 text-[14px] font-medium text-foreground">
          🧠 How Spaced Repetition Works
        </h2>
        <p className="mb-3 text-[12px] leading-relaxed text-muted">
          This feature tracks when you last solved problems in each topic and
          flags topics that haven&apos;t been practiced recently. The goal is to
          maintain your skills across all areas by periodically revisiting old
          topics.
        </p>
        <ul className="space-y-2 text-[12px] text-muted">
          <li className="flex items-start gap-2">
            <span className="text-accent">•</span>
            <span>
              Topics not practiced in <strong>{staleDays}+ days</strong> are
              flagged as stale
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">•</span>
            <span>
              Review suggestions prioritize unsolved curated problems in stale
              topics
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">•</span>
            <span>
              Solve times are pulled from your Codeforces submission history
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
