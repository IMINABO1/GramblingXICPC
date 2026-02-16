import type { Problem, Member, TopicsResponse } from "./types";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportProblemsCSV(
  problems: Problem[],
  members: Member[],
  memberSolvedSets: Set<string>[],
  topics: TopicsResponse,
  filters: { topic: string; minRating: number; maxRating: number },
): void {
  const header = [
    "Problem ID",
    "Name",
    "Rating",
    "Topic",
    "Tier",
    "URL",
    ...members.map((m) => m.name),
  ];

  const rows = problems.map((p) => {
    const topicInfo = topics.topics[p.topic];
    const tierLabel = topicInfo
      ? topics.tier_labels[topicInfo.tier]
      : "Unknown";

    return [
      p.id,
      escapeCSV(p.name),
      String(p.rating),
      topicInfo?.name ?? p.topic,
      tierLabel,
      p.url,
      ...memberSolvedSets.map((s) => (s.has(p.id) ? "Y" : "")),
    ];
  });

  const csv =
    "\uFEFF" +
    [header.map(escapeCSV).join(","), ...rows.map((r) => r.join(","))].join(
      "\n",
    );

  // Build descriptive filename
  const parts = ["cficpc-problems"];
  if (filters.topic) parts.push(filters.topic);
  if (filters.minRating > 0 || filters.maxRating < 3000) {
    parts.push(`${filters.minRating}-${filters.maxRating}`);
  }
  if (!filters.topic && filters.minRating === 0 && filters.maxRating >= 3000) {
    parts.push("all");
  }
  const filename = parts.join("-") + ".csv";

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
