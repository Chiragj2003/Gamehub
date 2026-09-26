"use client";

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import type { GameProps } from "@/components/games/types";

/**
 * Maps a catalog slug to its game component.
 *
 * Each game is a separate dynamic import, so only the one being played is
 * downloaded. Rendering here directly — rather than through an iframe, as the
 * site once did — avoids booting a second document, a second React runtime,
 * and a second copy of the fonts for every play.
 */

const Loading = () => (
  <div className="flex h-full w-full items-center justify-center bg-zinc-950">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
  </div>
);

// next/dynamic requires the options object inline for static analysis.
const GAMES: Record<string, React.ComponentType<GameProps>> = {
  snake: dynamic(() => import("@/components/games/Snake").then((m) => m.ClassicSnake), { ssr: false, loading: Loading }),
  pong: dynamic(() => import("@/components/games/Pong").then((m) => m.ClassicPong), { ssr: false, loading: Loading }),
  tetris: dynamic(() => import("@/components/games/Tetris").then((m) => m.ClassicTetris), { ssr: false, loading: Loading }),
  "flappy-bird": dynamic(() => import("@/components/games/FlappyBird").then((m) => m.ClassicFlappyBird), { ssr: false, loading: Loading }),
  breakout: dynamic(() => import("@/components/games/Breakout").then((m) => m.ClassicBreakout), { ssr: false, loading: Loading }),
  asteroids: dynamic(() => import("@/components/games/Asteroids").then((m) => m.ClassicAsteroids), { ssr: false, loading: Loading }),
  "space-invaders": dynamic(() => import("@/components/games/SpaceInvaders").then((m) => m.ClassicSpaceInvaders), { ssr: false, loading: Loading }),
  pacman: dynamic(() => import("@/components/games/Pacman").then((m) => m.ClassicPacman), { ssr: false, loading: Loading }),
  "2048": dynamic(() => import("@/components/games/Game2048").then((m) => m.Classic2048), { ssr: false, loading: Loading }),
  dino: dynamic(() => import("@/components/games/Dino").then((m) => m.ClassicDino), { ssr: false, loading: Loading }),
  "pen-fight": dynamic(() => import("@/components/games/PenFight").then((m) => m.ClassicPenFight), { ssr: false, loading: Loading }),
};

interface GameRendererProps extends GameProps {
  slug: string;
}

export default function GameRenderer({ slug, onGameOver }: GameRendererProps) {
  // Keyboard focus belongs to the game while it is mounted; the engine's
  // input layer already swallows the keys that would scroll the page.
  useEffect(() => {
    window.focus();
  }, []);

  const Game = GAMES[slug];
  if (!Game) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-sm text-zinc-500">
        Unknown game: {slug}
      </div>
    );
  }
  return <Game onGameOver={onGameOver} />;
}

export const GAME_SLUGS = Object.keys(GAMES);

/**
 * The shape each game draws in, as width / height.
 *
 * The player used to be a fixed 4:3 box, 16:9 from md up, whatever the game
 * inside it drew — so a 4:3 board lost a bar down each side and Dino's 2:1
 * strip lost one top and bottom. Sizing the frame to the game instead gives
 * the same screen over to the board: Snake gains about a third more area on a
 * laptop.
 *
 * Kept beside the component map so adding a game means touching one file, and
 * defaulted so forgetting an entry costs a little letterboxing, not a break.
 */
const DEFAULT_ASPECT = 4 / 3;

const ASPECTS: Record<string, number> = {
  dino: 800 / 400,
  // 2048 is a DOM board that sizes itself; Pen Fight's renderer fills whatever
  // box it is given. Both are happiest in a wide frame.
  "2048": 4 / 3,
  "pen-fight": 16 / 9,
};

export function gameAspect(slug: string): number {
  return ASPECTS[slug] ?? DEFAULT_ASPECT;
}
