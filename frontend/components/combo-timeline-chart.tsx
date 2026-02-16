"use client";

import { useState } from "react";
import type { ComboTimelinePoint } from "@/lib/types";

const COMBO_COLORS = [
  "#e0aa0f",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
  "#22c55e",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#84cc16",
];

interface ComboTimelineChartProps {
  combos: Record<string, ComboTimelinePoint[]>;
  comboNames: Record<string, string>;
  height?: number;
}

type FilterMode = "top3" | "top5" | "all";

export function ComboTimelineChart({
  combos,
  comboNames,
  height = 220,
}: ComboTimelineChartProps) {
  const [filter, setFilter] = useState<FilterMode>("top5");

  const comboKeys = Object.keys(combos);
  if (comboKeys.length === 0) return null;

  // Sort combos by avg solve rate descending to determine "top" ones
  const ranked = comboKeys
    .map((key) => {
      const pts = combos[key];
      const avg =
        pts.reduce((s, p) => s + p.solve_rate, 0) / (pts.length || 1);
      return { key, avg };
    })
    .sort((a, b) => b.avg - a.avg);

  const maxShow =
    filter === "top3" ? 3 : filter === "top5" ? 5 : ranked.length;
  const visible = ranked.slice(0, maxShow).map((r) => r.key);

  // Collect all unique dates across visible combos for the shared X axis
  const allDates = Array.from(
    new Set(
      visible.flatMap((key) => combos[key].map((p) => p.date)),
    ),
  ).sort();

  if (allDates.length < 1) return null;

  const padding = { top: 16, right: 16, bottom: 44, left: 44 };
  const chartWidth = Math.max(allDates.length * 56, 320);
  const chartHeight = height - padding.top - padding.bottom;

  const xScale = (i: number) =>
    padding.left +
    (allDates.length > 1
      ? (i / (allDates.length - 1)) * (chartWidth - padding.left - padding.right)
      : (chartWidth - padding.left - padding.right) / 2);

  const yScale = (rate: number) =>
    padding.top + chartHeight - rate * chartHeight;

  // Build a date -> x-index map
  const dateIndex: Record<string, number> = {};
  allDates.forEach((d, i) => {
    dateIndex[d] = i;
  });

  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted">
          Solve Rate Over Time
        </p>
        <div className="flex gap-1">
          {(["top3", "top5", "all"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`rounded px-2 py-0.5 text-[10px] transition-all ${
                filter === mode
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {mode === "top3" ? "Top 3" : mode === "top5" ? "Top 5" : "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={chartWidth}
          height={height}
          viewBox={`0 0 ${chartWidth} ${height}`}
        >
          {/* Y-axis gridlines at 25%, 50%, 75%, 100% */}
          {[0.25, 0.5, 0.75, 1].map((frac) => {
            const y = yScale(frac);
            return (
              <g key={frac}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#1e1e2e"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#8888a0"
                  fontSize={10}
                >
                  {Math.round(frac * 100)}%
                </text>
              </g>
            );
          })}

          {/* X labels */}
          {allDates.map((d, i) => (
            <text
              key={d}
              x={xScale(i)}
              y={height - padding.bottom + 14}
              textAnchor="middle"
              fill="#8888a0"
              fontSize={10}
              transform={`rotate(-30, ${xScale(i)}, ${height - padding.bottom + 14})`}
            >
              {d.slice(5)}
            </text>
          ))}

          {/* Lines + dots per combo */}
          {visible.map((key, ci) => {
            const pts = combos[key];
            const color = COMBO_COLORS[ci % COMBO_COLORS.length];
            const coords = pts
              .filter((p) => dateIndex[p.date] !== undefined)
              .map((p) => ({
                x: xScale(dateIndex[p.date]),
                y: yScale(p.solve_rate),
                point: p,
              }));

            if (coords.length === 0) return null;

            const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

            return (
              <g key={key}>
                <polyline
                  points={polyline}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                {coords.map((c) => (
                  <circle
                    key={c.point.contest_id}
                    cx={c.x}
                    cy={c.y}
                    r={3.5}
                    fill={color}
                  >
                    <title>
                      {comboNames[key] || key}:{" "}
                      {Math.round(c.point.solve_rate * 100)}% (
                      {c.point.problems_solved}/{c.point.total_problems})
                    </title>
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3">
        {visible.map((key, ci) => {
          const color = COMBO_COLORS[ci % COMBO_COLORS.length];
          return (
            <div key={key} className="flex items-center gap-1">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] text-muted">
                {comboNames[key] || key}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
