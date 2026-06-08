"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export default function SearchBar({ placeholder = "Search games...", className }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");

  // Keep search bar in sync with URL queries
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setQuery(q);
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Search games input"
        className="w-full rounded-full border border-white/5 bg-zinc-950/40 py-1.5 pl-8 pr-4 text-xs text-zinc-300 placeholder-zinc-500 focus:border-neon-violet/50 focus:bg-zinc-950/80 focus:outline-none transition-all duration-300"
      />
      <button type="submit" className="absolute left-2.5 top-2.5 text-zinc-500 hover:text-white transition-colors" aria-label="Submit search">
        <HugeiconsIcon icon={Search01Icon} className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
