"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: "violet" | "cyan" | "green" | "pink" | "none";
  hoverEffect?: boolean;
  onClick?: () => void;
}

export function GlassCard({
  children,
  className,
  glowColor = "violet",
  hoverEffect = true,
  onClick,
}: GlassCardProps) {
  const glowClasses = {
    violet: "hover:border-neon-violet/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]",
    cyan: "hover:border-neon-cyan/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]",
    green: "hover:border-neon-green/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]",
    pink: "hover:border-neon-pink/40 hover:shadow-[0_0_20px_rgba(236,72,153,0.15)]",
    none: "",
  };

  const cardContent = (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/8 bg-black/45 p-6 backdrop-blur-md transition-all duration-300",
        hoverEffect && "hover:bg-zinc-950/60 hover:-translate-y-1",
        hoverEffect && glowColor !== "none" && glowClasses[glowColor],
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Background glow highlights */}
      {hoverEffect && glowColor !== "none" && (
        <div
          className={cn(
            "absolute -right-20 -top-20 -z-10 h-40 w-40 rounded-full blur-[80px] transition-opacity duration-500 opacity-20 hover:opacity-45",
            glowColor === "violet" && "bg-neon-violet",
            glowColor === "cyan" && "bg-neon-cyan",
            glowColor === "green" && "bg-neon-green",
            glowColor === "pink" && "bg-neon-pink"
          )}
        />
      )}
      {children}
    </div>
  );

  if (hoverEffect) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return cardContent;
}
