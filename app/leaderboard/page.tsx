"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GlassCard } from "@/components/ui/GlassCard";
import Leaderboard from "@/components/Leaderboard";
import { HugeiconsIcon } from "@hugeicons/react";
import { Trophy, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { CATALOG } from "@/lib/catalog";

export default function LeaderboardPage() {
  const [activeSlug, setActiveSlug] = useState(CATALOG[0].slug);
  const active = CATALOG.find((g) => g.slug === activeSlug) ?? CATALOG[0];

  return (
    <>
      <Navbar />

      <main className="flex-1 pb-24 pt-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            All games
          </Link>

          <div className="mb-10 space-y-3 text-center">
            <div className="glass mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-diff-medium">
              <HugeiconsIcon icon={Trophy} className="h-7 w-7" />
            </div>
            <h1 className="text-[40px] font-black tracking-[-0.04em] text-ink sm:text-[56px]">Leaderboards</h1>
            <p className="mx-auto max-w-md text-[15px] leading-relaxed text-ink-2">
              Top 10 for every game. Post a run to see your initials here.
            </p>
          </div>

          {/* One tab per game, wrapping on small screens. */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {CATALOG.map((g) => {
              const isActive = g.slug === activeSlug;
              return (
                <button
                  key={g.slug}
                  onClick={() => setActiveSlug(g.slug)}
                  aria-pressed={isActive}
                  className={`pressable h-9 cursor-pointer rounded-full px-4 text-[13px] font-semibold transition-colors ${
                    isActive ? "btn-glow" : "btn-quiet text-ink-2 hover:text-ink"
                  }`}
                >
                  {g.title}
                </button>
              );
            })}
          </div>

          <GlassCard className="p-8">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-line gap-2">
                <div>
                  <h2 className="text-[22px] font-black tracking-[-0.03em] text-ink">{active.title}</h2>
                  <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-ink-2">
                    {active.category} · {active.difficulty}
                  </p>
                </div>
                <Link
                  href={`/games/${active.slug}`}
                  className="btn-glow inline-flex h-9 items-center rounded-full px-5 text-[13px] font-semibold"
                >
                  Play
                </Link>
              </div>

              <div className="pt-2">
                <Leaderboard key={active.slug} gameId={active.id} gameSlug={active.slug} />
              </div>
            </div>
          </GlassCard>
        </div>
      </main>

      <Footer />
    </>
  );
}
