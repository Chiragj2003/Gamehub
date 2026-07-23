"use client";
import React, { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon } from "@hugeicons/core-free-icons";
import { GameProps } from "./types";

export const Classic2048: React.FC<GameProps> = ({ onGameOver }) => {
  const [grid, setGrid] = useState<number[][]>(Array(4).fill(0).map(() => Array(4).fill(0)));
  const [score, setScore] = useState(0);

  const initGame = () => {
    let newGrid = Array(4).fill(0).map(() => Array(4).fill(0));
    newGrid = addRandomTile(newGrid);
    newGrid = addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
  };

  const addRandomTile = (g: number[][]) => {
    const emptyCells = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (g[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return g;
    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newG = g.map(row => [...row]);
    newG[r][c] = Math.random() < 0.9 ? 2 : 4;
    return newG;
  };

  useEffect(() => {
    initGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotateGrid = (g: number[][]) => {
    const rotated = Array(4).fill(0).map(() => Array(4).fill(0));
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        rotated[c][3 - r] = g[r][c];
      }
    }
    return rotated;
  };

  const slideLeft = (g: number[][]) => {
    let addedScore = 0;
    const shifted = g.map(row => {
      // Filter non-zero
      let filtered = row.filter(val => val !== 0);
      // Merge
      for (let i = 0; i < filtered.length - 1; i++) {
        if (filtered[i] === filtered[i + 1]) {
          filtered[i] *= 2;
          addedScore += filtered[i];
          filtered.splice(i + 1, 1);
        }
      }
      // Pad zeroes
      while (filtered.length < 4) {
        filtered.push(0);
      }
      return filtered;
    });
    return { shifted, addedScore };
  };

  const checkGameOver = (g: number[][]) => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (g[r][c] === 0) return false;
        if (r < 3 && g[r][c] === g[r + 1][c]) return false;
        if (c < 3 && g[r][c] === g[r][c + 1]) return false;
      }
    }
    return true;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "s", "a", "d"].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
    
    let key = e.key.toLowerCase();
    let rotated = grid.map(row => [...row]);
    let moves = 0;

    // We align moves to rotating and shifting left
    if (key === "arrowleft" || key === "a") {
      const res = slideLeft(rotated);
      rotated = res.shifted;
      setScore(prev => prev + res.addedScore);
      moves++;
    } else if (key === "arrowright" || key === "d") {
      // rotate 2 times, slide, rotate 2 times
      rotated = rotateGrid(rotateGrid(rotated));
      const res = slideLeft(rotated);
      rotated = res.shifted;
      rotated = rotateGrid(rotateGrid(rotated));
      setScore(prev => prev + res.addedScore);
      moves++;
    } else if (key === "arrowup" || key === "w") {
      // rotate clockwise 3 times (counter-clockwise 1 time), slide left, rotate 1 time
      rotated = rotateGrid(rotateGrid(rotateGrid(rotated)));
      const res = slideLeft(rotated);
      rotated = res.shifted;
      rotated = rotateGrid(rotated);
      setScore(prev => prev + res.addedScore);
      moves++;
    } else if (key === "arrowdown" || key === "s") {
      // rotate 1 time, slide left, rotate 3 times
      rotated = rotateGrid(rotated);
      const res = slideLeft(rotated);
      rotated = res.shifted;
      rotated = rotateGrid(rotateGrid(rotateGrid(rotated)));
      setScore(prev => prev + res.addedScore);
      moves++;
    }

    if (moves > 0) {
      // Only spawn tile if grid state actually changed
      const stateChanged = JSON.stringify(grid) !== JSON.stringify(rotated);
      if (stateChanged) {
        const nextGrid = addRandomTile(rotated);
        setGrid(nextGrid);
        if (checkGameOver(nextGrid)) {
          onGameOver(score);
        }
      }
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, score]);

  const getTileColors = (val: number) => {
    const colors: Record<number, string> = {
      2: "bg-zinc-800 text-zinc-300 border-white/5",
      4: "bg-zinc-700 text-zinc-200 border-white/10",
      8: "bg-neon-green/10 text-neon-green border-neon-green/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]",
      16: "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]",
      32: "bg-neon-violet/10 text-neon-violet border-neon-violet/20 shadow-[0_0_10px_rgba(139,92,246,0.1)]",
      64: "bg-pink-500/10 text-pink-400 border-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.1)]",
      128: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.15)]",
      256: "bg-amber-400/10 text-amber-300 border-amber-400/20 shadow-[0_0_12px_rgba(250,204,21,0.2)]",
      512: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.25)]",
      1024: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25 shadow-[0_0_18px_rgba(6,182,212,0.3)]",
      2048: "bg-primary/10 text-primary border-primary/30 shadow-[0_0_24px_rgba(139,92,246,0.45)]",
    };
    return colors[val] || "bg-zinc-950 text-white border-white/5";
  };

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans">
      <div className="flex items-center justify-between w-full max-w-xs mb-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">
        <div>Score: <span className="font-mono text-neon-cyan text-glow-cyan text-base">{score}</span></div>
        <button
          onClick={initGame}
          className="h-7 w-7 flex items-center justify-center border border-white/5 bg-zinc-900/40 rounded-full hover:bg-white/5 transition-all text-white cursor-pointer"
        >
          <HugeiconsIcon icon={RefreshIcon} className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="bg-zinc-900/40 border border-white/5 p-3.5 rounded-2xl grid grid-cols-4 gap-3 w-full max-w-xs aspect-square">
        {grid.map((row, r) =>
          row.map((val, c) => {
            const tileStyle = getTileColors(val);
            const valStr = val === 0 ? "" : val.toString();
            const textSz = val >= 1024 ? "text-lg" : val >= 128 ? "text-xl" : "text-2xl";

            return (
              <div
                key={`${r}-${c}`}
                className={`rounded-xl border flex items-center justify-center font-black ${textSz} transition-all duration-300 ${tileStyle}`}
              >
                {valStr}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
