"use client";

interface GalaxyControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitAll: () => void;
}

export function GalaxyControls({
  onZoomIn,
  onZoomOut,
  onFitAll,
}: GalaxyControlsProps) {
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
      <ControlButton label="+" title="Zoom in" onClick={onZoomIn} />
      <ControlButton label="-" title="Zoom out" onClick={onZoomOut} />
      <ControlButton label="Fit" title="Fit to view" onClick={onFitAll} />
    </div>
  );
}

function ControlButton({
  label,
  title,
  onClick,
}: {
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-[12px] font-medium text-muted transition-colors hover:border-border-hover hover:text-foreground"
    >
      {label}
    </button>
  );
}
