import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, Trophy, GamepadIcon } from "@hugeicons/core-free-icons";
import { getGameBySlug, getGamesByCategory, getAllGames } from "@/lib/games";
import SaveGameButton from "@/components/SaveGameButton";
import GameScreen from "@/components/GameScreen";
import GameConsole from "@/components/GameConsole";
import Leaderboard from "@/components/Leaderboard";
import { isPhaserGame } from "@/lib/gameRegistry";
import { GameCard } from "@/components/GameCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const list = await getAllGames();
  return list.map((g) => ({
    slug: g.slug,
  }));
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

  // Difficulty badge colors
  const diffBadgeClass = {
    Easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Medium: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    Hard: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  }[game.difficulty as "Easy" | "Medium" | "Hard"] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";

  // Parse rules list
  const rules = (game.rulesJson as string[]) || [];
  
  // Parse controls JSON
  const controls = (game.controlsJson as Record<string, string>) || {};

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-zinc-950 bg-grid-pattern py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Back Nav Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-white transition-colors uppercase tracking-wider mb-6 group"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to games
          </Link>

          {/* Game Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="space-y-2.5">
              <div className="flex items-center flex-wrap gap-2.5">
                <Badge className="bg-zinc-900 border-white/5 text-zinc-400 uppercase tracking-widest text-[9px] px-2.5 py-0.5 font-bold">
                  {game.category}
                </Badge>
                <Badge variant="outline" className={`uppercase tracking-wider text-[9px] font-extrabold px-2.5 py-0.5 ${diffBadgeClass}`}>
                  {game.difficulty}
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
                {game.title}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <SaveGameButton gameId={game.id} gameSlug={game.slug} />
              <div className="rounded-full border border-white/5 bg-zinc-900/30 px-4 py-2 text-right">
                <span className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold">
                  Total Plays
                </span>
                <span className="text-sm font-black text-white">
                  {game.plays.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Main Workspace Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            
            {/* Play Viewport Column */}
            <div className="lg:col-span-2 space-y-6">
              {isPhaserGame(game.slug) ? (
                <GameConsole gameId={game.id} gameTitle={game.title} gameSlug={game.slug} />
              ) : (
                <GameScreen gameId={game.id} gameTitle={game.title} gameSlug={game.slug} />
              )}
              
              {/* Game Info Panel */}
              <GlassCard glowColor="none" className="border-white/5 bg-zinc-900/20! p-6">
                <h3 className="text-lg font-bold uppercase tracking-tight text-white mb-2">
                  About the game
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {game.description}
                </p>
              </GlassCard>
            </div>

            {/* Side HUD Configuration Column */}
            <div className="space-y-6">
              
              {/* Controls Panel */}
              <GlassCard glowColor="none" className="border-white/5 bg-zinc-900/20! p-6">
                <div className="flex items-center gap-2 text-neon-violet font-bold text-xs uppercase tracking-widest mb-4">
                  <HugeiconsIcon icon={GamepadIcon} className="h-4 w-4" />
                  Controls Configuration
                </div>
                
                {Object.keys(controls).length === 0 ? (
                  <p className="text-xs text-zinc-500">No special control configurations needed.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(controls).map(([action, binding]) => (
                      <div key={action} className="flex items-center justify-between text-xs pb-2 border-b border-white/5 last:border-0 last:pb-0">
                        <span className="font-semibold text-zinc-400 capitalize">{action}</span>
                        <kbd className="rounded bg-zinc-800 border border-white/8 px-2 py-0.5 font-mono text-white text-[10px]">
                          {binding}
                        </kbd>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* Instructions Rules Panel */}
              <GlassCard glowColor="none" className="border-white/5 bg-zinc-900/20! p-6">
                <div className="flex items-center gap-2 text-neon-cyan font-bold text-xs uppercase tracking-widest mb-4">
                  <HugeiconsIcon icon={Trophy} className="h-4 w-4" />
                  Game Rules & Objectives
                </div>
                
                {rules.length === 0 ? (
                  <p className="text-xs text-zinc-500">Play and explore the game rules freely.</p>
                ) : (
                  <ul className="space-y-3">
                    {rules.map((rule, idx) => (
                      <li key={idx} className="flex gap-2.5 text-xs text-zinc-400 leading-relaxed align-top">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-950 border border-white/5 font-bold text-neon-cyan text-[10px]">
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

          {/* Related Games Row */}
          {relatedGames.length > 0 && (
            <div className="border-t border-white/5 pt-16">
              <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-8">
                Related {game.category} Games
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
export const dynamic = 'force-dynamic';
