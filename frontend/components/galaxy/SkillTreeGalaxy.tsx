"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import type { TopicsResponse, TopicStats } from "@/lib/types";
import { topicsToGalaxyData } from "./galaxy-utils";
import { useForceSimulation } from "./useForceSimulation";
import { GalaxyCanvas, type GalaxyCanvasHandle } from "./GalaxyCanvas";
import { GalaxyTooltip } from "./GalaxyTooltip";
import { GalaxyControls } from "./GalaxyControls";
import { GalaxyLegend } from "./GalaxyLegend";
import type { GalaxyNode, HoverInfo } from "./galaxy-types";

interface SkillTreeGalaxyProps {
  topics: TopicsResponse;
  topicStats: Record<string, TopicStats>;
  prereqsMet: (key: string) => boolean;
  onTopicClick?: (topicKey: string) => void;
}

export function SkillTreeGalaxy({
  topics,
  topicStats,
  prereqsMet,
  onTopicClick,
}: SkillTreeGalaxyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<GalaxyCanvasHandle>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const fittedRef = useRef(false);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(500, entry.contentRect.height),
        });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Transform topic data to galaxy format
  const galaxyData = useMemo(
    () => topicsToGalaxyData(topics, topicStats, prereqsMet),
    [topics, topicStats, prereqsMet],
  );

  // Run force simulation
  const { nodes, settled } = useForceSimulation(galaxyData, {
    width: dimensions.width,
    height: dimensions.height,
    chargeStrength: -200,
    linkDistance: 100,
    tierBias: 0.15,
    tierCount: 5,
    alphaDecay: 0.025,
  });

  const edges = useMemo(() => galaxyData.edges, [galaxyData]);

  // Auto fit-all once simulation settles
  useEffect(() => {
    if (settled && !fittedRef.current) {
      fittedRef.current = true;
      canvasRef.current?.fitAll();
    }
  }, [settled]);

  const handleHover = useCallback((info: HoverInfo | null) => {
    setHover(info);
  }, []);

  const handleClick = useCallback(
    (node: GalaxyNode | null) => {
      if (node && onTopicClick) {
        onTopicClick(node.id);
      }
    },
    [onTopicClick],
  );

  const legendItems = useMemo(
    () =>
      topics.tier_labels.map((label, i) => ({
        label,
        color: topics.tier_colors[i],
      })),
    [topics],
  );

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100vh-200px)] min-h-[500px] w-full"
    >
      <GalaxyCanvas
        ref={canvasRef}
        nodes={nodes}
        edges={edges}
        width={dimensions.width}
        height={dimensions.height}
        onHover={handleHover}
        onClick={handleClick}
      />
      <GalaxyTooltip hover={hover} variant="skill" />
      <GalaxyControls
        onZoomIn={() => canvasRef.current?.zoomIn()}
        onZoomOut={() => canvasRef.current?.zoomOut()}
        onFitAll={() => canvasRef.current?.fitAll()}
      />
      <GalaxyLegend items={legendItems} />
      {!settled && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-border bg-surface/80 px-3 py-1 text-[11px] text-muted backdrop-blur-sm">
          Simulating layout...
        </div>
      )}
    </div>
  );
}
