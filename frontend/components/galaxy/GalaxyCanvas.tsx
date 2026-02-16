"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Application, Container, Graphics } from "pixi.js";
import type { GalaxyNode, GalaxyEdge, CameraState, HoverInfo } from "./galaxy-types";
import { hexToNum, generateStarfield } from "./galaxy-utils";

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 5;
const BG_COLOR = 0x0a0a0f;
const STAR_COUNT = 300;

export interface GalaxyCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fitAll: () => void;
}

interface GalaxyCanvasProps {
  nodes: GalaxyNode[];
  edges: GalaxyEdge[];
  width: number;
  height: number;
  onHover?: (info: HoverInfo | null) => void;
  onClick?: (node: GalaxyNode | null) => void;
}

export const GalaxyCanvas = forwardRef<GalaxyCanvasHandle, GalaxyCanvasProps>(
  function GalaxyCanvas({ nodes, edges, width, height, onHover, onClick }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const appRef = useRef<Application | null>(null);
    const worldRef = useRef<Container | null>(null);
    const cameraRef = useRef<CameraState>({ x: 0, y: 0, scale: 1 });
    const draggingRef = useRef(false);
    const lastMouseRef = useRef({ x: 0, y: 0 });
    const dragStartRef = useRef({ x: 0, y: 0 });
    const nodesRef = useRef(nodes);
    const [ready, setReady] = useState(false);

    nodesRef.current = nodes;

    // Apply camera state to world container
    const applyCamera = useCallback(() => {
      const world = worldRef.current;
      if (!world) return;
      world.scale.set(cameraRef.current.scale);
      world.position.set(
        width / 2 + cameraRef.current.x,
        height / 2 + cameraRef.current.y,
      );
    }, [width, height]);

    // Imperative methods for zoom controls
    useImperativeHandle(
      ref,
      () => ({
        zoomIn() {
          cameraRef.current.scale = Math.min(MAX_ZOOM, cameraRef.current.scale * 1.3);
          applyCamera();
        },
        zoomOut() {
          cameraRef.current.scale = Math.max(MIN_ZOOM, cameraRef.current.scale * 0.7);
          applyCamera();
        },
        fitAll() {
          const ns = nodesRef.current;
          if (ns.length === 0) return;
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          for (const n of ns) {
            minX = Math.min(minX, n.x - n.radius);
            maxX = Math.max(maxX, n.x + n.radius);
            minY = Math.min(minY, n.y - n.radius);
            maxY = Math.max(maxY, n.y + n.radius);
          }
          const graphW = maxX - minX || 1;
          const graphH = maxY - minY || 1;
          const padding = 0.85;
          const scale = Math.min(
            (width * padding) / graphW,
            (height * padding) / graphH,
            MAX_ZOOM,
          );
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          cameraRef.current.scale = scale;
          cameraRef.current.x = -centerX * scale;
          cameraRef.current.y = -centerY * scale;
          applyCamera();
        },
      }),
      [applyCamera, width, height],
    );

    // Initialize PixiJS application.
    // Wrapped in an async IIFE so we can yield a microtask before calling
    // app.init(). In React strict mode the sequence is:
    //   effect1 → cleanup1 → effect2
    // All three run synchronously. By awaiting a microtask first, cleanup1
    // sets `cancelled = true` before effect1 ever touches the WebGL context,
    // preventing two competing contexts on the same canvas (which causes
    // shader errors inside PixiJS).
    useEffect(() => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      let cancelled = false;
      let app: Application | null = null;

      (async () => {
        // Yield so strict-mode cleanup can mark the first mount as cancelled
        // before we create a WebGL context.
        await Promise.resolve();
        if (cancelled) return;

        app = new Application();
        await app.init({
          canvas,
          width,
          height,
          backgroundColor: BG_COLOR,
          antialias: true,
          resolution: Math.min(window.devicePixelRatio, 2),
          autoDensity: true,
        });

        if (cancelled) {
          app.destroy(false, { children: true });
          app = null;
          return;
        }

        appRef.current = app;

        // Static starfield layer (screen space)
        const starLayer = new Container();
        const starGfx = new Graphics();
        const stars = generateStarfield(STAR_COUNT, width, height);
        for (const s of stars) {
          starGfx.circle(s.x, s.y, s.radius);
          starGfx.fill({ color: 0xffffff, alpha: s.alpha });
        }
        starLayer.addChild(starGfx);
        app.stage.addChild(starLayer);

        // World container (transformed by camera)
        const world = new Container();
        world.position.set(width / 2, height / 2);
        worldRef.current = world;
        app.stage.addChild(world);

        setReady(true);
      })().catch(() => {
        // PixiJS init can fail if WebGL context was lost — the next
        // mount will retry.
      });

      return () => {
        cancelled = true;
        if (app) {
          app.destroy(false, { children: true });
          app = null;
        }
        appRef.current = null;
        worldRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Resize handler
    useEffect(() => {
      const app = appRef.current;
      if (!app || !ready) return;
      app.renderer.resize(width, height);
      applyCamera();
    }, [width, height, ready, applyCamera]);

    // Render graph on data changes
    useEffect(() => {
      if (!ready || !worldRef.current) return;

      const world = worldRef.current;

      // Clear previous children
      while (world.children.length > 0) {
        world.removeChildAt(0);
      }

      // Nebula haze
      const nebulaGfx = new Graphics();
      const tierCentroids = computeTierCentroids(nodes);
      for (const [, centroid] of Object.entries(tierCentroids)) {
        nebulaGfx.circle(centroid.x, centroid.y, 180);
        nebulaGfx.fill({ color: hexToNum(centroid.color), alpha: 0.025 });
        nebulaGfx.circle(centroid.x, centroid.y, 100);
        nebulaGfx.fill({ color: hexToNum(centroid.color), alpha: 0.015 });
      }
      world.addChild(nebulaGfx);

      // Edge layer — single batched Graphics draw call
      const edgeGfx = new Graphics();
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      for (const edge of edges) {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) continue;
        const alpha = Math.max(0.04, edge.weight * 0.2);
        edgeGfx.moveTo(src.x, src.y);
        edgeGfx.lineTo(tgt.x, tgt.y);
        edgeGfx.stroke({ color: hexToNum(edge.color), alpha, width: 1 });
      }
      world.addChild(edgeGfx);

      // Node layer
      for (const node of nodes) {
        const container = new Container();
        container.position.set(node.x, node.y);

        // Outer glow
        const glowGfx = new Graphics();
        glowGfx.circle(0, 0, node.radius * 2.5);
        glowGfx.fill({
          color: hexToNum(node.glowColor),
          alpha: node.glowIntensity * 0.12 * node.opacity,
        });
        container.addChild(glowGfx);

        // Mid glow
        const midGfx = new Graphics();
        midGfx.circle(0, 0, node.radius * 1.6);
        midGfx.fill({
          color: hexToNum(node.glowColor),
          alpha: node.glowIntensity * 0.2 * node.opacity,
        });
        container.addChild(midGfx);

        // Core circle
        const coreGfx = new Graphics();
        coreGfx.circle(0, 0, node.radius);
        coreGfx.fill({
          color: hexToNum(node.color),
          alpha: node.opacity,
        });
        container.addChild(coreGfx);

        // Center bright spot
        const centerGfx = new Graphics();
        centerGfx.circle(0, 0, node.radius * 0.35);
        centerGfx.fill({ color: 0xffffff, alpha: 0.5 * node.opacity });
        container.addChild(centerGfx);

        world.addChild(container);
      }
    }, [nodes, edges, ready]);

    // Find nearest node to screen position
    const findNodeAt = useCallback(
      (screenX: number, screenY: number): GalaxyNode | null => {
        const world = worldRef.current;
        if (!world) return null;
        const worldX = (screenX - world.position.x) / world.scale.x;
        const worldY = (screenY - world.position.y) / world.scale.y;
        let closest: GalaxyNode | null = null;
        let closestDist = Infinity;
        for (const node of nodesRef.current) {
          const dx = node.x - worldX;
          const dy = node.y - worldY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const hitRadius = node.radius * 1.8;
          if (dist < hitRadius && dist < closestDist) {
            closest = node;
            closestDist = dist;
          }
        }
        return closest;
      },
      [],
    );

    // Mouse handlers
    const handleWheel = useCallback(
      (e: React.WheelEvent) => {
        e.preventDefault();
        const world = worldRef.current;
        if (!world) return;

        const rect = canvasRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, cameraRef.current.scale * zoomFactor),
        );

        const scaleDiff = newScale / cameraRef.current.scale;
        cameraRef.current.x =
          mouseX - (mouseX - cameraRef.current.x - width / 2) * scaleDiff - width / 2;
        cameraRef.current.y =
          mouseY - (mouseY - cameraRef.current.y - height / 2) * scaleDiff - height / 2;
        cameraRef.current.scale = newScale;
        applyCamera();
      },
      [width, height, applyCamera],
    );

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      draggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        if (draggingRef.current) {
          const dx = e.clientX - lastMouseRef.current.x;
          const dy = e.clientY - lastMouseRef.current.y;
          lastMouseRef.current = { x: e.clientX, y: e.clientY };
          cameraRef.current.x += dx;
          cameraRef.current.y += dy;
          applyCamera();
        } else {
          const rect = canvasRef.current!.getBoundingClientRect();
          const screenX = e.clientX - rect.left;
          const screenY = e.clientY - rect.top;
          const node = findNodeAt(screenX, screenY);
          onHover?.(node ? { node, screenX: e.clientX, screenY: e.clientY } : null);
        }
      },
      [applyCamera, findNodeAt, onHover],
    );

    const handleMouseUp = useCallback(
      (e: React.MouseEvent) => {
        if (draggingRef.current) {
          const dx = e.clientX - dragStartRef.current.x;
          const dy = e.clientY - dragStartRef.current.y;
          if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
            const rect = canvasRef.current!.getBoundingClientRect();
            const node = findNodeAt(e.clientX - rect.left, e.clientY - rect.top);
            onClick?.(node);
          }
        }
        draggingRef.current = false;
      },
      [findNodeAt, onClick],
    );

    const handleMouseLeave = useCallback(() => {
      draggingRef.current = false;
      onHover?.(null);
    }, [onHover]);

    // Touch support
    const touchStartRef = useRef<{ x: number; y: number; dist?: number }>({
      x: 0,
      y: 0,
    });

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        draggingRef.current = true;
        lastMouseRef.current = { x: t.clientX, y: t.clientY };
        touchStartRef.current = { x: t.clientX, y: t.clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartRef.current.dist = Math.sqrt(dx * dx + dy * dy);
      }
    }, []);

    const handleTouchMove = useCallback(
      (e: React.TouchEvent) => {
        e.preventDefault();
        const world = worldRef.current;
        if (!world) return;

        if (e.touches.length === 1 && draggingRef.current) {
          const t = e.touches[0];
          const dx = t.clientX - lastMouseRef.current.x;
          const dy = t.clientY - lastMouseRef.current.y;
          lastMouseRef.current = { x: t.clientX, y: t.clientY };
          cameraRef.current.x += dx;
          cameraRef.current.y += dy;
          applyCamera();
        } else if (e.touches.length === 2 && touchStartRef.current.dist) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const scale = dist / touchStartRef.current.dist;
          cameraRef.current.scale = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, cameraRef.current.scale * scale),
          );
          touchStartRef.current.dist = dist;
          applyCamera();
        }
      },
      [applyCamera],
    );

    const handleTouchEnd = useCallback(
      (e: React.TouchEvent) => {
        if (e.changedTouches.length === 1 && draggingRef.current) {
          const t = e.changedTouches[0];
          const dx = t.clientX - touchStartRef.current.x;
          const dy = t.clientY - touchStartRef.current.y;
          if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
            const rect = canvasRef.current!.getBoundingClientRect();
            const node = findNodeAt(t.clientX - rect.left, t.clientY - rect.top);
            onClick?.(node);
          }
        }
        draggingRef.current = false;
        touchStartRef.current.dist = undefined;
      },
      [findNodeAt, onClick],
    );

    return (
      <canvas
        ref={canvasRef}
        style={{ width, height, cursor: "grab" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    );
  },
);

/** Compute average position of nodes per tier for nebula placement */
function computeTierCentroids(
  nodes: GalaxyNode[],
): Record<number, { x: number; y: number; color: string }> {
  const groups: Record<number, { xs: number[]; ys: number[]; color: string }> =
    {};
  for (const n of nodes) {
    if (!groups[n.tier]) {
      groups[n.tier] = { xs: [], ys: [], color: n.color };
    }
    groups[n.tier].xs.push(n.x);
    groups[n.tier].ys.push(n.y);
  }
  const result: Record<number, { x: number; y: number; color: string }> = {};
  for (const [tier, g] of Object.entries(groups)) {
    const avgX = g.xs.reduce((a, b) => a + b, 0) / g.xs.length;
    const avgY = g.ys.reduce((a, b) => a + b, 0) / g.ys.length;
    result[Number(tier)] = { x: avgX, y: avgY, color: g.color };
  }
  return result;
}
