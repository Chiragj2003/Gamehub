"use client";

import React, { useMemo, useState } from "react";
import { GameCard } from "@/components/GameCard";
import CategoryFilter from "@/components/CategoryFilter";
import Reveal from "@/components/Reveal";
import type { Game } from "@/lib/catalog";

/** The catalog arrives rendered from the server; only the filter is client state. */
export default function HomeContent({ games }: { games: Game[] }) {
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => Array.from(new Set(games.map((g) => g.category))), [games]);
  const visible = category ? games.filter((g) => g.category.toLowerCase() === category.toLowerCase()) : games;

  return (
    <section id="games" className="pb-28 pt-4 sm:pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-[28px] font-black tracking-[-0.03em] text-ink sm:text-[32px]">All games</h2>
            <p className="mt-1 text-[15px] text-ink-2">
              {visible.length} {category ? category.toLowerCase() : ""} {visible.length === 1 ? "game" : "games"}
            </p>
          </div>
          <CategoryFilter categories={categories} selectedCategory={category} onSelectCategory={setCategory} />
        </div>

        {visible.length === 0 ? (
          <div className="glass rounded-3xl py-20 text-center">
            <p className="text-[15px] text-ink-2">Nothing in this category yet.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" key={category ?? "all"}>
            {visible.map((game, i) => (
              <Reveal key={game.slug} as="li" index={i} className="h-full">
                <GameCard {...game} />
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
