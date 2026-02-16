import type { TopicsResponse, TopicStats, CuratedSubgraph } from "@/lib/types";
import type { GalaxyData, GalaxyNode, GalaxyEdge } from "./galaxy-types";

/** Convert topic graph (22 topics) to galaxy visualization data */
export function topicsToGalaxyData(
  topics: TopicsResponse,
  topicStats: Record<string, TopicStats>,
  prereqsMet: (key: string) => boolean,
): GalaxyData {
  const nodes: GalaxyNode[] = Object.entries(topics.topics).map(
    ([key, topic]) => {
      const stats = topicStats[key] || { total: 0, solved: 0 };
      const pct = stats.total > 0 ? stats.solved / stats.total : 0;
      const tierColor = topics.tier_colors[topic.tier];
      return {
        id: key,
        label: topic.name,
        icon: topic.icon,
        x: 0,
        y: 0,
        radius: 10 + stats.total * 1.2,
        color: tierColor,
        glowColor: pct >= 1 ? "#00ffa3" : tierColor,
        glowIntensity: 0.3 + pct * 0.7,
        opacity: prereqsMet(key) || topic.tier === 0 ? 1.0 : 0.35,
        tier: topic.tier,
        metadata: {
          stats,
          prereqs: topic.prereqs,
          tierLabel: topics.tier_labels[topic.tier],
        },
      };
    },
  );

  const edges: GalaxyEdge[] = [];
  for (const [key, topic] of Object.entries(topics.topics)) {
    for (const prereq of topic.prereqs) {
      edges.push({
        source: prereq,
        target: key,
        weight: 0.8,
        color: topics.tier_colors[topic.tier],
      });
    }
  }

  return { nodes, edges };
}

/** Convert curated subgraph (220 problems) to galaxy visualization data */
export function problemsToGalaxyData(
  subgraph: CuratedSubgraph,
  topicsResponse: TopicsResponse,
  solvedSet: Set<string>,
): GalaxyData {
  const nodes: GalaxyNode[] = subgraph.nodes.map((n) => {
    const topic = topicsResponse.topics[n.topic];
    const tierColor = topicsResponse.tier_colors[topic?.tier ?? 0];
    const solved = solvedSet.has(n.id);
    return {
      id: n.id,
      label: n.name,
      icon: topic?.icon ?? "",
      x: 0,
      y: 0,
      radius: 3 + n.rating / 400,
      color: tierColor,
      glowColor: solved ? "#00ffa3" : tierColor,
      glowIntensity: solved ? 1.0 : 0.3,
      opacity: 1.0,
      tier: topic?.tier ?? 0,
      metadata: { rating: n.rating, topic: n.topic, solved },
    };
  });

  const edges: GalaxyEdge[] = subgraph.edges.map((e) => ({
    source: e.source,
    target: e.target,
    weight: e.score,
    color: "#ffffff",
  }));

  return { nodes, edges };
}

/** Parse hex color string to numeric value for PixiJS */
export function hexToNum(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

/** Generate random starfield positions */
export function generateStarfield(
  count: number,
  width: number,
  height: number,
): Array<{ x: number; y: number; radius: number; alpha: number }> {
  const stars: Array<{ x: number; y: number; radius: number; alpha: number }> =
    [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 0.5 + Math.random() * 1.2,
      alpha: 0.08 + Math.random() * 0.35,
    });
  }
  return stars;
}
