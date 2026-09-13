import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, Trophy, GamepadIcon } from "@hugeicons/core-free-icons";
import { getGameBySlug, getGamesByCategory } from "@/lib/games";
import { CATALOG } from "@/lib/catalog";
import { categoryColor, difficultyColor } from "@/lib/accents";
import SaveGameButton from "@/components/SaveGameButton";
import GameScreen from "@/components/GameScreen";
import Leaderboard from "@/components/Leaderboard";
import { GameCard } from "@/components/GameCard";
import { GlassCard } from "@/components/ui/GlassCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Every game page is prerendered at build from the catalog and refreshed in
// the background; a visit never waits on the database. (Play counts on the
// page can lag by up to the revalidate window.)
export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return CATALOG.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) {
    return {
      title: "Game Not Found | Game Hub",
      description: "This game could not be found in our registry catalog.",
    };
  }

  return {
    title: `${game.title} - Play Online | Game Hub Remasters`,
    description: game.description,
  };
}

export default async function GameDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) {
    notFound();
  }

  // Fetch related games (same category, excluding the current game)
  const relatedList = await getGamesByCategory(game.category);
  const relatedGames = relatedList.filter(g => g.slug !== game.slug).slice(0, 3);

  const rules = (game.rulesJson as string[]) || [];
  const controls = (game.controlsJson as Record<string, string>) || {};
  const cat = categoryColor(game.category);
  const diff = difficultyColor(game.difficulty);

  return (
    <>
      <Navbar />

      <main className="flex-1 pb-24 pt-8 sm:pt-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            All games
          </Link>

          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ color: cat }}>
                  {game.category}
                </span>
                <span className="text-ink-3">·</span>
                <span
                  className="accent-chip rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                  style={{ "--chip": diff } as React.CSSProperties}
                >
                  {game.difficulty}
                </span>
              </div>
              <h1 className="text-[40px] font-black leading-none tracking-[-0.04em] text-ink sm:text-[56px]">{game.title}</h1>
            </div>

            <div className="flex items-center gap-3">
              <SaveGameButton gameId={game.id} />
              <div className="glass rounded-full px-4 py-2 text-right">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">Plays</span>
                <span className="font-mono text-[14px] font-bold text-ink">{game.plays.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mb-20 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <GameScreen gameId={game.id} gameTitle={game.title} gameSlug={game.slug} />

              <GlassCard>
                <h2 className="mb-2 text-[15px] font-bold text-ink">About</h2>
                <p className="text-[15px] leading-relaxed text-ink-2">{game.description}</p>
              </GlassCard>
            </div>

            <div className="space-y-6">
              <GlassCard>
                <div className="mb-4 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ color: cat }}>
                  <HugeiconsIcon icon={GamepadIcon} className="h-4 w-4" />
                  Controls
                </div>
                {Object.keys(controls).length === 0 ? (
                  <p className="text-[13px] text-ink-2">No special controls.</p>
                ) : (
                  <dl className="space-y-3">
                    {Object.entries(controls).map(([action, binding]) => (
                      <div key={action} className="flex items-start justify-between gap-4 border-b border-line pb-3 text-[13px] last:border-0 last:pb-0">
                        <dt className="capitalize text-ink-2">{action}</dt>
                        <dd className="text-right">
                          <kbd className="rounded-md border border-line bg-muted px-2 py-0.5 font-mono text-[11px] text-ink">
                            {binding}
                          </kbd>
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </GlassCard>

              <GlassCard>
                <div className="mb-4 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ color: cat }}>
                  <HugeiconsIcon icon={Trophy} className="h-4 w-4" />
                  How to win
                </div>
                {rules.length === 0 ? (
                  <p className="text-[13px] text-ink-2">Play and find out.</p>
                ) : (
                  <ul className="space-y-3">
                    {rules.map((rule, idx) => (
                      <li key={idx} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-2">
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                          style={{ color: cat, background: `color-mix(in srgb, ${cat} 14%, transparent)` }}
                        >
                          {idx + 1}
                        </span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCard>

              <Leaderboard gameId={game.id} gameSlug={game.slug} />
            </div>
          </div>

          {relatedGames.length > 0 && (
            <div className="border-t border-line pt-16">
              <h2 className="mb-8 text-[26px] font-black tracking-[-0.03em] text-ink">More {game.category.toLowerCase()} games</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {relatedGames.map((rg) => (
                  <GameCard key={rg.slug} {...rg} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
