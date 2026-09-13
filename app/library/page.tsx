"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GameCard } from "@/components/GameCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useLibrary } from "@/lib/library";
import { CATALOG_GAMES } from "@/lib/catalog";

export default function LibraryPage() {
  const { ids, ready, signedIn } = useLibrary();

  const loading = !ready;
  const saved = CATALOG_GAMES.filter((g) => ids.includes(g.id));

  return (
    <>
      <Navbar />

      <main className="flex-1 pb-24 pt-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-diff-medium">
              <HugeiconsIcon icon={StarIcon} className="h-4 w-4" />
              Your collection
            </div>
            <h1 className="text-[40px] font-black tracking-[-0.04em] text-ink sm:text-[56px]">Library</h1>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-2">
              {signedIn
                ? "Synced to your account. Saved games follow you to any device you sign in on."
                : "Saved on this device. Sign in to sync your library across devices."}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
                  <Skeleton className="aspect-video w-full" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : saved.length === 0 ? (
            <GlassCard className="mx-auto flex max-w-lg flex-col items-center justify-center space-y-6 py-20 text-center">
              <div className="glass flex h-12 w-12 items-center justify-center rounded-2xl text-ink-2">
                <HugeiconsIcon icon={StarIcon} className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-[20px] font-bold tracking-[-0.02em] text-ink">Nothing saved yet</h3>
                <p className="mx-auto mt-1 max-w-xs text-[14px] text-ink-2">
                  Tap &ldquo;Save to Library&rdquo; on any game and it shows up here.
                </p>
              </div>
              <Link href="/" className="btn-glow inline-flex h-11 items-center rounded-full px-7 text-[14px] font-semibold">
                Browse games
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
