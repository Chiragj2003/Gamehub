import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  /** Kept for callers; the card takes its glow from `accent` instead. */
  glowColor?: string;
  hoverEffect?: boolean;
  /** CSS colour (or var()) that tints the hover shadow. */
  accent?: string;
  onClick?: () => void;
}

export function GlassCard({ children, className, hoverEffect = false, accent, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        hoverEffect ? "glass-card" : "glass",
        "relative overflow-hidden rounded-3xl p-6",
        onClick && "cursor-pointer",
        className
      )}
      style={accent ? ({ "--card-accent": accent } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
