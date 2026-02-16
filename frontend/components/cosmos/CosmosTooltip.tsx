"use client";

import type { CosmosProblem } from "@/lib/types";

interface CosmosTooltipProps {
  problem: CosmosProblem;
  screenPos: { x: number; y: number };
}

export function CosmosTooltip({ problem, screenPos }: CosmosTooltipProps) {
  // Position the tooltip near the mouse, offset so it doesn't overlap the cursor
  const style: React.CSSProperties = {
    left: screenPos.x + 16,
    top: screenPos.y - 10,
    // Keep tooltip on screen
    maxWidth: "min(320px, calc(100vw - 32px))",
  };

  const cfUrl = `https://codeforces.com/problemset/problem/${problem.id}`;

  return (
    <div
      className="pointer-events-none absolute z-20 rounded-lg border border-border bg-[#0a0a0f]/95 px-4 py-3 shadow-xl backdrop-blur-sm"
      style={style}
    >
      <div className="flex items-center gap-2">
        <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-muted">
          {problem.id.replace("/", "")}
        </span>
        {problem.rating > 0 && (
          <span
            className="rounded px-1.5 py-0.5 text-[11px] font-medium"
            style={{
              background: ratingColor(problem.rating) + "20",
              color: ratingColor(problem.rating),
            }}
          >
            {problem.rating}
          </span>
        )}
      </div>

      <div className="mt-1.5 text-[13px] font-medium text-foreground">
        {problem.name}
      </div>

      {problem.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {problem.tags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-dim"
            >
              {tag}
            </span>
          ))}
          {problem.tags.length > 6 && (
            <span className="px-1 text-[10px] text-dim">
              +{problem.tags.length - 6}
            </span>
          )}
        </div>
      )}

      <div className="mt-2 text-[10px] text-dim">
        Click to open on Codeforces
      </div>
    </div>
  );
}

function ratingColor(rating: number): string {
  if (rating <= 1200) return "#22c55e";
  if (rating <= 1600) return "#3b82f6";
  if (rating <= 2000) return "#a855f7";
  if (rating <= 2400) return "#f59e0b";
  return "#ef4444";
}
