import React from "react";
import Link from "next/link";

const LINKS = [
  { name: "Games", href: "/" },
  { name: "Library", href: "/library" },
  { name: "Leaderboards", href: "/leaderboard" },
  { name: "Terms", href: "/terms" },
  { name: "Privacy", href: "/privacy" },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <Link href="/" className="text-[19px] font-black tracking-[-0.03em] text-ink">
              Game<span className="text-brand">Hub</span>
            </Link>
            <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-ink-2">
              Classic arcade and puzzle games, rebuilt for the browser.
            </p>
          </div>
          <nav className="flex gap-7" aria-label="Footer">
            {LINKS.map((item) => (
              <Link key={item.name} href={item.href} className="text-[14px] font-medium text-ink-2 transition-colors hover:text-ink">
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-10 text-[12px] text-ink-3">&copy; 2026 Game Hub</p>
      </div>
    </footer>
  );
}
