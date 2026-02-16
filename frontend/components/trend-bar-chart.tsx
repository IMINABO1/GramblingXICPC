"use client";

import type { TrendPoint } from "@/lib/types";

interface TrendBarChartProps {
  points: TrendPoint[];
  height?: number;
}

export function TrendBarChart({ points, height = 200 }: TrendBarChartProps) {
  if (points.length === 0) return null;

  const padding = { top: 16, right: 12, bottom: 40, left: 32 };
  const chartWidth = Math.max(points.length * 48, 300);
  const chartHeight = height - padding.top - padding.bottom;
  const maxSolved = Math.max(...points.map((p) => p.total_problems), 1);
  const barWidth = Math.min(
    (chartWidth - padding.left - padding.right) / points.length - 4,
    32,
  );

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface p-3">
      <p className="mb-2 text-[11px] font-medium text-muted">
        Problems Solved per Contest
      </p>
      <svg
        width={chartWidth}
        height={height}
        viewBox={`0 0 ${chartWidth} ${height}`}
      >
        {/* Y-axis gridlines */}
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padding.top + chartHeight * (1 - frac);
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
                {Math.round(maxSolved * frac)}
              </text>
            </g>
          );
        })}
        {/* Bars */}
        {points.map((p, i) => {
          const x =
            padding.left +
            (i * (chartWidth - padding.left - padding.right)) / points.length +
            2;
          const solvedH = (p.solved_count / maxSolved) * chartHeight;
          const unsolvedH =
            ((p.total_problems - p.solved_count) / maxSolved) * chartHeight;
          const dateLabel = p.date.slice(5); // MM-DD
          return (
            <g key={p.contest_id}>
              {/* Unsolved (dim) */}
              <rect
                x={x}
                y={padding.top + chartHeight - solvedH - unsolvedH}
                width={barWidth}
                height={unsolvedH}
                fill="#1e1e2e"
                rx={2}
              />
              {/* Solved (accent) */}
              <rect
                x={x}
                y={padding.top + chartHeight - solvedH}
                width={barWidth}
                height={solvedH}
                fill="#e0aa0f"
                opacity={0.8}
                rx={2}
              >
                <title>
                  {p.contest_name}: {p.solved_count}/{p.total_problems} solved
                </title>
              </rect>
              {/* X label */}
              <text
                x={x + barWidth / 2}
                y={height - padding.bottom + 14}
                textAnchor="middle"
                fill="#8888a0"
                fontSize={10}
                transform={`rotate(-30, ${x + barWidth / 2}, ${height - padding.bottom + 14})`}
              >
                {dateLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
