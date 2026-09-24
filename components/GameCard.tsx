import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon, StarIcon } from "@hugeicons/core-free-icons";
import { categoryColor, difficultyColor } from "@/lib/accents";
import { isTrending } from "@/lib/catalog";

interface GameCardProps {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  rating: number;
  plays: number;
  slug: string;
}

/**
 * One game. The whole card is the link; the category colour bleeds into the
 * hover shadow so the grid reads as four families of games, not ten boxes.
 */
export function GameCard({ title, description, category, difficulty, rating, plays, slug }: GameCardProps) {
  const cat = categoryColor(category);
  const diff = difficultyColor(difficulty);
  const trending = isTrending(slug);

  return (
    <Link
      href={`/games/${slug}`}
      aria-label={`Play ${title}`}
      className="glass-card group flex h-full flex-col overflow-hidden rounded-3xl focus-visible:outline-2"
      style={{ "--card-accent": cat } as React.CSSProperties}
    >
      {/* Art well: the category colour as a soft field with the game's initials. */}
      <div
        className="relative flex aspect-[16/10] items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${cat} 22%, transparent), transparent 70%)` }}
      >
        <span
          className="select-none text-[64px] font-black leading-none tracking-[-0.06em] transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-110"
          style={{ color: `color-mix(in srgb, ${cat} 55%, transparent)` }}
          aria-hidden="true"
        >
          {title.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase()}
        </span>

        {trending && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-gradient-to-br from-brand to-brand-2 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white shadow-[0_4px_14px_-4px_var(--brand-glow)]">
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-current" aria-hidden>
              <path d="M6 0C6 3 3.5 3.5 2.2 5.4A4.4 4.4 0 0 0 1.5 8a4.5 4.5 0 0 0 9 0c0-2.2-1.4-3.3-2.3-4.6-.3 1-.9 1.6-1.5 2C6.6 4 7 2.2 6 0Z" />
            </svg>
            Trending
          </span>
        )}

        {/* Play affordance: hidden until hover/focus so the grid stays calm. */}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/10 group-focus-visible:bg-black/10">
          <span className="btn-glow flex h-12 w-12 scale-75 items-center justify-center rounded-full opacity-0 transition-all duration-300 ease-[var(--ease-spring)] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100">
            <HugeiconsIcon icon={PlayIcon} className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: cat }}>
            {category}
          </span>
          <span
            className="accent-chip rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{ "--chip": diff } as React.CSSProperties}
          >
            {difficulty}
          </span>
        </div>

        <h3 className="text-[17px] font-bold tracking-[-0.01em] text-ink">{title}</h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-[13.5px] leading-relaxed text-ink-2">{description}</p>

        <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5 text-xs text-ink-3">
          <span className="flex items-center gap-1">
            <HugeiconsIcon icon={StarIcon} className="h-3.5 w-3.5 fill-current text-diff-medium" />
            <span className="font-semibold text-ink-2">{rating.toFixed(1)}</span>
          </span>
          <span className="font-medium">{plays.toLocaleString()} plays</span>
        </div>
      </div>
    </Link>
  );
}
