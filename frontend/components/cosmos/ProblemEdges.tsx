"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { CosmosProblem } from "@/lib/types";
import type { GraphNeighbor } from "@/lib/types";

interface ProblemEdgesProps {
  /** The currently selected/hovered problem */
  source: CosmosProblem;
  /** Neighbor data fetched from the API */
  neighbors: GraphNeighbor[];
  /** All problems (for position lookups) */
  problemMap: Map<string, CosmosProblem>;
}

export function ProblemEdges({ source, neighbors, problemMap }: ProblemEdgesProps) {
  const lineData = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];

    const srcPos = new THREE.Vector3(source.x, source.y, source.z);
    const accentColor = new THREE.Color("#e0aa0f");
    const dimColor = new THREE.Color("#e0aa0f").multiplyScalar(0.3);

    for (const nb of neighbors) {
      const target = problemMap.get(nb.id);
      if (!target) continue;

      // Line from source to target
      positions.push(srcPos.x, srcPos.y, srcPos.z);
      positions.push(target.x, target.y, target.z);

      // Bright at source, dim at target
      colors.push(accentColor.r, accentColor.g, accentColor.b);
      colors.push(dimColor.r, dimColor.g, dimColor.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3),
    );

    return geometry;
  }, [source, neighbors, problemMap]);

  return (
    <lineSegments geometry={lineData}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}
