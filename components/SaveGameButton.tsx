"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/lib/library";

interface SaveGameButtonProps {
  gameId: number;
  className?: string;
}

export default function SaveGameButton({ gameId, className }: SaveGameButtonProps) {
  const { has, toggle, ready } = useLibrary();
  const saved = has(gameId);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => toggle(gameId)}
      disabled={!ready}
      aria-pressed={saved}
      className={`rounded-full border transition-all duration-300 ${
        saved
          ? "border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:bg-amber-500/20"
          : "border-white/10 hover:border-amber-500/30 hover:text-amber-400"
      } ${className ?? ""}`}
    >
      <HugeiconsIcon
        icon={StarIcon}
        className={`h-4 w-4 transition-transform duration-300 ${saved ? "scale-110 fill-amber-400" : ""}`}
      />
      <span>{saved ? "Saved" : "Save to Library"}</span>
    </Button>
  );
}
