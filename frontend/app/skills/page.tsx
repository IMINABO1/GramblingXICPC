"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useProblems, useTopics, useTeam } from "@/lib/hooks";
import type { TopicStats } from "@/lib/types";
import { TopicCard } from "@/components/topic-card";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with PixiJS (needs window/document)
const SkillTreeGalaxy = dynamic(
  () =>
    import("@/components/galaxy/SkillTreeGalaxy").then(
      (m) => m.SkillTreeGalaxy,
    ),
  { ssr: false },
);

type ViewMode = "galaxy" | "grid";

export default function SkillTree() {
  const { problems, loading: pLoading } = useProblems();
  const { topics, loading: tLoading } = useTopics();
  const { members, loading: mLoading } = useTeam();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("galaxy");

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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        <span className="pulse-slow">Loading...</span>
      </div>
    );
  }

  if (!topics) return null;

  // Check if prerequisites are met (>= 50% of each prereq topic solved)
  function prereqsMet(topicKey: string): boolean {
    const topic = topics!.topics[topicKey];
    return topic.prereqs.every((p) => {
      const s = topicStats[p];
      return s && s.total > 0 && s.solved / s.total >= 0.5;
    });
  }

  function prereqIcons(topicKey: string): string {
    const topic = topics!.topics[topicKey];
    return topic.prereqs
      .map((p) => topics!.topics[p]?.icon || p)
      .join(" ");
  }

  // Group topics by tier (for grid view)
  const topicsByTier: { key: string }[][] = [];
  for (const [key, topic] of Object.entries(topics.topics)) {
    while (topicsByTier.length <= topic.tier) topicsByTier.push([]);
    topicsByTier[topic.tier].push({ key });
  }

  return (
    <div className="fade-in space-y-6">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Skill Tree</h1>
          <p className="mt-1 text-sm text-muted">
            Complete 50% of a topic&apos;s prerequisites to unlock it
          </p>
        </div>
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          <ViewToggleButton
            active={viewMode === "galaxy"}
            label="Galaxy"
            onClick={() => setViewMode("galaxy")}
          />
          <ViewToggleButton
            active={viewMode === "grid"}
            label="Grid"
            onClick={() => setViewMode("grid")}
          />
        </div>
      </div>

      {/* Galaxy view */}
      {viewMode === "galaxy" && (
        <SkillTreeGalaxy
          topics={topics}
          topicStats={topicStats}
          prereqsMet={prereqsMet}
          onTopicClick={(key) => router.push(`/problems?topic=${key}`)}
        />
      )}

      {/* Grid view (original) */}
      {viewMode === "grid" && (
        <div className="space-y-8">
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
                    variant="skill-tree"
                    prereqsMet={prereqsMet(key)}
                    prereqIcons={prereqIcons(key) || undefined}
                    onClick={() => router.push(`/problems?topic=${key}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ViewToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-3 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "bg-accent/10 text-accent"
          : "text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
