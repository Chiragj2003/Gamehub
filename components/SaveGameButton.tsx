"use client";

import React, { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

interface SaveGameButtonProps {
  gameId: number;
  gameSlug: string;
  className?: string;
}

export default function SaveGameButton({ gameSlug, className }: SaveGameButtonProps) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Load local storage saved games
    try {
      const saved = localStorage.getItem("game_hub_library");
      if (saved) {
        const list = JSON.parse(saved) as string[];
        setIsSaved(list.includes(gameSlug));
      }
    } catch (e) {
      console.warn("Could not read library from localStorage:", e);
    }
  }, [gameSlug]);

  const handleToggle = () => {
    try {
      const saved = localStorage.getItem("game_hub_library");
      let list: string[] = saved ? JSON.parse(saved) : [];

      if (list.includes(gameSlug)) {
        list = list.filter(slug => slug !== gameSlug);
        setIsSaved(false);
      } else {
        list.push(gameSlug);
        setIsSaved(true);
      }

      localStorage.setItem("game_hub_library", JSON.stringify(list));
      // Dispatch custom event to notify other components (like Library page)
      window.dispatchEvent(new Event("library-updated"));
    } catch (e) {
      console.warn("Could not update library in localStorage:", e);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      className={`rounded-full border transition-all duration-300 ${
        isSaved
          ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          : "border-white/10 hover:border-amber-500/30 hover:text-amber-400"
      } ${className}`}
    >
      <HugeiconsIcon
        icon={StarIcon}
        className={`h-4 w-4 transition-transform duration-300 ${
          isSaved ? "fill-amber-400 scale-110" : "group-hover:scale-110"
        }`}
      />
      <span>{isSaved ? "Saved" : "Save to Library"}</span>
    </Button>
  );
}
