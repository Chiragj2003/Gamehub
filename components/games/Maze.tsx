"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { GameProps } from "./types";

// ===== MAZE GENERATION (Recursive Backtracker / DFS) =====
interface Cell {
  x: number;
  y: number;
  walls: { north: boolean; south: boolean; east: boolean; west: boolean };
  visited: boolean;
}

type Difficulty = "easy" | "medium" | "hard" | "expert" | "einstein";
type PlayMode = "classic" | "timed" | "challenge";

const DIFFICULTY_CONFIG: Record<Difficulty, { cols: number; rows: number; timeLimit: number }> = {
  easy:     { cols: 10, rows: 10, timeLimit: 60 },
  medium:   { cols: 15, rows: 15, timeLimit: 120 },
  hard:     { cols: 20, rows: 20, timeLimit: 180 },
  expert:   { cols: 25, rows: 25, timeLimit: 240 },
  einstein: { cols: 30, rows: 30, timeLimit: 300 },
};

function generateMaze(cols: number, rows: number): Cell[][] {
  const grid: Cell[][] = [];
  for (let y = 0; y < rows; y++) {
    grid[y] = [];
    for (let x = 0; x < cols; x++) {
      grid[y][x] = {
        x, y,
        walls: { north: true, south: true, east: true, west: true },
        visited: false,
      };
    }
  }

  const stack: Cell[] = [];
  const start = grid[0][0];
  start.visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors: Cell[] = [];
    const { x, y } = current;

    if (y > 0 && !grid[y - 1][x].visited) neighbors.push(grid[y - 1][x]);
    if (y < rows - 1 && !grid[y + 1][x].visited) neighbors.push(grid[y + 1][x]);
    if (x > 0 && !grid[y][x - 1].visited) neighbors.push(grid[y][x - 1]);
    if (x < cols - 1 && !grid[y][x + 1].visited) neighbors.push(grid[y][x + 1]);

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      // Remove wall between current and next
      if (next.y < current.y) { current.walls.north = false; next.walls.south = false; }
      else if (next.y > current.y) { current.walls.south = false; next.walls.north = false; }
      else if (next.x < current.x) { current.walls.west = false; next.walls.east = false; }
      else if (next.x > current.x) { current.walls.east = false; next.walls.west = false; }
      next.visited = true;
      stack.push(next);
    }
  }

  return grid;
}

// BFS to find solution path
function solveMaze(grid: Cell[][], start: [number, number], end: [number, number]): [number, number][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const parent = Array.from({ length: rows }, () => Array(cols).fill(null as [number, number] | null));
  const queue: [number, number][] = [start];
  visited[start[1]][start[0]] = true;

  const directions: { dir: "north" | "south" | "east" | "west"; dx: number; dy: number }[] = [
    { dir: "north", dx: 0, dy: -1 },
    { dir: "south", dx: 0, dy: 1 },
    { dir: "east", dx: 1, dy: 0 },
    { dir: "west", dx: -1, dy: 0 },
  ];

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    if (cx === end[0] && cy === end[1]) break;

    for (const { dir, dx, dy } of directions) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited[ny][nx] && !grid[cy][cx].walls[dir]) {
        visited[ny][nx] = true;
        parent[ny][nx] = [cx, cy];
        queue.push([nx, ny]);
      }
    }
  }

  // Reconstruct path
  const path: [number, number][] = [];
  let cur: [number, number] | null = end;
  while (cur) {
    path.unshift(cur);
    cur = parent[cur[1]][cur[0]];
  }
  return path;
}

// ===== MAZE COMPONENT =====
export const ClassicMaze: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [mode, setMode] = useState<PlayMode>("classic");
  const [gameState, setGameState] = useState<"menu" | "playing" | "won">("menu");
  const [grid, setGrid] = useState<Cell[][] | null>(null);
  const [path, setPath] = useState<[number, number][]>([]);
  const [undoStack, setUndoStack] = useState<[number, number][][]>([]);
  const [redoStack, setRedoStack] = useState<[number, number][][]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [solution, setSolution] = useState<[number, number][]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const config = DIFFICULTY_CONFIG[difficulty];
  const startPos: [number, number] = [0, 0];
  const endPos: [number, number] = [config.cols - 1, config.rows - 1];

  const startGame = useCallback(() => {
    const newGrid = generateMaze(config.cols, config.rows);
    const sol = solveMaze(newGrid, startPos, endPos);
    setGrid(newGrid);
    setSolution(sol);
    setPath([startPos]);
    setUndoStack([]);
    setRedoStack([]);
    setHintsUsed(0);
    setElapsedTime(0);
    setRemainingTime(config.timeLimit);
    setGameState("playing");
  }, [config.cols, config.rows, config.timeLimit]);

  // Timer
  useEffect(() => {
    if (gameState !== "playing") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      if (mode === "timed") {
        setRemainingTime(prev => {
          if (prev <= 1) {
            setGameState("won");
            onGameOver(0);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setElapsedTime(prev => prev + 1);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, mode, onGameOver]);

  // Check if position is adjacent and passable
  const canMoveTo = useCallback((from: [number, number], to: [number, number]): boolean => {
    if (!grid) return false;
    const [fx, fy] = from;
    const [tx, ty] = to;
    const dx = tx - fx;
    const dy = ty - fy;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
    if (tx < 0 || tx >= config.cols || ty < 0 || ty >= config.rows) return false;
    const cell = grid[fy][fx];
    if (dx === 1) return !cell.walls.east;
    if (dx === -1) return !cell.walls.west;
    if (dy === 1) return !cell.walls.south;
    if (dy === -1) return !cell.walls.north;
    return false;
  }, [grid, config.cols, config.rows]);

  const moveTo = useCallback((target: [number, number]) => {
    if (gameState !== "playing" || !grid) return;
    const current = path[path.length - 1];

    // Check if clicking an earlier cell in the path (retract)
    const existingIdx = path.findIndex(([px, py]) => px === target[0] && py === target[1]);
    if (existingIdx >= 0 && existingIdx < path.length - 1) {
      if (mode === "challenge") return; // no undo in challenge
      const newPath = path.slice(0, existingIdx + 1);
      setUndoStack(prev => [...prev, path]);
      setRedoStack([]);
      setPath(newPath);
      return;
    }

    if (!canMoveTo(current, target)) return;

    const newPath = [...path, target];
    setUndoStack(prev => [...prev, path]);
    setRedoStack([]);
    setPath(newPath);

    // Check win
    if (target[0] === endPos[0] && target[1] === endPos[1]) {
      setGameState("won");
      const timeBonus = mode === "timed" ? remainingTime * 5 : Math.max(0, 300 - elapsedTime);
      const hintPenalty = hintsUsed * 50;
      const moveBonus = Math.max(0, 500 - (newPath.length - solution.length) * 10);
      const score = Math.max(10, timeBonus + moveBonus - hintPenalty + config.cols * config.rows);
      setTimeout(() => onGameOver(score), 1500);
    }
  }, [gameState, grid, path, mode, canMoveTo, endPos, remainingTime, elapsedTime, hintsUsed, solution.length, config.cols, config.rows, onGameOver]);

  const undo = useCallback(() => {
    if (mode === "challenge" || undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, path]);
    setPath(prev);
    setUndoStack(u => u.slice(0, -1));
  }, [mode, undoStack, path]);

  const redo = useCallback(() => {
    if (mode === "challenge" || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, path]);
    setPath(next);
    setRedoStack(r => r.slice(0, -1));
  }, [mode, redoStack, path]);

  const revealHint = useCallback(() => {
    if (mode === "challenge" || hintsUsed >= 3 || gameState !== "playing") return;
    const current = path[path.length - 1];
    // Find current position in solution
    const solIdx = solution.findIndex(([sx, sy]) => sx === current[0] && sy === current[1]);
    if (solIdx >= 0 && solIdx < solution.length - 1) {
      const nextStep = solution[solIdx + 1];
      moveTo(nextStep);
      setHintsUsed(h => h + 1);
    }
  }, [mode, hintsUsed, gameState, path, solution, moveTo]);

  const clearPath = useCallback(() => {
    if (mode === "challenge") return;
    setUndoStack(prev => [...prev, path]);
    setRedoStack([]);
    setPath([startPos]);
  }, [mode, path]);

  // Keyboard controls
  useEffect(() => {
    if (gameState !== "playing") return;
    const handleKey = (e: KeyboardEvent) => {
      const current = path[path.length - 1];
      const [cx, cy] = current;
      switch (e.key) {
        case "ArrowUp": e.preventDefault(); moveTo([cx, cy - 1]); break;
        case "ArrowDown": e.preventDefault(); moveTo([cx, cy + 1]); break;
        case "ArrowLeft": e.preventDefault(); moveTo([cx - 1, cy]); break;
        case "ArrowRight": e.preventDefault(); moveTo([cx + 1, cy]); break;
        case "Backspace": e.preventDefault(); undo(); break;
        case "z": if (e.ctrlKey) { e.preventDefault(); undo(); } break;
        case "y": if (e.ctrlKey) { e.preventDefault(); redo(); } break;
        case "h": case "H": e.preventDefault(); revealHint(); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, path, moveTo, undo, redo, revealHint]);

  // Canvas rendering
  useEffect(() => {
    if (!grid || gameState === "menu") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cellW = w / config.cols;
    const cellH = h / config.rows;

    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, w, h);

    // Draw cells background
    for (let y = 0; y < config.rows; y++) {
      for (let x = 0; x < config.cols; x++) {
        ctx.fillStyle = "#18181b";
        ctx.fillRect(x * cellW + 1, y * cellH + 1, cellW - 2, cellH - 2);
      }
    }

    // Draw path
    if (path.length > 0) {
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = Math.max(2, cellW * 0.3);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(path[0][0] * cellW + cellW / 2, path[0][1] * cellH + cellH / 2);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i][0] * cellW + cellW / 2, path[i][1] * cellH + cellH / 2);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw walls
    ctx.strokeStyle = "#a1a1aa";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    for (let y = 0; y < config.rows; y++) {
      for (let x = 0; x < config.cols; x++) {
        const cell = grid[y][x];
        const px = x * cellW;
        const py = y * cellH;
        if (cell.walls.north) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + cellW, py); ctx.stroke(); }
        if (cell.walls.south) { ctx.beginPath(); ctx.moveTo(px, py + cellH); ctx.lineTo(px + cellW, py + cellH); ctx.stroke(); }
        if (cell.walls.west) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + cellH); ctx.stroke(); }
        if (cell.walls.east) { ctx.beginPath(); ctx.moveTo(px + cellW, py); ctx.lineTo(px + cellW, py + cellH); ctx.stroke(); }
      }
    }

    // Draw start marker
    ctx.fillStyle = "#22c55e";
    ctx.shadowColor = "#22c55e";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(startPos[0] * cellW + cellW / 2, startPos[1] * cellH + cellH / 2, cellW * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw end marker
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(endPos[0] * cellW + cellW / 2, endPos[1] * cellH + cellH / 2, cellW * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw current position highlight
    if (path.length > 0 && gameState === "playing") {
      const [hx, hy] = path[path.length - 1];
      ctx.fillStyle = "rgba(6, 182, 212, 0.3)";
      ctx.fillRect(hx * cellW + 2, hy * cellH + 2, cellW - 4, cellH - 4);
    }

    // Win overlay
    if (gameState === "won") {
      ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#22c55e";
      ctx.font = `bold ${Math.min(w, h) * 0.08}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("MAZE COMPLETE!", w / 2, h / 2);
    }
  }, [grid, path, config, gameState]);

  // Mouse click handler
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const cellW = canvas.width / config.cols;
    const cellH = canvas.height / config.rows;
    const cx = Math.floor(mx / cellW);
    const cy = Math.floor(my / cellH);
    if (cx >= 0 && cx < config.cols && cy >= 0 && cy < config.rows) {
      moveTo([cx, cy]);
    }
  }, [gameState, config.cols, config.rows, moveTo]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ===== MENU SCREEN =====
  if (gameState === "menu") {
    return (
      <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans select-none">
        <h2 className="text-3xl font-black text-white tracking-tight mb-2">MAZE</h2>
        <p className="text-zinc-500 text-sm mb-8">Navigate from start to exit</p>

        {/* Difficulty selector */}
        <div className="mb-6 w-full max-w-sm">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Difficulty</label>
          <div className="grid grid-cols-5 gap-1">
            {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`py-2 px-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  difficulty === d
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                    : "bg-zinc-900 text-zinc-400 border border-white/5 hover:bg-zinc-800"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-zinc-600 mt-2 text-center">
            {config.cols}×{config.rows} grid · {mode === "timed" ? `${config.timeLimit}s limit` : "Unlimited time"}
          </div>
        </div>

        {/* Mode selector */}
        <div className="mb-8 w-full max-w-sm">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Play Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: "classic" as const, label: "Classic", desc: "No time limit" },
              { key: "timed" as const, label: "Timed", desc: "Countdown" },
              { key: "challenge" as const, label: "Challenge", desc: "No hints/undo" },
            ]).map(m => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`py-3 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mode === m.key
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                    : "bg-zinc-900 text-zinc-400 border border-white/5 hover:bg-zinc-800"
                }`}
              >
                <div>{m.label}</div>
                <div className="text-[9px] text-zinc-600 font-normal mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={startGame}
          className="h-12 px-10 rounded-full bg-cyan-500 text-zinc-950 font-black text-sm uppercase tracking-wider hover:bg-cyan-400 transition-all cursor-pointer active:scale-95"
        >
          Start Maze
        </button>
      </div>
    );
  }

  // ===== GAME SCREEN =====
  const canvasSize = Math.min(600, config.cols * 20);

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans select-none">
      {/* HUD */}
      <div className="flex items-center justify-between w-full max-w-[600px] mb-3 text-xs">
        <div className="flex items-center gap-3">
          {mode !== "challenge" && (
            <span className="text-zinc-500 font-bold uppercase tracking-widest">
              {mode === "timed" ? `⏱ ${formatTime(remainingTime)}` : `⏱ ${formatTime(elapsedTime)}`}
            </span>
          )}
          <span className="text-zinc-600 font-mono">Moves: {path.length - 1}</span>
        </div>
        <div className="flex items-center gap-2">
          {mode !== "challenge" && (
            <>
              <button onClick={undo} disabled={undoStack.length === 0}
                className="px-2 py-1 rounded text-[10px] font-bold bg-zinc-900 text-zinc-400 border border-white/5 hover:bg-zinc-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
                Undo
              </button>
              <button onClick={redo} disabled={redoStack.length === 0}
                className="px-2 py-1 rounded text-[10px] font-bold bg-zinc-900 text-zinc-400 border border-white/5 hover:bg-zinc-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
                Redo
              </button>
              <button onClick={revealHint} disabled={hintsUsed >= 3}
                className="px-2 py-1 rounded text-[10px] font-bold bg-zinc-900 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
                Hint ({3 - hintsUsed})
              </button>
              <button onClick={clearPath}
                className="px-2 py-1 rounded text-[10px] font-bold bg-zinc-900 text-zinc-400 border border-white/5 hover:bg-zinc-800 cursor-pointer">
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        onClick={handleCanvasClick}
        className="block rounded-lg border border-white/10 cursor-crosshair"
        style={{ width: "min(100%, 600px)", height: "auto", aspectRatio: "1/1" }}
      />

      {/* Controls hint */}
      <div className="mt-3 text-[10px] text-zinc-600 text-center">
        Arrow keys to move · {mode !== "challenge" ? "Backspace to undo · H for hint" : "Challenge mode — no aids"}
      </div>
    </div>
  );
};
