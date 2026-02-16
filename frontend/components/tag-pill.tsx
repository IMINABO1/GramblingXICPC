"use client";

import type { CustomTag } from "@/lib/types";

interface TagPillProps {
  tag: CustomTag;
  removable?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

export function TagPill({ tag, removable, onClick, onRemove }: TagPillProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-all"
      style={{
        color: tag.color,
        borderColor: tag.color + "40",
        background: tag.color + "12",
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      {tag.name}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 opacity-60 hover:opacity-100"
        >
          &times;
        </button>
      )}
    </span>
  );
}
