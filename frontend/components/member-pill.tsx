interface MemberPillProps {
  label: string;
  active?: boolean;
  color?: string;
  onClick?: () => void;
}

export function MemberPill({
  label,
  active = false,
  color,
  onClick,
}: MemberPillProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11px] transition-all ${
        active
          ? "border-accent-border bg-accent-dim text-accent"
          : "border-border text-muted hover:border-border-hover hover:text-foreground"
      }`}
      style={
        color && active
          ? { borderColor: color + "50", color, background: color + "10" }
          : undefined
      }
    >
      {label}
    </button>
  );
}
