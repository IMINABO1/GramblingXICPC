"use client";

import { useRef, useMemo, useCallback } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { CosmosProblem } from "@/lib/types";

/** 22 topic tags -> distinct colors (hue-spaced) */
const TAG_COLORS: Record<string, string> = {
  implementation: "#4ade80",
  math: "#60a5fa",
  "brute force": "#f472b6",
  greedy: "#facc15",
  "data structures": "#c084fc",
  "binary search": "#fb923c",
  dp: "#f87171",
  "constructive algorithms": "#34d399",
  sortings: "#a78bfa",
  strings: "#38bdf8",
  "number theory": "#e879f9",
  graphs: "#2dd4bf",
  "dfs and similar": "#22d3ee",
  trees: "#86efac",
  combinatorics: "#fbbf24",
  geometry: "#fb7185",
  "two pointers": "#a3e635",
  "shortest paths": "#818cf8",
  games: "#f0abfc",
  probabilities: "#67e8f9",
  "divide and conquer": "#d946ef",
  flows: "#14b8a6",
};

const DEFAULT_COLOR = "#e2e2e8";

function getTagColor(tags: string[]): string {
  for (const tag of tags) {
    if (TAG_COLORS[tag]) return TAG_COLORS[tag];
  }
  return DEFAULT_COLOR;
}

/** Rate how big a point should be based on rating */
function ratingToSize(rating: number): number {
  if (rating <= 0) return 2.0;
  // 800 -> 1.5, 1200 -> 2.0, 2000 -> 3.5, 3000 -> 5.0
  return 1.0 + (rating / 800);
}

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // Scale point size with distance (perspective)
    gl_PointSize = aSize * (200.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 40.0);
    vAlpha = smoothstep(0.5, 2.0, gl_PointSize);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Circular point with soft glow
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    // Bright core + soft glow
    float core = 1.0 - smoothstep(0.0, 0.15, dist);
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    float alpha = core * 0.9 + glow * 0.5;

    vec3 color = mix(vColor, vec3(1.0), core * 0.5);
    gl_FragColor = vec4(color, alpha * vAlpha);
  }
`;

interface ProblemCloudProps {
  problems: CosmosProblem[];
  highlightedId: string | null;
  onHover: (problem: CosmosProblem | null, point: THREE.Vector3 | null) => void;
  onClick: (problem: CosmosProblem) => void;
}

export function ProblemCloud({
  problems,
  highlightedId,
  onHover,
  onClick,
}: ProblemCloudProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera, raycaster } = useThree();

  // Build buffer attributes
  const { positions, colors, sizes, geometry } = useMemo(() => {
    const count = problems.length;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const tmpColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const p = problems[i];
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;

      tmpColor.set(getTagColor(p.tags));
      col[i * 3] = tmpColor.r;
      col[i * 3 + 1] = tmpColor.g;
      col[i * 3 + 2] = tmpColor.b;

      siz[i] = ratingToSize(p.rating);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(siz, 1));

    return { positions: pos, colors: col, sizes: siz, geometry: geo };
  }, [problems]);

  // Highlight effect: pulse the highlighted point
  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime = { value: clock.getElapsedTime() };
  });

  // Raycasting for hover
  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (!pointsRef.current) return;

      const intersects = raycaster.intersectObject(pointsRef.current);
      if (intersects.length > 0) {
        const idx = intersects[0].index;
        if (idx !== undefined && idx < problems.length) {
          const p = problems[idx];
          const worldPos = new THREE.Vector3(p.x, p.y, p.z);
          onHover(p, worldPos);
          return;
        }
      }
      onHover(null, null);
    },
    [problems, raycaster, onHover],
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (!pointsRef.current) return;

      const intersects = raycaster.intersectObject(pointsRef.current);
      if (intersects.length > 0) {
        const idx = intersects[0].index;
        if (idx !== undefined && idx < problems.length) {
          onClick(problems[idx]);
        }
      }
    },
    [problems, raycaster, onClick],
  );

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
