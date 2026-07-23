import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon, StarIcon } from "@hugeicons/core-free-icons";
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
}: GameCardProps) {
  const diffColors: Record<string, string> = {
    Easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Medium: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    Hard: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  };

  const badgeClass = diffColors[difficulty] || diffColors.Easy;

  const accentColor = difficulty === "Easy" ? "group-hover:border-emerald-500/30"
    : difficulty === "Medium" ? "group-hover:border-cyan-500/30"
    : "group-hover:border-violet-500/30";

  return (
    <Link href={`/games/${slug}`} className="block h-full">
      <div className={`group flex h-full flex-col rounded-xl border border-white/6 bg-zinc-900/30 hover:bg-zinc-900/50 transition-all duration-200 overflow-hidden ${accentColor}`}>
        {/* Thumbnail area */}
        <div className="relative aspect-[16/10] w-full bg-zinc-950 flex items-center justify-center border-b border-white/5">
          <div className="text-zinc-700 group-hover:text-zinc-500 transition-colors">
            <HugeiconsIcon icon={PlayIcon} className="h-8 w-8" />
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <HugeiconsIcon icon={PlayIcon} className="h-5 w-5 text-white fill-current" />
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{category}</span>
            <Badge variant="outline" className={`px-1.5 py-0 text-[9px] uppercase font-bold tracking-wider ${badgeClass}`}>
              {difficulty}
            </Badge>
          </div>

          <h3 className="text-base font-bold tracking-tight text-white group-hover:text-primary transition-colors">
            {title}
          </h3>
          
          <p className="mt-1.5 text-[13px] text-zinc-500 line-clamp-2 leading-relaxed flex-1">
            {description}
          </p>

          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <HugeiconsIcon icon={StarIcon} className="h-3.5 w-3.5 text-amber-400 fill-amber-400/20" />
              <span className="font-medium text-zinc-300">{rating.toFixed(1)}</span>
            </div>
            <span className="font-medium">{plays.toLocaleString()} plays</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
