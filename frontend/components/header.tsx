"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DiamondLogo } from "./diamond-logo";

const DESKTOP_NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/skills", label: "Skill Tree" },
  { href: "/problems", label: "Problems" },
  { href: "/notebook", label: "Notebook" },
  { href: "/timeline", label: "Timeline" },
  { href: "/team", label: "Team" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/rotations", label: "Rotations" },
] as const;

const DRAWER_NAV = [
  {
    group: "Training",
    items: [
      { href: "/", label: "Dashboard" },
      { href: "/skills", label: "Skill Tree" },
      { href: "/problems", label: "Problems" },
      { href: "/timeline", label: "Timeline" },
    ],
  },
  {
    group: "Progress",
    items: [
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/team", label: "Team" },
      { href: "/rotations", label: "Rotations" },
    ],
  },
  {
    group: "Practice",
    items: [
      { href: "/contests", label: "Contests" },
      { href: "/upsolve", label: "Upsolve" },
      { href: "/recommendations", label: "Recommendations" },
      { href: "/review", label: "Review" },
    ],
  },
  {
    group: "Analysis",
    items: [
      { href: "/regionals", label: "Regionals" },
      { href: "/explorer", label: "Explorer" },
      { href: "/cosmos", label: "Cosmos" },
    ],
  },
  {
    group: "Tools",
    items: [
      { href: "/notebook", label: "Notebook" },
      { href: "/compose", label: "Compose" },
    ],
  },
] as const;

export function Header() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.classList.add("body-scroll-lock");
    } else {
      document.body.classList.remove("body-scroll-lock");
    }
    return () => document.body.classList.remove("body-scroll-lock");
  }, [drawerOpen]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:text-foreground md:hidden"
            aria-label="Open menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <line x1="3" y1="5" x2="17" y2="5" />
              <line x1="3" y1="10" x2="17" y2="10" />
              <line x1="3" y1="15" x2="17" y2="15" />
            </svg>
          </button>

          {/* Diamond logo */}
          <DiamondLogo />

          {/* Desktop nav */}
          <nav className="hidden gap-1 md:flex">
            {DESKTOP_NAV.map(({ href, label }) => {
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

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 md:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          {/* Drawer panel */}
          <nav
            className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-border bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="mb-6 flex items-center justify-between">
              <DiamondLogo />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:text-foreground"
                aria-label="Close menu"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <line x1="4" y1="4" x2="14" y2="14" />
                  <line x1="14" y1="4" x2="4" y2="14" />
                </svg>
              </button>
            </div>

            {/* Grouped nav links */}
            <div className="space-y-5">
              {DRAWER_NAV.map(({ group, items }) => (
                <div key={group}>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {group}
                  </div>
                  <div className="space-y-0.5">
                    {items.map(({ href, label }) => {
                      const active = pathname === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={`block rounded-md px-3 py-2 text-[13px] transition-all ${
                            active
                              ? "border border-accent-border bg-accent-dim text-accent"
                              : "border border-transparent text-foreground/80 hover:bg-surface-hover hover:text-foreground"
                          }`}
                        >
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
