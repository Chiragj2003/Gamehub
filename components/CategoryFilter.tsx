"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { categoryColor } from "@/lib/accents";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  className?: string;
}

/** Segmented glass control; the selected segment takes its category's colour. */
export default function CategoryFilter({ categories, selectedCategory, onSelectCategory, className }: CategoryFilterProps) {
  const items: Array<{ label: string; value: string | null }> = [
    { label: "All", value: null },
    ...categories.map((c) => ({ label: c, value: c })),
  ];

  return (
    <div
      role="tablist"
      aria-label="Filter by category"
      className={cn("glass inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1", className)}
    >
      {items.map(({ label, value }) => {
        const selected = (selectedCategory ?? null)?.toLowerCase() === (value ?? null)?.toLowerCase();
        const color = value ? categoryColor(value) : "var(--brand)";
        return (
          <button
            key={label}
            role="tab"
            aria-selected={selected}
            onClick={() => onSelectCategory(value)}
            className={cn(
              "pressable shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all duration-200",
              selected ? "text-ink shadow-[inset_0_1px_0_var(--highlight),var(--shadow)]" : "text-ink-2 hover:text-ink"
            )}
            style={
              selected
                ? { background: `color-mix(in srgb, ${color} 14%, var(--bg-elevated))`, boxShadow: `inset 0 1px 0 var(--highlight), 0 0 16px -4px color-mix(in srgb, ${color} 50%, transparent)` }
                : undefined
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
