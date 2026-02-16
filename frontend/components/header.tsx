"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/skills", label: "Skill Tree" },
  { href: "/problems", label: "Problems" },
  { href: "/notebook", label: "Notebook" },
  { href: "/timeline", label: "Timeline" },
  { href: "/team", label: "Team" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/rotations", label: "Rotations" },
] as const;

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center gap-6">
        <Link href="/" className="font-heading text-lg font-bold text-accent">
          CF:ICPC
        </Link>
        <nav className="flex gap-1">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-[13px] transition-all ${
                  active
                    ? "border border-accent-border bg-accent-dim text-accent"
                    : "border border-transparent text-muted hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
