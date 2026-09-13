"use client";

import React, { useCallback, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamic imports from individual game files for optimal code splitting
const ClassicSnake = dynamic(() => import("@/components/games/Snake").then(mod => mod.ClassicSnake), { ssr: false });
const ClassicPong = dynamic(() => import("@/components/games/Pong").then(mod => mod.ClassicPong), { ssr: false });
const ClassicTetris = dynamic(() => import("@/components/games/Tetris").then(mod => mod.ClassicTetris), { ssr: false });
const ClassicFlappyBird = dynamic(() => import("@/components/games/FlappyBird").then(mod => mod.ClassicFlappyBird), { ssr: false });
const ClassicBreakout = dynamic(() => import("@/components/games/Breakout").then(mod => mod.ClassicBreakout), { ssr: false });
const ClassicAsteroids = dynamic(() => import("@/components/games/Asteroids").then(mod => mod.ClassicAsteroids), { ssr: false });
const ClassicSpaceInvaders = dynamic(() => import("@/components/games/SpaceInvaders").then(mod => mod.ClassicSpaceInvaders), { ssr: false });
const ClassicPacman = dynamic(() => import("@/components/games/Pacman").then(mod => mod.ClassicPacman), { ssr: false });
const Classic2048 = dynamic(() => import("@/components/games/Game2048").then(mod => mod.Classic2048), { ssr: false });
const ClassicDino = dynamic(() => import("@/components/games/Dino").then(mod => mod.ClassicDino), { ssr: false });

interface GameEmbedClientProps {
  slug: string;
}

export default function GameEmbedClient({ slug }: GameEmbedClientProps) {
  const onGameOver = useCallback((score: number) => {
    if (typeof window !== "undefined") {
      window.parent.postMessage({ type: "game-over", score }, "*");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.focus();
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const renderGame = () => {
    switch (slug) {
      case "snake": return <ClassicSnake onGameOver={onGameOver} />;
      case "pong": return <ClassicPong onGameOver={onGameOver} />;
      case "tetris": return <ClassicTetris onGameOver={onGameOver} />;
      case "flappy-bird": return <ClassicFlappyBird onGameOver={onGameOver} />;
      case "breakout": return <ClassicBreakout onGameOver={onGameOver} />;
      case "asteroids": return <ClassicAsteroids onGameOver={onGameOver} />;
      case "space-invaders": return <ClassicSpaceInvaders onGameOver={onGameOver} />;
      case "pacman": return <ClassicPacman onGameOver={onGameOver} />;
      case "2048": return <Classic2048 onGameOver={onGameOver} />;
      case "dino": return <ClassicDino onGameOver={onGameOver} />;
      default:
        return (
          <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-500 font-medium text-sm">
            Game not found: {slug}
          </div>
        );
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-950 flex items-center justify-center">
      {renderGame()}
    </div>
  );
}
