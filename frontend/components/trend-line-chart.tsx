"use client";

import type { TrendPoint } from "@/lib/types";

interface TrendLineChartProps {
  points: TrendPoint[];
  height?: number;
}

export function TrendLineChart({ points, height = 200 }: TrendLineChartProps) {
  const withTime = points.filter((p) => p.avg_solve_time_minutes !== null);
  if (withTime.length < 2) return null;

  const padding = { top: 16, right: 12, bottom: 40, left: 40 };
  const chartWidth = Math.max(points.length * 48, 300);
  const chartHeight = height - padding.top - padding.bottom;
  const times = withTime.map((p) => p.avg_solve_time_minutes as number);
  const maxTime = Math.max(...times, 1);
  const minTime = Math.min(...times, 0);
  const range = maxTime - minTime || 1;

  // Map all points (including those without time) to x positions
  const xScale = (i: number) =>
    padding.left +
    (i / (points.length - 1)) * (chartWidth - padding.left - padding.right);
  const yScale = (t: number) =>
    padding.top + chartHeight - ((t - minTime) / range) * chartHeight;

  // Build polyline from points that have time data
  const coords: { x: number; y: number; point: TrendPoint }[] = [];
  points.forEach((p, i) => {
    if (p.avg_solve_time_minutes !== null) {
      coords.push({
        x: xScale(i),
        y: yScale(p.avg_solve_time_minutes),
        point: p,
      });
    }
  });

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface p-3">
      <p className="mb-2 text-[11px] font-medium text-muted">
        Avg Solve Time per Contest (minutes)
      </p>
      <svg
        width={chartWidth}
        height={height}
        viewBox={`0 0 ${chartWidth} ${height}`}
      >
        {/* Y-axis gridlines */}
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const val = minTime + range * frac;
          const y = yScale(val);
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
                {Math.round(val)}m
              </text>
            </g>
          );
        })}
        {/* Line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* Data points */}
        {coords.map((c) => (
          <circle key={c.point.contest_id} cx={c.x} cy={c.y} r={4} fill="#3b82f6">
            <title>
              {c.point.contest_name}: avg{" "}
              {Math.round(c.point.avg_solve_time_minutes as number)}m
            </title>
          </circle>
        ))}
        {/* X labels */}
        {points.map((p, i) => (
          <text
            key={p.contest_id}
            x={xScale(i)}
            y={height - padding.bottom + 14}
            textAnchor="middle"
            fill="#8888a0"
            fontSize={10}
            transform={`rotate(-30, ${xScale(i)}, ${height - padding.bottom + 14})`}
          >
            {p.date.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  );
}
