"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { Editorial } from "@/lib/types";

interface EditorialButtonProps {
  problemId: string;
}

export function EditorialButton({ problemId }: EditorialButtonProps) {
  const [editorial, setEditorial] = useState<Editorial | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleClick = async () => {
    if (fetched && editorial) {
      // Already fetched — open the link directly
      const url = editorial.has_editorial
        ? editorial.editorial_url
        : editorial.problem_url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    setLoading(true);
    try {
      const data = await api.getEditorial(problemId);
      setEditorial(data);
      setFetched(true);
      // Open immediately after fetch
      const url = data.has_editorial ? data.editorial_url : data.problem_url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(`Failed to fetch editorial for ${problemId}:`, err);
      // Fallback: open problem page directly
      window.open(
        `https://codeforces.com/problemset/problem/${problemId.replace(/([A-Z])/, "/$1")}`,
        "_blank",
        "noopener,noreferrer"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-[11px] text-muted" title="Loading editorial...">
        <span className="pulse-slow">📖</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="text-[11px] text-muted transition-colors hover:text-accent cursor-pointer bg-transparent border-none p-0"
      title={fetched && editorial?.has_editorial ? "View editorial/tutorial" : "Find editorial (click to search)"}
    >
      {fetched && editorial?.has_editorial ? (
        <span className="text-accent">📖</span>
      ) : (
        "📖"
      )}
    </button>
  );
}
