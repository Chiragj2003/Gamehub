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
import { useLibrary } from "@/lib/library";
import type { Game } from "@/lib/db-queries";

export default function LibraryPage() {
  const { ids, ready, signedIn } = useLibrary();
  const [catalog, setCatalog] = useState<Game[] | null>(null);

  useEffect(() => {
    fetch("/api/games")
      .then((r) => (r.ok ? r.json() : []))
      .then((games: Game[]) => setCatalog(games))
      .catch(() => setCatalog([]));
  }, []);

  const loading = !ready || catalog === null;
  const saved = catalog ? catalog.filter((g) => ids.includes(g.id)) : [];

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-zinc-950 bg-grid-pattern py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400">
              <HugeiconsIcon icon={StarIcon} className="h-4 w-4" />
              Your collection
            </div>
            <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
              My Library
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
              {signedIn
                ? "Synced to your account. Saved games follow you to any device you sign in on."
                : "Saved on this device. Sign in to sync your library across devices."}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-4 rounded-xl border border-white/5 bg-zinc-900/10 p-5">
                  <Skeleton className="aspect-video w-full" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : saved.length === 0 ? (
            <GlassCard
              glowColor="none"
              className="mx-auto flex max-w-lg flex-col items-center justify-center space-y-6 border-dashed border-white/10 py-20 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/5 bg-zinc-950 text-zinc-500">
                <HugeiconsIcon icon={StarIcon} className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight text-white">Nothing saved yet</h3>
                <p className="mx-auto mt-1 max-w-xs text-xs text-zinc-500">
                  Hit &ldquo;Save to Library&rdquo; on any game page and it will show up here.
                </p>
              </div>
              <Link href="/">
                <button className="h-9 cursor-pointer rounded-full bg-primary px-6 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-neon-violet">
                  Browse games
                </button>
              </Link>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {saved.map((game) => (
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
