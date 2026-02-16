"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { CosmosProblem } from "@/lib/types";

interface CosmosSearchProps {
  problems: CosmosProblem[];
  onSelect: (problem: CosmosProblem) => void;
}

export function CosmosSearch({ problems, onSelect }: CosmosSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return problems
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      )
      .slice(0, 20);
  }, [problems, query]);

  const handleSelect = useCallback(
    (p: CosmosProblem) => {
      onSelect(p);
      setQuery("");
      setOpen(false);
      inputRef.current?.blur();
    },
    [onSelect],
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div ref={containerRef} className="absolute left-4 top-4 z-10 w-80">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder='Search problems... (press "/")'
          className="w-full rounded-lg border border-border bg-[#0a0a0f]/90 px-4 py-2.5 text-[13px] text-foreground shadow-lg backdrop-blur-sm placeholder:text-dim focus:border-accent focus:outline-none"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-foreground"
          >
            x
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="mt-1 max-h-80 overflow-y-auto rounded-lg border border-border bg-[#0a0a0f]/95 shadow-xl backdrop-blur-sm">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-white/5"
            >
              <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-muted">
                {p.id.replace("/", "")}
              </span>
              <span className="truncate text-foreground">{p.name}</span>
              <span className="ml-auto shrink-0 text-[11px] text-dim">
                {p.rating || "?"}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && (
        <div className="mt-1 rounded-lg border border-border bg-[#0a0a0f]/95 px-4 py-3 text-[13px] text-dim shadow-xl backdrop-blur-sm">
          No problems found
        </div>
      )}
    </div>
  );
}
