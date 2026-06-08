import React from "react";
import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon, StarIcon, Trophy } from "@hugeicons/core-free-icons";
import { GlassCard } from "./ui/GlassCard";
import { Badge } from "./ui/badge";

interface GameCardProps {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  rating: number;
  plays: number;
  slug: string;
  thumbnailUrl?: string | null;
}

export function GameCard({
  title,
  description,
  category,
  difficulty,
  rating,
  plays,
  slug,
  thumbnailUrl,
}: GameCardProps) {
  // Map difficulty to neon theme colors
  const diffColors = {
    Easy: { glow: "green" as const, text: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    Medium: { glow: "cyan" as const, text: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    Hard: { glow: "violet" as const, text: "text-violet-400 border-violet-500/20 bg-violet-500/5", badge: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  };

  const currentTheme = diffColors[difficulty as "Easy" | "Medium" | "Hard"] || diffColors.Easy;

  // If no thumbnail, use a cool stylized gradient placeholder
  const gradientClass = {
    Easy: "from-emerald-900/40 via-zinc-950 to-zinc-950",
    Medium: "from-cyan-900/40 via-zinc-950 to-zinc-950",
    Hard: "from-violet-900/40 via-zinc-950 to-zinc-950",
  }[difficulty as "Easy" | "Medium" | "Hard"] || "from-emerald-900/40 via-zinc-950 to-zinc-950";

  return (
    <Link href={`/games/${slug}`} className="block h-full">
      <GlassCard
        glowColor={currentTheme.glow}
        className="group flex h-full flex-col p-0! overflow-hidden border-white/5 bg-zinc-900/30! hover:bg-zinc-900/60! transition-all duration-300"
      >
        {/* Game Thumbnail / Placeholder */}
        <div className="relative aspect-video w-full overflow-hidden border-b border-white/5 bg-zinc-950">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br ${gradientClass} p-4 text-center transition-transform duration-500 group-hover:scale-105`}>
              <HugeiconsIcon icon={Trophy} className={`h-10 w-10 opacity-75 ${difficulty === "Easy" ? "text-emerald-400" : difficulty === "Medium" ? "text-cyan-400" : "text-violet-400"}`} />
              <span className="mt-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{category}</span>
            </div>
          )}
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-300 scale-90 group-hover:scale-100">
              <HugeiconsIcon icon={PlayIcon} className="h-6 w-6 fill-current" />
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-widest">{category}</span>
            <Badge variant="outline" className={`px-2 py-0 text-[10px] uppercase font-bold tracking-wider ${currentTheme.badge}`}>
              {difficulty}
            </Badge>
          </div>

          <h3 className="mt-2.5 text-xl font-bold tracking-tight text-white group-hover:text-primary transition-colors">
            {title}
          </h3>
          
          <p className="mt-2 text-sm text-zinc-400 line-clamp-2 leading-relaxed flex-1">
            {description}
          </p>

          {/* Footer inside card */}
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-1">
              <HugeiconsIcon icon={StarIcon} className="h-4 w-4 text-amber-400 fill-amber-400/20" />
              <span className="font-semibold text-zinc-200">{rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1 font-medium">
              <span>{plays.toLocaleString()} plays</span>
            </div>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
