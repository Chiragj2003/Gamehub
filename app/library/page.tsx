"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GameCard } from "@/components/GameCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type Game } from "@/db";

export default function LibraryPage() {
  const [savedGames, setSavedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLibrary = async () => {
    try {
      const savedSlugs = JSON.parse(localStorage.getItem("game_hub_library") || "[]") as string[];

      const res = await fetch("/api/games");
      if (res.ok) {
        const allGames = await res.json() as Game[];
        const filtered = allGames.filter((g: Game) => savedSlugs.includes(g.slug));
        setSavedGames(filtered);
      }
    } catch (e) {
      console.warn("Could not load library from localStorage:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();

    // Listen to updates from SaveGameButton
    window.addEventListener("library-updated", loadLibrary);
    return () => window.removeEventListener("library-updated", loadLibrary);
  }, []);

  return (
    <>
      <Navbar />
      
      <main className="flex-1 bg-zinc-950 bg-grid-pattern py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="mb-12">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-widest mb-2">
              <HugeiconsIcon icon={StarIcon} className="h-4 w-4" />
              User Collection
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
              My Saved Library
            </h1>
            <p className="text-sm text-zinc-400 mt-2 max-w-md leading-relaxed">
              Quick access to your bookmarked retro games. Saved games are cached locally on your device.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-xl border border-white/5 bg-zinc-900/10 p-5 space-y-4">
                  <Skeleton className="aspect-video w-full" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : savedGames.length === 0 ? (
            <GlassCard glowColor="none" className="text-center py-20 border-dashed border-white/10 flex flex-col items-center justify-center max-w-lg mx-auto space-y-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950 border border-white/5 text-zinc-500">
                <HugeiconsIcon icon={StarIcon} className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Your library is empty</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                  Click the &quot;Save to Library&quot; button on any game page to build your personal collection here.
                </p>
              </div>
              <Link href="/">
                <button className="h-9 px-6 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:bg-neon-violet transition-all cursor-pointer">
                  Browse Catalog
                </button>
              </Link>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {savedGames.map((game) => (
                <GameCard key={game.slug} {...game} />
              ))}
            </div>
          )}
          
        </div>
      </main>

      <Footer />
    </>
  );
}

