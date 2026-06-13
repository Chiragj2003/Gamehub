"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GlassCard } from "@/components/ui/GlassCard";
import Leaderboard from "@/components/Leaderboard";
import { HugeiconsIcon } from "@hugeicons/react";
import { Trophy, ArrowLeft01Icon, GamepadIcon } from "@hugeicons/core-free-icons";

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<"neon-snake" | "space-defender" | "memory-matrix">("neon-snake");

  const gameDetails = {
    "neon-snake": { id: 13, title: "Neon Snake", color: "green" },
    "space-defender": { id: 14, title: "Space Defender", color: "cyan" },
    "memory-matrix": { id: 15, title: "Memory Matrix", color: "violet" },
  };

  const getAccentColorClass = (color: string) => {
    switch (color) {
      case "green":
        return "text-neon-green border-neon-green/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]";
      case "cyan":
        return "text-neon-cyan border-neon-cyan/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]";
      case "violet":
        return "text-neon-violet border-neon-violet/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]";
      default:
        return "text-amber-400";
    }
  };

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-zinc-950 bg-grid-pattern py-12 min-h-screen">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Back Nav Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-white transition-colors uppercase tracking-wider mb-6 group"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Dashboard
          </Link>

          {/* Page Header */}
          <div className="text-center space-y-3 mb-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-white/5 shadow-2xl">
              <HugeiconsIcon icon={Trophy} className="h-7 w-7 text-amber-400 animate-pulse" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white">
              Global Leaderboards
            </h1>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Compare your high scores against elite players around the world. Play runs, secure top spots, and immortalize your name.
            </p>
          </div>

          {/* Game Selection Tabs */}
          <div className="grid grid-cols-3 gap-3 mb-8 bg-zinc-900/30 p-1.5 rounded-xl border border-white/5">
            {Object.entries(gameDetails).map(([slug, detail]) => {
              const isActive = activeTab === slug;
              const activeStyle = isActive
                ? {
                    green: "bg-neon-green/10 text-neon-green border-neon-green/20",
                    cyan: "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20",
                    violet: "bg-neon-violet/10 text-neon-violet border-neon-violet/20",
                  }[detail.color]
                : "text-zinc-500 hover:text-zinc-300 border-transparent";

              return (
                <button
                  key={slug}
                  onClick={() => setActiveTab(slug as "neon-snake" | "space-defender" | "memory-matrix")}
                  className={`py-3 px-4 rounded-lg border text-xs font-extrabold uppercase tracking-widest transition-all duration-300 flex flex-col sm:flex-row items-center justify-center gap-2 cursor-pointer ${activeStyle}`}
                >
                  <HugeiconsIcon icon={GamepadIcon} className="h-4 w-4 shrink-0" />
                  <span>{detail.title}</span>
                </button>
              );
            })}
          </div>

          {/* Active Leaderboard Panel */}
          <GlassCard
            glowColor={gameDetails[activeTab].color as "green" | "cyan" | "violet"}
            className={`border transition-all duration-500 bg-black/60! p-8 ${getAccentColorClass(gameDetails[activeTab].color)}`}
          >
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/5 gap-2">
                <div>
                  <h2 className="text-xl font-black uppercase text-white tracking-tight">
                    {gameDetails[activeTab].title} High Scores
                  </h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    Top 10 Registered Records
                  </p>
                </div>
                <Link
                  href={`/games/${activeTab}`}
                  className="inline-flex h-8 items-center px-4 rounded-full bg-white/5 border border-white/10 text-[10px] text-zinc-300 hover:text-white font-extrabold uppercase tracking-wider transition-colors hover:bg-white/10"
                >
                  Play now to compete
                </Link>
              </div>

              {/* Mount the individual game's leaderboard */}
              <div className="pt-2">
                <Leaderboard
                  gameId={gameDetails[activeTab].id}
                  gameSlug={activeTab}
                />
              </div>
            </div>
          </GlassCard>
        </div>
      </main>

      <Footer />
    </>
  );
}
