"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GameCard } from "@/components/GameCard";
import CategoryFilter from "@/components/CategoryFilter";
import { Skeleton } from "@/components/ui/skeleton";
import { type Game } from "@/db";

export default function Home() {
  const [gamesList, setGamesList] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    async function loadGames() {
      try {
        const res = await fetch("/api/games");
        if (res.ok) {
          const data = await res.json() as Game[];
          setGamesList(data);
        }
      } catch (err) {
        console.warn("Failed to load games:", err);
      } finally {
        setLoading(false);
      }
    }
    loadGames();
  }, []);

  const uniqueCategories = Array.from(new Set(gamesList.map(g => g.category)));

  const filteredGames = selectedCategory
    ? gamesList.filter(g => g.category.toLowerCase() === selectedCategory.toLowerCase())
    : gamesList;

  return (
    <>
      <Navbar />
      
      <main className="flex-1 bg-background">
        
        {/* HERO SECTION — clean, minimal, content-first */}
        <section className="relative pt-20 pb-16 border-b border-white/5">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-4">
              Play. Compete.{" "}
              <span className="text-neon-violet">Repeat.</span>
            </h1>

            <p className="max-w-xl mx-auto text-base text-zinc-400 leading-relaxed mb-10">
              Classic arcade and puzzle games, rebuilt for the browser. No downloads, no ads, just play.
            </p>

            <div className="flex items-center justify-center gap-3">
              <a href="#games">
                <button className="h-11 px-7 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer">
                  Browse Games
                </button>
              </a>
              <a href="/library">
                <button className="h-11 px-7 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/8 text-white font-semibold text-sm transition-all cursor-pointer">
                  My Library
                </button>
              </a>
            </div>

            {/* Quick stats — real data only */}
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-zinc-500">
              <div>
                <span className="text-white font-bold text-lg">{loading ? "—" : gamesList.length}</span>
                <span className="ml-1.5">Games</span>
              </div>
              <div className="w-px h-5 bg-white/10" />
              <div>
                <span className="text-white font-bold text-lg">{loading ? "—" : uniqueCategories.length}</span>
                <span className="ml-1.5">Categories</span>
              </div>
              <div className="w-px h-5 bg-white/10" />
              <div>
                <span className="text-white font-bold text-lg">Free</span>
                <span className="ml-1.5">Forever</span>
              </div>
            </div>
          </div>
        </section>

        {/* GAMES GRID — the main content */}
        <section id="games" className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  All Games
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {filteredGames.length} {selectedCategory ? `${selectedCategory} games` : "games available"}
                </p>
              </div>
              
              {!loading && (
                <CategoryFilter
                  categories={uniqueCategories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="rounded-xl border border-white/5 bg-zinc-900/20 p-4 space-y-3">
                    <Skeleton className="aspect-[16/10] w-full rounded-lg" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : filteredGames.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
                <p className="text-zinc-500">No games found in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredGames.map((game) => (
                  <GameCard key={game.slug} {...game} />
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
