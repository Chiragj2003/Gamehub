"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  className?: string;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  className,
}: CategoryFilterProps) {
  return (
    <div className={cn("flex flex-wrap gap-2.5", className)}>
      <button
        onClick={() => onSelectCategory(null)}
        className={cn(
          "rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 border cursor-pointer",
          selectedCategory === null
            ? "border-neon-violet bg-neon-violet/10 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)]"
            : "border-white/5 text-zinc-400 bg-white/5 hover:border-white/15 hover:text-white"
        )}
      >
        All Games
      </button>
      {categories.map((cat) => {
        const isSelected = selectedCategory?.toLowerCase() === cat.toLowerCase();
        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 border cursor-pointer",
              isSelected
                ? "border-neon-violet bg-neon-violet/10 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)]"
                : "border-white/5 text-zinc-400 bg-white/5 hover:border-white/15 hover:text-white"
            )}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
