"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type {
  RegionalsResponse,
  RegionalRecommendationsResponse,
  RegionalContest,
} from "@/lib/types";
import { StatBox } from "@/components/stat-box";
import { useTopics } from "@/lib/hooks";

export default function Regionals() {
  const [data, setData] = useState<RegionalsResponse | null>(null);
  const [recommendations, setRecommendations] = useState<RegionalRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContest, setSelectedContest] = useState<RegionalContest | null>(null);
  const { topics } = useTopics();

  useEffect(() => {
    loadData();
    loadRecommendations();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getRegionals();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to load regional analysis");
    } finally {
      setLoading(false);
    }
  }

  async function loadRecommendations() {
    try {
      const result = await api.getRegionalRecommendations(10);
      setRecommendations(result);
    } catch (err) {
      // Silent fail for recommendations
    }
  }

  async function handleRefresh() {
    if (refreshing) return;

    const confirmed = confirm(
      "This will re-analyze the pre-scraped ICPC problems and update statistics. Continue?"
    );
    if (!confirmed) return;

    try {
      setRefreshing(true);
      setError(null);
      await api.refreshRegionals(50);
      await loadData();
      await loadRecommendations();
    } catch (err: any) {
      setError(err.message || "Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        <span className="pulse-slow">Loading ICPC regional analysis...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="rounded border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
        <button
          type="button"
          onClick={loadData}
          className="rounded-md border border-accent-border bg-accent-dim px-4 py-2 text-[13px] font-medium text-accent transition-all hover:bg-accent/10"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { contests, aggregate_stats, metadata } = data;
  const sortedTopics = Object.entries(aggregate_stats.topic_counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">ICPC Regionals Analysis</h1>
          <p className="mt-1 text-sm text-muted">
            Historical topic distribution across {metadata.total_contests} ICPC regional contests
            {metadata.data_source === "pre-scraped" && (
              <span className="ml-2 rounded border border-accent-border bg-accent-dim px-2 py-0.5 text-[11px] font-medium text-accent">
                540 Pre-Scraped Problems
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-md border border-accent-border bg-accent-dim px-4 py-2 text-[13px] font-medium text-accent transition-all hover:bg-accent/10 disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "↻ Refresh Data"}
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatBox label="Contests Analyzed" value={metadata.total_contests} />
        <StatBox label="Total Problems" value={metadata.total_problems} />
        <StatBox
          label="Avg Problems/Contest"
          value={(metadata.total_problems / metadata.total_contests).toFixed(1)}
        />
        <StatBox label="Topics Covered" value={Object.keys(aggregate_stats.topic_counts).length} />
      </div>

      {/* Priority Recommendations */}
      {recommendations && recommendations.recommendations.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold">
            📊 Training Priority Recommendations
          </h2>
          <p className="mb-4 text-sm text-muted">
            Based on historical ICPC regional data, these topics appear most frequently and should be prioritized in training.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recommendations.recommendations.map((rec) => {
              const topicInfo = topics?.topics[rec.topic];
              const priorityColors = {
                Critical: "bg-danger/10 border-danger/30 text-danger",
                High: "bg-warning/10 border-warning/30 text-warning",
                Medium: "bg-accent/10 border-accent/30 text-accent",
                Low: "bg-muted/10 border-muted/30 text-muted",
              };

              return (
                <div
                  key={rec.topic}
                  className="flex items-center gap-3 rounded border border-border bg-surface p-3"
                >
                  <div className="text-2xl">{topicInfo?.icon || "📦"}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{topicInfo?.name || rec.topic}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${priorityColors[rec.priority]}`}
                      >
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {rec.count} problems ({rec.percentage.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Topic Distribution Chart */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold">Topic Distribution</h2>
        <p className="mb-6 text-sm text-muted">
          Frequency of each topic across {metadata.total_problems} problems from {metadata.total_contests} contests
        </p>
        <div className="space-y-3">
          {sortedTopics.map(([topicId, count]) => {
            const topicInfo = topics?.topics[topicId];
            const percentage = aggregate_stats.topic_percentages[topicId];

            return (
              <div key={topicId} className="flex items-center gap-3">
                <div className="w-40 text-sm">
                  <span className="mr-2 text-lg">{topicInfo?.icon || "📦"}</span>
                  {topicInfo?.name || topicId}
                </div>
                <div className="flex-1">
                  <div className="relative h-8 overflow-hidden rounded bg-surface">
                    <div
                      className="h-full bg-accent/20 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-3 text-xs">
                      <span className="font-medium">{count} problems</span>
                      <span className="text-muted">{percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contest List */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold">Analyzed Contests</h2>
        <p className="mb-4 text-sm text-muted">
          Click a contest to see its detailed topic breakdown
        </p>
        <div className="space-y-2">
          {contests.map((contest) => (
            <button
              key={contest.contest_id}
              type="button"
              onClick={() =>
                setSelectedContest(selectedContest?.contest_id === contest.contest_id ? null : contest)
              }
              className="w-full rounded border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-hover"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{contest.name}</span>
                    {contest.year && (
                      <span className="rounded bg-muted/10 px-1.5 py-0.5 text-[10px] text-muted">
                        {contest.year}
                      </span>
                    )}
                    <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">
                      {contest.region}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {contest.analysis.total_problems} problems • Contest ID: {contest.contest_id}
                  </p>
                </div>
                <div className="text-muted">{selectedContest?.contest_id === contest.contest_id ? "▲" : "▼"}</div>
              </div>

              {selectedContest?.contest_id === contest.contest_id && (
                <div className="mt-4 border-t border-border pt-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase text-muted">Topic Breakdown</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(contest.analysis.topic_counts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([topicId, count]) => {
                        const topicInfo = topics?.topics[topicId];
                        const percentage = contest.analysis.topic_percentages[topicId];
                        return (
                          <div
                            key={topicId}
                            className="rounded border border-border bg-card p-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{topicInfo?.icon || "📦"}</span>
                              <div className="flex-1 overflow-hidden">
                                <div className="truncate text-xs font-medium">
                                  {topicInfo?.name || topicId}
                                </div>
                                <div className="text-[10px] text-muted">
                                  {count} ({percentage.toFixed(0)}%)
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
