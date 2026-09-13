"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { CATALOG_GAMES } from "@/lib/catalog";
import { categoryColor, difficultyColor } from "@/lib/accents";

interface SearchOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Site search as a frosted panel over the page. Filters the catalog as you
 * type — no request, the catalog ships with the page. ⌘K / Ctrl+K opens it,
 * arrows move, Enter plays, Esc closes.
 */
export default function SearchOverlay({ open, onOpenChange }: SearchOverlayProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      q
        ? CATALOG_GAMES.filter(
            (g) =>
              g.title.toLowerCase().includes(q) ||
              g.category.toLowerCase().includes(q) ||
              g.description.toLowerCase().includes(q)
          )
        : CATALOG_GAMES,
    [q]
  );

  // Reset on open and focus the field.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Global shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => setActive(0), [q]);

  // Keep the highlighted row on screen.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (slug: string) => {
    onOpenChange(false);
    router.push(`/games/${slug}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active].slug);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/30 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search games"
    >
      <div className="glass-strong w-full max-w-xl overflow-hidden rounded-3xl">
        <div className="flex items-center gap-3 border-b border-line px-5">
          <HugeiconsIcon icon={Search01Icon} className="h-5 w-5 shrink-0 text-ink-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search games"
            aria-label="Search games"
            className="h-14 w-full bg-transparent text-[17px] text-ink placeholder:text-ink-3 focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded-md border border-line px-1.5 py-0.5 font-mono text-[11px] text-ink-3 sm:inline">
            esc
          </kbd>
        </div>

        {results.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-ink">No games match “{query}”</p>
            <p className="mt-1 text-xs text-ink-3">Try a category: arcade, retro, puzzle, action.</p>
          </div>
        ) : (
          <ul ref={listRef} className="max-h-[52vh] overflow-y-auto p-2" role="listbox">
            {results.map((g, i) => {
              const cat = categoryColor(g.category);
              const diff = difficultyColor(g.difficulty);
              const isActive = i === active;
              return (
                <li key={g.slug} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(g.slug)}
                    className={`flex w-full cursor-pointer items-center gap-4 rounded-2xl px-3 py-2.5 text-left transition-colors duration-150 ${
                      isActive ? "bg-[color-mix(in_srgb,var(--brand)_10%,transparent)]" : "hover:bg-muted"
                    }`}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-black uppercase tracking-wider"
                      style={{
                        color: cat,
                        background: `color-mix(in srgb, ${cat} 14%, transparent)`,
                        boxShadow: `0 0 18px -6px color-mix(in srgb, ${cat} 60%, transparent)`,
                      }}
                    >
                      {g.title.slice(0, 2)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">{g.title}</span>
                      <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-2">
                        <span style={{ color: cat }}>{g.category}</span>
                        <span className="text-ink-3">·</span>
                        <span style={{ color: diff }}>{g.difficulty}</span>
                      </span>
                    </span>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      className={`h-4 w-4 shrink-0 transition-all duration-150 ${isActive ? "translate-x-0 text-brand opacity-100" : "-translate-x-1 text-ink-3 opacity-0"}`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-[11px] text-ink-3">
          <span>
            <kbd className="font-mono">↑↓</kbd> move · <kbd className="font-mono">↵</kbd> play
          </span>
          <span>{results.length} of {CATALOG_GAMES.length}</span>
        </div>
      </div>
    </div>
  );
}
