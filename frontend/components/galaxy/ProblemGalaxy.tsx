"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import type { TopicsResponse, CuratedSubgraph } from "@/lib/types";
import { problemsToGalaxyData } from "./galaxy-utils";
import { useForceSimulation } from "./useForceSimulation";
import { GalaxyCanvas, type GalaxyCanvasHandle } from "./GalaxyCanvas";
import { GalaxyTooltip } from "./GalaxyTooltip";
import { GalaxyControls } from "./GalaxyControls";
import { GalaxyLegend } from "./GalaxyLegend";
import type { GalaxyNode, HoverInfo } from "./galaxy-types";

interface ProblemGalaxyProps {
  topics: TopicsResponse;
  solvedSet: Set<string>;
}

export function ProblemGalaxy({ topics, solvedSet }: ProblemGalaxyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<GalaxyCanvasHandle>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [subgraph, setSubgraph] = useState<CuratedSubgraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Fetch curated subgraph
  useEffect(() => {
    api
      .getCuratedSubgraph()
      .then((data) => {
        setSubgraph(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load graph");
        setLoading(false);
      });
  }, []);

  // Transform to galaxy data
  const galaxyData = useMemo(() => {
    if (!subgraph) return null;
    return problemsToGalaxyData(subgraph, topics, solvedSet);
  }, [subgraph, topics, solvedSet]);

  // Force simulation
  const { nodes, settled } = useForceSimulation(
    galaxyData ?? { nodes: [], edges: [] },
    {
      width: dimensions.width,
      height: dimensions.height,
      chargeStrength: -40,
      linkDistance: 50,
      alphaDecay: 0.03,
    },
  );

  const edges = useMemo(() => galaxyData?.edges ?? [], [galaxyData]);

  // Auto fit-all once simulation settles
  useEffect(() => {
    if (settled && !fittedRef.current && nodes.length > 0) {
      fittedRef.current = true;
      canvasRef.current?.fitAll();
    }
  }, [settled, nodes.length]);

  const handleHover = useCallback((info: HoverInfo | null) => {
    setHover(info);
  }, []);

  const handleClick = useCallback((node: GalaxyNode | null) => {
    if (!node) return;
    // Open problem on Codeforces
    window.open(`https://codeforces.com/problemset/problem/${node.id.replace(/([A-Za-z])/, "/$1")}`, "_blank");
  }, []);

  // Legend: unique topics from the loaded data
  const legendItems = useMemo(() => {
    if (!topics) return [];
    const seen = new Set<number>();
    const items: Array<{ label: string; color: string }> = [];
    for (const [, t] of Object.entries(topics.topics)) {
      if (!seen.has(t.tier)) {
        seen.add(t.tier);
        items.push({
          label: topics.tier_labels[t.tier],
          color: topics.tier_colors[t.tier],
        });
      }
    }
    return items.sort((a, b) => {
      const ai = topics.tier_labels.indexOf(a.label);
      const bi = topics.tier_labels.indexOf(b.label);
      return ai - bi;
    });
  }, [topics]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-muted">
        <span className="pulse-slow">Loading problem graph...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-[13px] text-danger">
        {error}
      </div>
    );
  }

  if (!galaxyData || galaxyData.nodes.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-muted">
        No curated problems in graph. Run build_graph.py first.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-[calc(100vh-280px)] min-h-[500px] w-full">
      <GalaxyCanvas
        ref={canvasRef}
        nodes={nodes}
        edges={edges}
        width={dimensions.width}
        height={dimensions.height}
        onHover={handleHover}
        onClick={handleClick}
      />
      <GalaxyTooltip hover={hover} variant="problem" />
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
      <div className="absolute right-4 top-4 rounded-md border border-border bg-surface/80 px-3 py-1.5 text-[11px] text-muted backdrop-blur-sm">
        {galaxyData.nodes.length} problems &middot; {galaxyData.edges.length} edges
      </div>
    </div>
  );
}
