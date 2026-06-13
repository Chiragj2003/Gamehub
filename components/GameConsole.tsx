"use client";

import React from "react";
import dynamic from "next/dynamic";

const GameConsoleImpl = dynamic(
  () => import("./GameConsoleImpl"),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-video w-full items-center justify-center bg-zinc-950 text-zinc-500 border border-white/5 rounded-xl animate-pulse">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Loading Engine Context</h4>
            <p className="text-[10px] text-zinc-500">Initializing procedural WebGL scene graph...</p>
          </div>
        </div>
      </div>
    ),
  }
);

interface GameConsoleProps {
  gameId: number;
  gameTitle: string;
  gameSlug: string;
}

export default function GameConsole(props: GameConsoleProps) {
  return <GameConsoleImpl {...props} />;
}
