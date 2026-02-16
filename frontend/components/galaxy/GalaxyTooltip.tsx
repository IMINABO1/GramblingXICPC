"use client";

import type { HoverInfo, GalaxyNode } from "./galaxy-types";
import type { TopicStats } from "@/lib/types";

interface GalaxyTooltipProps {
  hover: HoverInfo | null;
  /** "skill" shows topic stats, "problem" shows rating + topic */
  variant: "skill" | "problem";
}

export function GalaxyTooltip({ hover, variant }: GalaxyTooltipProps) {
  if (!hover) return null;

  const { node, screenX, screenY } = hover;

  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg border border-border bg-surface px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
      style={{
        left: screenX + 14,
        top: screenY - 10,
        maxWidth: 220,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{node.icon}</span>
        <span className="text-[13px] font-medium text-foreground">
          {node.label}
        </span>
      </div>
      {variant === "skill" && <SkillTooltipBody node={node} />}
      {variant === "problem" && <ProblemTooltipBody node={node} />}
    </div>
  );
}

function SkillTooltipBody({ node }: { node: GalaxyNode }) {
  const stats = node.metadata.stats as TopicStats | undefined;
  const tierLabel = node.metadata.tierLabel as string | undefined;
  const pct =
    stats && stats.total > 0
      ? Math.round((stats.solved / stats.total) * 100)
      : 0;

  return (
    <div className="mt-1.5 space-y-1">
      {tierLabel && (
        <span
          className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
          style={{ color: node.color }}
        >
          {tierLabel}
        </span>
      )}
      {stats && (
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span>
            {stats.solved}/{stats.total} solved
          </span>
          {pct > 0 && (
            <span className="font-medium" style={{ color: node.color }}>
              {pct}%
            </span>
          )}
        </div>
      )}
      {/* Progress bar */}
      {stats && stats.total > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: node.color,
            }}
          />
        </div>
      )}
    </div>
  );
}

function ProblemTooltipBody({ node }: { node: GalaxyNode }) {
  const rating = node.metadata.rating as number | undefined;
  const solved = node.metadata.solved as boolean | undefined;

  return (
    <div className="mt-1 space-y-0.5">
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-muted">{node.id}</span>
        {rating && (
          <span className="font-medium" style={{ color: node.color }}>
            {rating}
          </span>
        )}
      </div>
      {solved && (
        <span className="text-[10px] text-accent">Solved</span>
      )}
    </div>
  );
}
