"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { CosmosProblem, CosmosData } from "@/lib/types";
import type { GraphNeighbor } from "@/lib/types";
import { api } from "@/lib/api";
import { ProblemCloud } from "./ProblemCloud";
import { ProblemEdges } from "./ProblemEdges";
import { CosmosSearch } from "./CosmosSearch";
import { CosmosTooltip } from "./CosmosTooltip";

/** Camera fly-to animation helper */
function CameraController({
  target,
  onArrived,
}: {
  target: THREE.Vector3 | null;
  onArrived: () => void;
}) {
  const { camera } = useThree();
  const arrived = useRef(false);

  useEffect(() => {
    arrived.current = false;
  }, [target]);

  useFrame(() => {
    if (!target || arrived.current) return;

    // Fly toward the target, stopping at a comfortable distance
    const offset = new THREE.Vector3(8, 5, 8);
    const dest = target.clone().add(offset);

    camera.position.lerp(dest, 0.04);
    const dist = camera.position.distanceTo(dest);
    if (dist < 0.5) {
      arrived.current = true;
      onArrived();
    }
  });

  return null;
}

/** Background star particles */
function Starfield() {
  const geometry = useMemo(() => {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 500;
      sizes[i] = 0.3 + Math.random() * 0.7;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#ffffff"
        size={0.4}
        transparent
        opacity={0.3}
        sizeAttenuation={false}
        depthWrite={false}
      />
    </points>
  );
}

interface CosmosViewProps {
  data: CosmosData;
}

export function CosmosView({ data }: CosmosViewProps) {
  const [hoveredProblem, setHoveredProblem] = useState<CosmosProblem | null>(null);
  const [hoveredScreenPos, setHoveredScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<CosmosProblem | null>(null);
  const [neighbors, setNeighbors] = useState<GraphNeighbor[]>([]);
  const [flyTarget, setFlyTarget] = useState<THREE.Vector3 | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Build lookup map: "contestId/index" -> problem
  const problemMap = useMemo(() => {
    const map = new Map<string, CosmosProblem>();
    for (const p of data.problems) {
      map.set(p.id, p);
    }
    return map;
  }, [data.problems]);

  // Fetch neighbors when a problem is selected/hovered
  const fetchNeighbors = useCallback(async (problem: CosmosProblem) => {
    try {
      const parts = problem.id.split("/");
      if (parts.length === 2) {
        const result = await api.getNeighbors(Number(parts[0]), parts[1], 20);
        setNeighbors(result);
      }
    } catch {
      setNeighbors([]);
    }
  }, []);

  const handleHover = useCallback(
    (problem: CosmosProblem | null, _worldPos: THREE.Vector3 | null) => {
      setHoveredProblem(problem);
      if (problem && !selectedProblem) {
        fetchNeighbors(problem);
      }
    },
    [selectedProblem, fetchNeighbors],
  );

  // Track mouse position for tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setHoveredScreenPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleClick = useCallback(
    (problem: CosmosProblem) => {
      if (selectedProblem?.id === problem.id) {
        // Double-click: open on Codeforces
        const url = `https://codeforces.com/problemset/problem/${problem.id}`;
        window.open(url, "_blank");
        return;
      }
      setSelectedProblem(problem);
      fetchNeighbors(problem);
      setFlyTarget(new THREE.Vector3(problem.x, problem.y, problem.z));
    },
    [selectedProblem, fetchNeighbors],
  );

  const handleSearch = useCallback(
    (problem: CosmosProblem) => {
      setSelectedProblem(problem);
      fetchNeighbors(problem);
      setFlyTarget(new THREE.Vector3(problem.x, problem.y, problem.z));
    },
    [fetchNeighbors],
  );

  // Deselect when clicking empty space
  const handleCanvasClick = useCallback(() => {
    // Only deselect if we didn't click a point (handleClick would have been called first)
  }, []);

  const activeProblem = selectedProblem ?? hoveredProblem;

  return (
    <div
      ref={canvasRef}
      className="relative h-full w-full"
      onMouseMove={handleMouseMove}
    >
      {/* Search overlay */}
      <CosmosSearch problems={data.problems} onSelect={handleSearch} />

      {/* Stats overlay */}
      <div className="absolute right-4 top-4 z-10 rounded-lg border border-border bg-[#0a0a0f]/80 px-4 py-2.5 text-[12px] text-dim backdrop-blur-sm">
        <span className="font-mono text-foreground">
          {data.meta.total.toLocaleString()}
        </span>{" "}
        problems
      </div>

      {/* Selected problem info */}
      {selectedProblem && (
        <div className="absolute bottom-4 left-4 z-10 max-w-sm rounded-lg border border-accent-border bg-[#0a0a0f]/90 px-4 py-3 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] text-accent">
              {selectedProblem.id.replace("/", "")}
            </span>
            {selectedProblem.rating > 0 && (
              <span className="text-[11px] text-dim">
                Rating: {selectedProblem.rating}
              </span>
            )}
          </div>
          <div className="mt-1 text-[13px] font-medium text-foreground">
            {selectedProblem.name}
          </div>
          {neighbors.length > 0 && (
            <div className="mt-2 text-[10px] text-dim">
              {neighbors.length} similar problems connected
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <a
              href={`https://codeforces.com/problemset/problem/${selectedProblem.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-accent-border bg-accent-dim px-2.5 py-1 text-[11px] text-accent transition-colors hover:bg-accent/10"
            >
              Open on CF
            </a>
            <button
              onClick={() => {
                setSelectedProblem(null);
                setNeighbors([]);
              }}
              className="rounded border border-border px-2.5 py-1 text-[11px] text-dim transition-colors hover:text-foreground"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Tooltip for hovered (non-selected) problem */}
      {hoveredProblem && !selectedProblem && hoveredScreenPos && (
        <CosmosTooltip problem={hoveredProblem} screenPos={hoveredScreenPos} />
      )}

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 z-10 text-[10px] text-dim/50">
        Drag to orbit / Scroll to zoom / Click to select
      </div>

      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [0, 0, 120], fov: 60, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "#0a0a0f" }}
        onPointerMissed={() => {
          setSelectedProblem(null);
          setNeighbors([]);
        }}
      >
        <Starfield />

        <ProblemCloud
          problems={data.problems}
          highlightedId={activeProblem?.id ?? null}
          onHover={handleHover}
          onClick={handleClick}
        />

        {activeProblem && neighbors.length > 0 && (
          <ProblemEdges
            source={activeProblem}
            neighbors={neighbors}
            problemMap={problemMap}
          />
        )}

        <CameraController
          target={flyTarget}
          onArrived={() => setFlyTarget(null)}
        />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={0.5}
          zoomSpeed={1.2}
          minDistance={5}
          maxDistance={300}
        />

        <ambientLight intensity={0.1} />
      </Canvas>
    </div>
  );
}
