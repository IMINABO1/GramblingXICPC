import type { Topic, TopicStats } from "@/lib/types";
import { ProgressBar } from "./progress-bar";

interface TopicCardProps {
  topicKey: string;
  topic: Topic;
  stats: TopicStats;
  tierColor: string;
  tierBg: string;
  tierLabel: string;
  /** Skill tree mode: shows prereqs and lock state */
  variant?: "dashboard" | "skill-tree";
  prereqsMet?: boolean;
  prereqIcons?: string;
  onClick?: () => void;
}

export function TopicCard({
  topic,
  stats,
  tierColor,
  tierBg,
  tierLabel,
  variant = "dashboard",
  prereqsMet = true,
  prereqIcons,
  onClick,
}: TopicCardProps) {
  const pct = stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0;
  const isLocked = variant === "skill-tree" && !prereqsMet && topic.tier > 0;

  return (
    <button
      onClick={onClick}
      className="cursor-pointer rounded-[10px] border border-border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-border-hover hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
      style={{
        background: tierBg,
        opacity: isLocked ? 0.5 : 1,
        borderColor: pct === 100 ? tierColor + "60" : undefined,
      }}
    >
      {variant === "skill-tree" && prereqIcons && (
        <div className="mb-1.5 text-[10px] text-dim">
          &larr; {prereqIcons}
        </div>
      )}
      <div className="mb-1 flex items-center gap-2">
        <span className="text-base">{topic.icon}</span>
        <span className="text-[13px] font-medium text-foreground">
          {topic.name}
        </span>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
          style={{ color: tierColor, background: tierBg }}
        >
          {tierLabel}
        </span>
        <span className="text-[11px] text-muted">
          {stats.solved}/{stats.total}
        </span>
        {pct > 0 && (
          <span className="text-[11px] font-medium" style={{ color: tierColor }}>
            {pct}%
          </span>
        )}
      </div>
      <ProgressBar percentage={pct} color={tierColor} />
      {isLocked && (
        <div className="mt-1 text-[9px] text-danger">
          &#128274; Complete prereqs first
        </div>
      )}
    </button>
  );
}
