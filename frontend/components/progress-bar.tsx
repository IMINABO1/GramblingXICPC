interface ProgressBarProps {
  percentage: number;
  color?: string;
  height?: number;
}

export function ProgressBar({
  percentage,
  color = "#e0aa0f",
  height = 4,
}: ProgressBarProps) {
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-surface-hover"
      style={{ height }}
    >
      <div
        className="rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${Math.min(100, Math.max(0, percentage))}%`,
          height: "100%",
          background: color,
        }}
      />
    </div>
  );
}
