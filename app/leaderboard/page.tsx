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

      <main className="flex-1 bg-zinc-950 bg-grid-pattern py-12 min-h-screen">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-white transition-colors uppercase tracking-wider mb-6 group"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to games
          </Link>

          <div className="text-center space-y-3 mb-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-white/5 shadow-2xl">
              <HugeiconsIcon icon={Trophy} className="h-7 w-7 text-amber-400" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white">Leaderboards</h1>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Top 10 scores for every game. Post a run to see your initials here.
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
                  className={`h-9 px-4 rounded-full border text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    isActive
                      ? "bg-white text-black border-white"
                      : "bg-zinc-900/40 text-zinc-400 border-white/10 hover:text-white hover:border-white/25"
                  }`}
                >
                  {g.title}
                </button>
              );
            })}
          </div>

          <GlassCard glowColor="none" className="border border-white/10 bg-black/60! p-8">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/5 gap-2">
                <div>
                  <h2 className="text-xl font-black uppercase text-white tracking-tight">{active.title}</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    {active.category} · {active.difficulty}
                  </p>
                </div>
                <Link
                  href={`/games/${active.slug}`}
                  className="inline-flex h-8 items-center px-4 rounded-full bg-white/5 border border-white/10 text-[10px] text-zinc-300 hover:text-white font-extrabold uppercase tracking-wider transition-colors hover:bg-white/10"
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
