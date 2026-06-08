"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GameCard } from "@/components/GameCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type Game } from "@/db";

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function performSearch() {
      setLoading(true);
      try {
        const res = await fetch(`/api/games`);
        if (res.ok) {
          const allGames = await res.json() as Game[];
          // Client-side search match to be fast and consistent
          const filtered = allGames.filter((g: Game) =>
            g.title.toLowerCase().includes(query.toLowerCase()) ||
            g.description.toLowerCase().includes(query.toLowerCase()) ||
            g.category.toLowerCase().includes(query.toLowerCase())
          );
          setResults(filtered);
        }
      } catch (e) {
        console.warn("Failed to perform search:", e);
      } finally {
        setLoading(false);
      }
    }
    performSearch();
  }, [query]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-12">
        <div className="flex items-center gap-2 text-neon-violet font-bold text-xs uppercase tracking-widest mb-2">
          <HugeiconsIcon icon={Search01Icon} className="h-4 w-4" />
          Search Console
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
          Results for &quot;{query}&quot;
        </h1>
        <p className="text-sm text-zinc-400 mt-2">
          Found {loading ? "..." : results.length} games matching your search query.
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
      ) : results.length === 0 ? (
        <GlassCard glowColor="none" className="text-center py-20 border-dashed border-white/10 flex flex-col items-center justify-center max-w-lg mx-auto space-y-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950 border border-white/5 text-zinc-500">
            <HugeiconsIcon icon={Search01Icon} className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">No games found</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
              We couldn&apos;t find any games matching your keywords. Try checking spelling or search a different category.
            </p>
          </div>
          <Link href="/">
            <button className="h-9 px-6 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:bg-neon-violet transition-all cursor-pointer">
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
      
      <main className="flex-1 bg-zinc-950 bg-grid-pattern py-16">
        <Suspense fallback={
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-xl border border-white/5 bg-zinc-900/10 p-5 space-y-4">
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

