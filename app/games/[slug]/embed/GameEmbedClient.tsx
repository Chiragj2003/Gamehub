"use client";

import React, { useCallback, useEffect } from "react";
import dynamic from "next/dynamic";

const ClassicSnake = dynamic(() => import("@/components/ClassicGames").then(mod => mod.ClassicSnake), { ssr: false });
const ClassicPong = dynamic(() => import("@/components/ClassicGames").then(mod => mod.ClassicPong), { ssr: false });
const ClassicTetris = dynamic(() => import("@/components/ClassicGames").then(mod => mod.ClassicTetris), { ssr: false });
const ClassicFlappyBird = dynamic(() => import("@/components/ClassicGames").then(mod => mod.ClassicFlappyBird), { ssr: false });
const ClassicBreakout = dynamic(() => import("@/components/ClassicGames").then(mod => mod.ClassicBreakout), { ssr: false });
const ClassicAsteroids = dynamic(() => import("@/components/ClassicGames").then(mod => mod.ClassicAsteroids), { ssr: false });
const ClassicSpaceInvaders = dynamic(() => import("@/components/ClassicGames").then(mod => mod.ClassicSpaceInvaders), { ssr: false });
const ClassicPacman = dynamic(() => import("@/components/ClassicGames").then(mod => mod.ClassicPacman), { ssr: false });
const ClassicMemoryMatch = dynamic(() => import("@/components/ClassicGames").then(mod => mod.ClassicMemoryMatch), { ssr: false });
const ClassicConnectFour = dynamic(() => import("@/components/ClassicGames").then(mod => mod.ClassicConnectFour), { ssr: false });
const ClassicTicTacToe = dynamic(() => import("@/components/ClassicGames").then(mod => mod.ClassicTicTacToe), { ssr: false });
const Classic2048 = dynamic(() => import("@/components/ClassicGames").then(mod => mod.Classic2048), { ssr: false });

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
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for Space and Arrow keys inside the game iframe
      if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const renderGame = () => {
    switch (slug) {
      case "snake":
        return <ClassicSnake onGameOver={onGameOver} />;
      case "pong":
        return <ClassicPong onGameOver={onGameOver} />;
      case "tetris":
        return <ClassicTetris onGameOver={onGameOver} />;
      case "flappy-bird":
        return <ClassicFlappyBird onGameOver={onGameOver} />;
      case "breakout":
        return <ClassicBreakout onGameOver={onGameOver} />;
      case "asteroids":
        return <ClassicAsteroids onGameOver={onGameOver} />;
      case "space-invaders":
        return <ClassicSpaceInvaders onGameOver={onGameOver} />;
      case "pacman":
        return <ClassicPacman onGameOver={onGameOver} />;
      case "memory-match":
        return <ClassicMemoryMatch onGameOver={onGameOver} />;
      case "connect-four":
        return <ClassicConnectFour onGameOver={onGameOver} />;
      case "tic-tac-toe":
        return <ClassicTicTacToe onGameOver={onGameOver} />;
      case "2048":
        return <Classic2048 onGameOver={onGameOver} />;
      default:
        return (
          <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-xs">
            Game template not found: {slug}
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
