"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useProblems, useTopics, useTeam } from "@/lib/hooks";
import type { TopicStats } from "@/lib/types";
import { StatBox } from "@/components/stat-box";
import { TopicCard } from "@/components/topic-card";
import { RecommendationsWidget } from "@/components/recommendations-widget";

export default function Dashboard() {
  const { problems, loading: pLoading } = useProblems();
  const { topics, loading: tLoading } = useTopics();
  const { members, loading: mLoading } = useTeam();
  const router = useRouter();

  const loading = pLoading || tLoading || mLoading;

  // Union of all members' solved problems
  const allSolved = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) {
      for (const id of m.solved_curated) {
        set.add(id);
      }
    }
    return set;
  }, [members]);

  // Per-topic stats
  const topicStats = useMemo(() => {
    const stats: Record<string, TopicStats> = {};
    if (!topics) return stats;
    for (const key of Object.keys(topics.topics)) {
      stats[key] = { total: 0, solved: 0 };
    }
    for (const p of problems) {
      if (stats[p.topic]) {
        stats[p.topic].total++;
        if (allSolved.has(p.id)) {
          stats[p.topic].solved++;
        }
      }
    }
    return stats;
  }, [problems, topics, allSolved]);

  const totalProblems = problems.length;
  const totalSolved = allSolved.size;
  const topicsCompleted = topics
    ? Object.keys(topics.topics).filter((k) => {
        const s = topicStats[k];
        return s && s.total > 0 && s.solved === s.total;
      }).length
    : 0;
  const pct =
    totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        <span className="pulse-slow">Loading...</span>
      </div>
    );
  }

  if (!topics) return null;

  // Group topics by tier
  const topicsByTier: { key: string; tier: number }[][] = [];
  for (const [key, topic] of Object.entries(topics.topics)) {
    while (topicsByTier.length <= topic.tier) topicsByTier.push([]);
    topicsByTier[topic.tier].push({ key, tier: topic.tier });
  }

  return (
    <div className="fade-in space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          {members.length} members &middot; {totalProblems} curated problems
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatBox value={totalSolved} label="Problems Solved" />
        <StatBox
          value={topicsCompleted}
          label="Topics Completed"
          color="#3b82f6"
        />
        <StatBox value={members.length} label="Team Members" color="#a855f7" />
        <StatBox value={`${pct}%`} label="Overall Progress" color="#f59e0b" />
      </div>

      <RecommendationsWidget members={members} />

      {topicsByTier.map((tier, tierIdx) => (
        <div key={tierIdx}>
          <div className="mb-3 flex items-center gap-2">
            <span
              className="text-[11px] font-semibold uppercase"
              style={{ color: topics.tier_colors[tierIdx] }}
            >
              Tier {tierIdx}: {topics.tier_labels[tierIdx]}
            </span>
            <div
              className="h-px flex-1"
              style={{ background: topics.tier_colors[tierIdx] + "30" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {tier.map(({ key }) => (
              <TopicCard
                key={key}
                topicKey={key}
                topic={topics.topics[key]}
                stats={topicStats[key] || { total: 0, solved: 0 }}
                tierColor={topics.tier_colors[tierIdx]}
                tierBg={topics.tier_bg[tierIdx]}
                tierLabel={topics.tier_labels[tierIdx]}
                onClick={() => router.push(`/problems?topic=${key}`)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
