"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import type { CosmosData } from "@/lib/types";

const CosmosView = dynamic(
  () =>
    import("@/components/cosmos/CosmosView").then((m) => m.CosmosView),
  { ssr: false },
);

export default function CosmosPage() {
  const [data, setData] = useState<CosmosData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCosmosData()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="flex h-[calc(100vh-57px)] items-center justify-center">
        <div className="max-w-md text-center">
          <h2 className="font-heading text-lg font-bold text-foreground">
            Cosmos data not ready
          </h2>
          <p className="mt-2 text-[13px] text-muted">
            Run{" "}
            <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-accent">
              python scripts/build_positions.py
            </code>{" "}
            to generate 3D positions for all Codeforces problems.
          </p>
          <p className="mt-3 text-[11px] text-dim">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[calc(100vh-57px)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="mt-3 text-[13px] text-dim">
            Loading {">"}10,000 problems...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-57px)] w-full">
      <CosmosView data={data} />
    </div>
  );
}
