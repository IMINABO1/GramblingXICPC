"use client";

import { useRouter } from "next/navigation";
import { useTopics } from "@/lib/hooks";
import { MONTHS_PLAN } from "@/lib/constants";
import { VirtualContestsPanel } from "@/components/virtual-contests-panel";

export default function Timeline() {
  const { topics } = useTopics();
  const router = useRouter();

  return (
    <div className="fade-in space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Training Timeline</h1>
        <p className="mt-1 text-sm text-muted">
          7-month plan &middot; February &ndash; September 2026
        </p>
      </div>

      {/* Virtual Contests */}
      <VirtualContestsPanel />

      {/* Training Plan */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          📅 7-Month Training Plan
        </h2>
        <div className="relative ml-4 border-l border-border-hover pl-8">
        {MONTHS_PLAN.map((plan, idx) => (
          <div key={idx} className="relative mb-8 last:mb-0">
            {/* Timeline dot */}
            <div
              className="absolute -left-[41px] top-1 h-3 w-3 rounded-full border-2 border-background"
              style={{
                background: idx === 0 ? "#e0aa0f" : "#3a3a5a",
              }}
            />

            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-1 flex items-center gap-3">
                <span className="font-heading text-sm font-semibold text-accent">
                  {plan.month}
                </span>
                <span className="text-[12px] font-medium text-foreground">
                  {plan.focus}
                </span>
              </div>

              <div className="mb-3 flex flex-wrap gap-1.5">
                {plan.topics.map((topicKey) => {
                  const t = topics?.topics[topicKey];
                  const tierColor = t
                    ? topics!.tier_colors[t.tier]
                    : "#8888a0";
                  const tierBg = t
                    ? topics!.tier_bg[t.tier]
                    : "rgba(136,136,160,0.08)";
                  return (
                    <button
                      key={topicKey}
                      onClick={() =>
                        router.push(`/problems?topic=${topicKey}`)
                      }
                      className="rounded-full px-2 py-0.5 text-[11px] transition-all hover:brightness-125"
                      style={{ color: tierColor, background: tierBg }}
                    >
                      {t ? `${t.icon} ${t.name}` : topicKey}
                    </button>
                  );
                })}
              </div>

              <p className="text-[12px] text-muted">{plan.goal}</p>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
