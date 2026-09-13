"use client";

import React, { useMemo, useState } from "react";
import { GameCard } from "@/components/GameCard";
import CategoryFilter from "@/components/CategoryFilter";
import type { Game } from "@/lib/db-queries";

/**
 * The interactive part of the home page. The catalog arrives already
 * rendered from the server; only the category filter needs client state.
 */
export default function HomeContent({ games }: { games: Game[] }) {
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => Array.from(new Set(games.map((g) => g.category))), [games]);
  const visible = category
    ? games.filter((g) => g.category.toLowerCase() === category.toLowerCase())
    : games;

  return (
    <section id="games" className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">All Games</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {visible.length} {category ? `${category} games` : "games"}
            </p>
          </div>
          <CategoryFilter
            categories={categories}
            selectedCategory={category}
            onSelectCategory={setCategory}
          />
        </div>

        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 py-16 text-center">
            <p className="text-zinc-500">No games in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((game) => (
              <GameCard key={game.slug} {...game} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
