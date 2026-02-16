interface StatBoxProps {
  value: string | number;
  label: string;
  color?: string;
}

export function StatBox({ value, label, color = "#00ffa3" }: StatBoxProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}
