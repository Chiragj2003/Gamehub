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
      className={`pressable h-9 rounded-full transition-all duration-300 ${
        saved ? "accent-chip" : "btn-quiet text-ink-2 hover:text-diff-medium"
      } ${className ?? ""}`}
      style={saved ? ({ "--chip": "var(--diff-medium)" } as React.CSSProperties) : undefined}
    >
      <HugeiconsIcon
        icon={StarIcon}
        className={`h-4 w-4 transition-transform duration-300 ${saved ? "scale-110 fill-current" : ""}`}
      />
      <span>{saved ? "Saved" : "Save to Library"}</span>
    </Button>
  );
}
