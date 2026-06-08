"use client";

import React, { useState, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { GamepadIcon, SparklesIcon, ArrowRight01Icon, Gamepad2Icon } from "@hugeicons/core-free-icons";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GameCard } from "@/components/GameCard";
import { GlassCard } from "@/components/ui/GlassCard";
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

  // Filter out featured games (e.g., Snake, Tetris, Space Invaders)
  const featuredSlugs = ["snake", "tetris", "space-invaders"];
  const featuredGames = gamesList.filter(g => featuredSlugs.includes(g.slug));

  // Compute unique categories dynamically
  const uniqueCategories = Array.from(new Set(gamesList.map(g => g.category)));

  // Filter games based on selected category pill
  const filteredGames = selectedCategory
    ? gamesList.filter(g => g.category.toLowerCase() === selectedCategory.toLowerCase())
    : gamesList;

  // Build categories list dynamically with custom styling details
  const categoriesData = uniqueCategories.map(name => {
    const iconMap: Record<string, React.ComponentProps<typeof HugeiconsIcon>["icon"]> = {
      Arcade: GamepadIcon,
      Puzzle: SparklesIcon,
      Retro: Gamepad2Icon,
    };
    return {
      name,
      description: name === "Arcade"
        ? "High-octane reflexes, endless action, and high-score chases."
        : name === "Puzzle"
        ? "Test your logic, planning, and block-arranging quick wit."
        : name === "Retro"
        ? "Old-school 80s and 90s console favorites, modernized."
        : "Classic tactical thinking and strategic card placements.",
      color: name === "Arcade" ? ("green" as const) : name === "Puzzle" ? ("cyan" as const) : ("violet" as const),
      icon: iconMap[name] || GamepadIcon,
      count: gamesList.filter(g => g.category === name).length,
    };
  });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
  };

  return (
    <>
      <Navbar />
      
      <main className="flex-1 bg-zinc-950 bg-grid-pattern">
        
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-20 pb-28 border-b border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,var(--neon-violet),transparent_60%)] opacity-12 pointer-events-none" />
          
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-neon-violet/30 bg-neon-violet/5 px-4 py-1.5 text-xs font-semibold text-neon-violet text-glow-violet uppercase tracking-widest mb-6"
            >
              <span className="h-2 w-2 rounded-full bg-neon-violet animate-pulse" />
              Next-Gen Retro Remasters
            </motion.div>

            <motion.h1
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white mb-6"
            >
              Re-Experience <br />
              <span className="bg-gradient-to-r from-neon-violet via-indigo-400 to-neon-cyan bg-clip-text text-transparent">
                Arcade Perfection
              </span>
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-400 leading-relaxed mb-10"
            >
              Diving deep into retro nostalgia. Experience classic gameplay mechanics rebuilt from the ground up with high-framerate rendering, visual neon glows, and local leaderboards.
            </motion.p>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <a href="#featured">
                <button className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-bold shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] hover:bg-neon-violet transition-all cursor-pointer active:scale-98">
                  Browse Games
                </button>
              </a>
              <a href="/library">
                <button className="h-12 px-8 rounded-full border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold transition-all cursor-pointer flex items-center gap-2">
                  My Library
                  <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
                </button>
              </a>
            </motion.div>

            {/* Live Metrics Grid */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
            >
              {[
                { label: "Active Players", val: "14,802", highlight: true },
                { label: "Seeded Titles", val: `${loading ? "12" : gamesList.length} Games`, highlight: false },
                { label: "Matches Played", val: "248k+", highlight: false },
                { label: "Avg FPS Sync", val: "99.9%", highlight: false },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className="rounded-xl border border-white/5 bg-zinc-900/30 p-4 backdrop-blur-xs"
                >
                  <span className="block text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                    {stat.label}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-1.5">
                    {stat.highlight && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />}
                    {stat.val}
                  </span>
                </motion.div>
              ))}
            </motion.div>

          </div>
        </section>

        {/* FEATURED GAMES SECTION */}
        <section id="featured" className="py-24 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="flex items-center gap-2 text-neon-cyan font-bold text-xs uppercase tracking-widest mb-2">
                <HugeiconsIcon icon={SparklesIcon} className="h-4 w-4" />
                Featured Selection
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
                Remastered Classics
              </h2>
            </div>
            <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
              Curated games refined with instant responsive mechanics. Challenge yourself or push your limits for the next local record.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl border border-white/5 bg-zinc-900/10 p-5 space-y-4">
                  <Skeleton className="aspect-video w-full" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {featuredGames.map((game) => (
                <motion.div key={game.slug} variants={itemVariants}>
                  <GameCard {...game} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* LIBRARY GRID / ALL GAMES GRID */}
        <section className="py-24 border-t border-white/5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-6">
              <div>
                <span className="text-neon-violet font-bold text-xs uppercase tracking-widest mb-2 inline-block">
                  Arcade Floor
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
                  Game Catalog
                </h2>
              </div>
              
              {/* Category Pills Filter */}
              {!loading && (
                <CategoryFilter
                  categories={uniqueCategories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded-xl border border-white/5 bg-zinc-900/10 p-5 space-y-4">
                    <Skeleton className="aspect-video w-full" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : filteredGames.length === 0 ? (
              <GlassCard glowColor="none" className="text-center py-12 border-dashed border-white/10">
                <p className="text-zinc-500">No games found in this category.</p>
              </GlassCard>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                {filteredGames.map((game) => (
                  <motion.div key={game.slug} variants={itemVariants}>
                    <GameCard {...game} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>

        {/* GAME CATEGORIES DETAILS SECTION */}
        <section className="py-24 border-t border-white/5 bg-zinc-950/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            
            <div className="text-center max-w-xl mx-auto mb-16">
              <span className="text-neon-violet font-bold text-xs uppercase tracking-widest mb-2 inline-block">
                Choose Your Vibe
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white mb-4">
                Explore Categories
              </h2>
              <p className="text-sm text-zinc-400">
                Filter and browse your favorite genres. From reflex-testing arcade shooters to brain-bending puzzle mechanics.
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-xl border border-white/5 bg-zinc-900/10 p-8 space-y-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {categoriesData.map((cat) => {
                  const borderGlowClass = {
                    green: "hover:border-neon-green/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.1)]",
                    cyan: "hover:border-neon-cyan/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]",
                    violet: "hover:border-neon-violet/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]",
                  }[cat.color];

                  const textGlowClass = {
                    green: "text-neon-green text-glow-green",
                    cyan: "text-neon-cyan text-glow-cyan",
                    violet: "text-neon-violet text-glow-violet",
                  }[cat.color];

                  return (
                    <motion.div key={cat.name} variants={itemVariants}>
                      <div className="cursor-pointer" onClick={() => {
                        setSelectedCategory(cat.name);
                        const element = document.getElementById("featured");
                        if (element) {
                          element.scrollIntoView({ behavior: "smooth" });
                        }
                      }}>
                        <GlassCard
                          glowColor="none"
                          className={`group/cat h-full border-white/5 bg-zinc-900/20! p-8 hover:bg-zinc-900/40! transition-all duration-300 ${borderGlowClass}`}
                        >
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950 border border-white/5 transition-colors group-hover/cat:border-white/15">
                              <HugeiconsIcon icon={cat.icon} className={`h-6 w-6 ${textGlowClass}`} />
                            </div>
                            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                              {cat.count} games
                            </span>
                          </div>
                          <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-2 group-hover/cat:text-white">
                            {cat.name}
                          </h3>
                          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                            {cat.description}
                          </p>
                          <div className="flex items-center gap-1 text-xs font-bold text-zinc-400 group-hover/cat:text-white transition-colors">
                            Filter category
                            <HugeiconsIcon icon={ArrowRight01Icon} className="h-3.5 w-3.5 transition-transform group-hover/cat:translate-x-1" />
                          </div>
                        </GlassCard>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
