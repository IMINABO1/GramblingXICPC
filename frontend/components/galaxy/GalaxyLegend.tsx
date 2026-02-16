"use client";

interface LegendItem {
  label: string;
  color: string;
}

interface GalaxyLegendProps {
  items: LegendItem[];
}

export function GalaxyLegend({ items }: GalaxyLegendProps) {
  return (
    <div className="absolute bottom-4 left-4 flex flex-wrap gap-x-3 gap-y-1 rounded-md border border-border bg-surface/80 px-3 py-2 backdrop-blur-sm">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: item.color, boxShadow: `0 0 6px ${item.color}40` }}
          />
          <span className="text-[10px] text-muted">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
