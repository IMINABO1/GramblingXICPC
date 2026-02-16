"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceY,
  forceX,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import type { GalaxyData, GalaxyNode, SimNode, SimLink } from "./galaxy-types";

interface ForceConfig {
  width: number;
  height: number;
  /** Repulsion strength (negative). Default: -120 */
  chargeStrength?: number;
  /** Target link distance. Default: 80 */
  linkDistance?: number;
  /** Strength of vertical tier bias (0 = none). Default: 0 */
  tierBias?: number;
  /** Number of tiers for vertical spacing */
  tierCount?: number;
  /** Alpha decay rate (higher = faster settle). Default: 0.02 */
  alphaDecay?: number;
}

interface ForceResult {
  nodes: GalaxyNode[];
  settled: boolean;
  reheat: () => void;
}

export function useForceSimulation(
  data: GalaxyData,
  config: ForceConfig,
): ForceResult {
  const {
    width,
    height,
    chargeStrength = -120,
    linkDistance = 80,
    tierBias = 0,
    tierCount = 5,
    alphaDecay = 0.02,
  } = config;

  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const [nodes, setNodes] = useState<GalaxyNode[]>(data.nodes);
  const [settled, setSettled] = useState(false);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    // Create simulation nodes (copy to avoid mutating original)
    const simNodes: SimNode[] = data.nodes.map((n) => ({
      ...n,
      x: n.x || (Math.random() - 0.5) * width * 0.6,
      y: n.y || (Math.random() - 0.5) * height * 0.6,
    }));

    const simLinks: SimLink[] = data.edges.map((e) => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
      color: e.color,
    }));

    const sim = forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(linkDistance)
          .strength(0.3),
      )
      .force(
        "charge",
        forceManyBody<SimNode>().strength(chargeStrength),
      )
      .force("center", forceCenter(0, 0).strength(0.05))
      .force(
        "collide",
        forceCollide<SimNode>().radius((d) => d.radius * 1.5),
      )
      .alphaDecay(alphaDecay);

    // Add tier bias forces if configured
    if (tierBias > 0 && tierCount > 0) {
      const tierSpacing = height * 0.7 / (tierCount - 1);
      const topY = -(height * 0.35);
      sim.force(
        "tierY",
        forceY<SimNode>((d) => topY + d.tier * tierSpacing).strength(tierBias),
      );
      // Slight horizontal spread per tier for variety
      sim.force(
        "tierX",
        forceX<SimNode>(0).strength(0.01),
      );
    }

    simRef.current = sim;
    setSettled(false);

    // Animation loop — update React state from simulation
    function tick() {
      const currentNodes = simNodes.map((n) => ({
        ...n,
        x: n.x ?? 0,
        y: n.y ?? 0,
      }));
      setNodes(currentNodes);

      if (sim.alpha() < 0.01) {
        setSettled(true);
      } else {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    // Run simulation with tick callback
    sim.on("tick", () => {});
    // Use RAF for smooth updates instead of d3's internal timer
    sim.stop();

    // Run a bunch of ticks upfront for faster initial layout
    for (let i = 0; i < 100; i++) {
      sim.tick();
    }

    // Then animate the remaining settling
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameRef.current);
      sim.stop();
      simRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, width, height, chargeStrength, linkDistance, tierBias, tierCount, alphaDecay]);

  const reheat = useCallback(() => {
    if (simRef.current) {
      simRef.current.alpha(0.3).restart();
      setSettled(false);

      function tick() {
        const simNodes = simRef.current?.nodes() ?? [];
        const currentNodes = simNodes.map((n) => ({
          ...n,
          x: n.x ?? 0,
          y: n.y ?? 0,
        }));
        setNodes(currentNodes);

        if (!simRef.current || simRef.current.alpha() < 0.01) {
          setSettled(true);
          simRef.current?.stop();
        } else {
          frameRef.current = requestAnimationFrame(tick);
        }
      }

      simRef.current.stop();
      frameRef.current = requestAnimationFrame(tick);
    }
  }, []);

  return { nodes, settled, reheat };
}
