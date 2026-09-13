"use client";

import React, { useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GameCard } from "@/components/GameCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CATALOG_GAMES } from "@/lib/catalog";

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const q = query.trim().toLowerCase();
  // The catalog ships with the page; searching it needs no request.
  const results = useMemo(
    () =>
      q
        ? CATALOG_GAMES.filter(
            (g) =>
              g.title.toLowerCase().includes(q) ||
              g.description.toLowerCase().includes(q) ||
              g.category.toLowerCase().includes(q)
          )
        : CATALOG_GAMES,
    [q]
  );
  const loading = false;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-12">
        <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-widest mb-2">
          <HugeiconsIcon icon={Search01Icon} className="h-4 w-4" />
          Search Console
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-ink">
          Results for &quot;{query}&quot;
        </h1>
        <p className="text-sm text-ink-2 mt-2">
          Found {loading ? "..." : results.length} games matching your search query.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl border border-line bg-surface p-5 space-y-4">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <GlassCard className="mx-auto flex max-w-lg flex-col items-center justify-center space-y-6 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-page border border-line text-ink-2">
            <HugeiconsIcon icon={Search01Icon} className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink tracking-[-0.02em]">No games found</h3>
            <p className="text-xs text-ink-2 mt-1 max-w-xs mx-auto">
              We couldn&apos;t find any games matching your keywords. Try checking spelling or search a different category.
            </p>
          </div>
          <Link href="/">
            <button className="h-9 px-6 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer">
              Return to Catalog
            </button>
          </Link>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {results.map((game) => (
            <GameCard key={game.slug} {...game} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <>
      <Navbar />
      
      <main className="flex-1 bg-page py-16">
        <Suspense fallback={
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-2xl border border-line bg-surface p-5 space-y-4">
                  <Skeleton className="aspect-video w-full" />
                  <Skeleton className="h-5 w-2/3" />
                </div>
              ))}
            </div>
          </div>
        }>
          <SearchResultsContent />
        </Suspense>
      </main>

      <Footer />
    </>
  );
}

