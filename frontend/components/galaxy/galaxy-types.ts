/** Node in the galaxy graph visualization */
export interface GalaxyNode {
  id: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  glowColor: string;
  glowIntensity: number;
  opacity: number;
  tier: number;
  metadata: Record<string, unknown>;
}

/** Edge between two galaxy nodes */
export interface GalaxyEdge {
  source: string;
  target: string;
  weight: number;
  color: string;
}

/** Combined graph data for the galaxy visualization */
export interface GalaxyData {
  nodes: GalaxyNode[];
  edges: GalaxyEdge[];
}

/** d3-force simulation node (extends GalaxyNode with force properties) */
export interface SimNode extends GalaxyNode {
  index?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

/** d3-force simulation link */
export interface SimLink {
  source: string | SimNode;
  target: string | SimNode;
  weight: number;
  color: string;
}

/** Camera state for pan/zoom */
export interface CameraState {
  x: number;
  y: number;
  scale: number;
}

/** Hovered node info for tooltip positioning */
export interface HoverInfo {
  node: GalaxyNode;
  screenX: number;
  screenY: number;
}

// Subgraph types are in @/lib/types.ts (SubgraphNode, SubgraphEdge, CuratedSubgraph)
