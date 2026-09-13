"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { GameProps } from "./types";
import { useGameInput, useLatest, type GameAction } from "@/lib/game-engine";

const SIZE = 4;
const BEST_KEY = "game_hub_2048_best";

type Grid = number[][];

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function addRandomTile(g: Grid): Grid {
  const empty: Array<[number, number]> = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return g;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = g.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function rotate(g: Grid): Grid {
  const out = emptyGrid();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      out[c][SIZE - 1 - r] = g[r][c];
    }
  }
  return out;
}

/** Slide every row left, merging equal neighbours once. Returns the gain. */
function slideLeft(g: Grid): { grid: Grid; gained: number } {
  let gained = 0;
  const grid = g.map((row) => {
    const tiles = row.filter((v) => v !== 0);
    for (let i = 0; i < tiles.length - 1; i++) {
      if (tiles[i] === tiles[i + 1]) {
        tiles[i] *= 2;
        gained += tiles[i];
        tiles.splice(i + 1, 1);
      }
    }
    while (tiles.length < SIZE) tiles.push(0);
    return tiles;
  });
  return { grid, gained };
}

/** Express every direction as "rotate, slide left, rotate back". */
function move(g: Grid, dir: "left" | "right" | "up" | "down") {
  const turns = { left: 0, up: 3, right: 2, down: 1 }[dir];
  let work = g;
  for (let i = 0; i < turns; i++) work = rotate(work);
  const { grid, gained } = slideLeft(work);
  work = grid;
  for (let i = 0; i < (4 - turns) % 4; i++) work = rotate(work);
  return { grid: work, gained };
}

function hasMoves(g: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] === 0) return true;
      if (r < SIZE - 1 && g[r][c] === g[r + 1][c]) return true;
      if (c < SIZE - 1 && g[r][c] === g[r][c + 1]) return true;
    }
  }
  return false;
}

function same(a: Grid, b: Grid) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

function freshGame(): Grid {
  return addRandomTile(addRandomTile(emptyGrid()));
}

const TILE_STYLES: Record<number, string> = {
  2: "bg-zinc-800 text-zinc-300",
  4: "bg-zinc-700 text-zinc-100",
  8: "bg-emerald-500/20 text-emerald-300",
  16: "bg-cyan-500/20 text-cyan-300",
  32: "bg-violet-500/25 text-violet-300",
  64: "bg-pink-500/25 text-pink-300",
  128: "bg-rose-500/30 text-rose-200",
  256: "bg-amber-400/30 text-amber-200",
  512: "bg-emerald-400/35 text-emerald-100",
  1024: "bg-cyan-400/40 text-cyan-50",
  2048: "bg-violet-400 text-white shadow-[0_0_28px_rgba(167,139,250,0.7)]",
};

export const Classic2048: React.FC<GameProps> = ({ onGameOver }) => {
  const [grid, setGrid] = useState<Grid>(() => freshGame());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [won, setWon] = useState(false);
  const [over, setOver] = useState(false);
  const onGameOverRef = useLatest(onGameOver);
  const boardRef = useRef<HTMLDivElement>(null);

  // The score lives in a ref for the move handler so the value reported at
  // game over includes the final merge; reading React state there gave the
  // score from one move earlier.
  const scoreRef = useRef(0);
  const gridRef = useLatest(grid);
  const overRef = useLatest(over);

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(BEST_KEY)) || 0);
    } catch {
      // Storage unavailable; best score simply resets each visit.
    }
  }, []);

  const applyMove = useCallback(
    (dir: "left" | "right" | "up" | "down") => {
      if (overRef.current) return;
      const current = gridRef.current;
      const { grid: next, gained } = move(current, dir);
      if (same(current, next)) return;

      const spawned = addRandomTile(next);
      scoreRef.current += gained;
      const newScore = scoreRef.current;
      setGrid(spawned);
      setScore(newScore);

      if (newScore > best) {
        setBest(newScore);
        try {
          localStorage.setItem(BEST_KEY, String(newScore));
        } catch {
          // Ignore; storage may be disabled.
        }
      }

      if (!won && spawned.some((row) => row.includes(2048))) setWon(true);

      if (!hasMoves(spawned)) {
        setOver(true);
        setTimeout(() => onGameOverRef.current(newScore), 900);
      }
    },
    [best, won, gridRef, overRef, onGameOverRef]
  );

  useGameInput({
    target: boardRef,
    queueDirections: false,
    enableSwipe: true,
    onAction: (action: GameAction) => {
      if (action === "left" || action === "right" || action === "up" || action === "down") {
        applyMove(action);
      }
    },
  });

  const restart = () => {
    scoreRef.current = 0;
    setGrid(freshGame());
    setScore(0);
    setWon(false);
    setOver(false);
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950 p-6 font-sans select-none">
      <div className="mb-5 flex w-full max-w-xs items-end justify-between">
        <div className="flex gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Score</div>
            <div className="font-mono text-2xl font-black text-cyan-300">{score}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Best</div>
            <div className="font-mono text-2xl font-black text-zinc-300">{best}</div>
          </div>
        </div>
        <button
          onClick={restart}
          className="h-8 cursor-pointer rounded-full border border-white/10 bg-zinc-900 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          New game
        </button>
      </div>

      <div
        ref={boardRef}
        className="relative grid w-full max-w-xs aspect-square grid-cols-4 gap-3 rounded-2xl border border-white/5 bg-zinc-900/60 p-3.5 touch-none"
        role="grid"
        aria-label="2048 board"
      >
        {grid.map((row, r) =>
          row.map((val, c) => {
            const style = val === 0 ? "bg-zinc-950/60" : TILE_STYLES[val] ?? "bg-white text-black";
            const size = val >= 1024 ? "text-lg" : val >= 128 ? "text-xl" : "text-2xl";
            return (
              <div
                key={`${r}-${c}`}
                role="gridcell"
                className={`flex items-center justify-center rounded-xl font-black transition-all duration-150 ${size} ${style}`}
              >
                {val === 0 ? "" : val}
              </div>
            );
          })
        )}

        {(won || over) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-950/85 backdrop-blur-sm">
            <div className="text-3xl font-black uppercase tracking-tight text-white">
              {over ? "No moves left" : "You made 2048!"}
            </div>
            {won && !over && (
              <button
                onClick={() => setWon(false)}
                className="cursor-pointer rounded-full bg-white px-5 py-2 text-xs font-bold uppercase tracking-wider text-black transition-opacity hover:opacity-90"
              >
                Keep going
              </button>
            )}
          </div>
        )}
      </div>

      <p className="mt-4 text-[11px] font-medium text-zinc-500">Arrow keys, WASD, or swipe</p>
    </div>
  );
};
