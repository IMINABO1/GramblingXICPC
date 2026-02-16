"use client";

import { Suspense } from "react";
import { useTeam } from "@/lib/hooks";
import { RecommendationsPanel } from "@/components/recommendations-panel";

export default function Recommendations() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-muted">
          <span className="pulse-slow">Loading...</span>
        </div>
      }
    >
      <RecommendationsContent />
    </Suspense>
  );
}

function RecommendationsContent() {
  const { members, loading } = useTeam();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        <span className="pulse-slow">Loading...</span>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Recommendations</h1>
        <p className="mt-1 text-sm text-muted">
          Personalized problem suggestions based on your progress and skill level
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface/50 p-6">
        <h2 className="mb-4 text-[14px] font-medium text-foreground">
          📍 Discovery Mode
        </h2>
        <p className="mb-6 text-[13px] leading-relaxed text-muted">
          These recommendations are tailored to your skill level and topic coverage.
          The engine prioritizes:
        </p>
        <ul className="mb-6 space-y-2 text-[12px] text-muted">
          <li className="flex items-start gap-2">
            <span className="text-accent">•</span>
            <span>
              <strong className="text-foreground">Weak topics</strong> — areas where
              you&apos;ve solved fewer than 5 problems
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">•</span>
            <span>
              <strong className="text-foreground">Difficulty progression</strong> —
              problems slightly above your average rating
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">•</span>
            <span>
              <strong className="text-foreground">Prerequisite coverage</strong> —
              topics you&apos;re ready for based on what you&apos;ve learned
            </span>
          </li>
        </ul>

        <RecommendationsPanel members={members} limit={15} />
      </div>

      <div className="rounded-lg border border-accent/20 bg-accent/5 p-6">
        <h2 className="mb-3 text-[14px] font-medium text-foreground">
          💡 Pro Tip: Seed-Based Recommendations
        </h2>
        <p className="text-[12px] leading-relaxed text-muted">
          After solving a problem, visit its page on Codeforces and come back here
          with the problem ID. Use the{" "}
          <code className="rounded bg-background px-1 py-0.5 font-mono text-[11px] text-accent">
            seed_problem
          </code>{" "}
          parameter in the URL (e.g.,{" "}
          <code className="rounded bg-background px-1 py-0.5 font-mono text-[11px]">
            /recommendations?seed=1352C
          </code>
          ) to get problems similar to the one you just solved. This creates a
          personalized difficulty ramp.
        </p>
      </div>
    </div>
  );
}
