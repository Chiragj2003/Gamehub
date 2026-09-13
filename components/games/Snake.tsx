"use client";

import React, { useCallback, useRef } from "react";
import { GameProps } from "./types";
import {
  useGameLoop,
  useGameInput,
  useGameCanvas,
  useLatest,
  drawPauseOverlay,
  drawGameOverFlash,
} from "@/lib/game-engine";

const WIDTH = 800;
const HEIGHT = 600;
const GRID = 20;
const COLS = WIDTH / GRID;
const ROWS = HEIGHT / GRID;

/** Milliseconds per move at the start of a run, and the floor it ramps toward. */
const START_INTERVAL = 130;
const MIN_INTERVAL = 60;
/** Each food eaten shaves this much off the move interval. */
const SPEEDUP_PER_FOOD = 3;

type Cell = { x: number; y: number };
type Dir = { dx: number; dy: number };

const DIRECTIONS: Record<string, Dir> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

function initialState() {
  const snake: Cell[] = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ];
  return {
    snake,
    dir: { dx: 1, dy: 0 } as Dir,
    food: { x: 14, y: 10 } as Cell,
    score: 0,
    moveTimer: 0,
    interval: START_INTERVAL,
    over: false,
    started: false,
    paused: false,
    reported: false,
  };
}

export const ClassicSnake: React.FC<GameProps> = ({ onGameOver }) => {
  const { canvasRef, ctxRef } = useGameCanvas(WIDTH, HEIGHT);
  const stateRef = useRef(initialState());

  const onGameOverRef = useLatest(onGameOver);

  /**
   * Pick a free cell for food.
   *
   * The previous version chose any random cell, so food regularly spawned
   * underneath the snake — invisible, and eaten the instant it appeared.
   * Collecting the empty cells first guarantees a visible, reachable target.
   */
  const placeFood = useCallback((snake: Cell[]): Cell => {
    const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
    const free: Cell[] = [];
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    if (free.length === 0) return snake[0]; // board full; the run ends next move
    return free[Math.floor(Math.random() * free.length)];
  }, []);

  const input = useGameInput({
    target: canvasRef,
    queueDirections: true,
    onPause: () => {
      const s = stateRef.current;
      if (!s.over && s.started) s.paused = !s.paused;
    },
  });

  /** Apply a queued turn, rejecting reversals into the snake's own neck. */
  const turn = (s: ReturnType<typeof initialState>, action: string) => {
    const next = DIRECTIONS[action];
    if (!next) return;
    if (next.dx === -s.dir.dx && next.dy === -s.dir.dy) return;
    s.dir = next;
  };

  useGameLoop({
    // Window blur pauses the loop; latch our own flag so the PAUSED overlay
    // shows and the player resumes deliberately when focus returns.
    onPauseChange: (paused) => {
      const s = stateRef.current;
      if (paused && s.started && !s.over) s.paused = true;
    },
    step: 1000 / 60,

    update: (dt) => {
      const s = stateRef.current;
      const io = input.current;
      // Report once, on the first tick after the run ended. This sits above
      // every early return so it cannot be skipped by whichever path set `over`.
      if (s.over && !s.reported) {
        s.reported = true;
        const final = s.score;
        setTimeout(() => onGameOverRef.current(final), 1200);
      }
      // A tap or Space resumes a paused game (touch has no P key). Consuming the
      // press keeps it from also firing the game's own primary action.
      if (io && s.paused && !s.over && io.consumePress("primary")) s.paused = false;
      if (!io || s.over) return;

      if (!s.started) {
        // Any directional input starts the run, so the snake does not crawl
        // into a wall while the player is still reading the controls.
        const first = io.shiftDirection();
        if (first) {
          s.started = true;
          turn(s, first);
        } else if (io.consumePress("primary")) {
          s.started = true;
        }
        return;
      }

      if (s.paused) return;

      s.moveTimer += dt * 1000;
      if (s.moveTimer < s.interval) return;
      s.moveTimer -= s.interval;

      // One buffered turn per move: a fast up-then-left input registers both
      // turns in order instead of the first being overwritten.
      const queued = io.shiftDirection();
      if (queued) turn(s, queued);

      const head = { x: s.snake[0].x + s.dir.dx, y: s.snake[0].y + s.dir.dy };

      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
        s.over = true;
        return;
      }

      // The tail cell frees up on this same move, so entering it is legal —
      // only the rest of the body is a fatal collision.
      const body = s.snake.slice(0, -1);
      if (body.some((c) => c.x === head.x && c.y === head.y)) {
        s.over = true;
        return;
      }

      s.snake.unshift(head);

      if (head.x === s.food.x && head.y === s.food.y) {
        s.score += 10;
        s.interval = Math.max(MIN_INTERVAL, s.interval - SPEEDUP_PER_FOOD);
        s.food = placeFood(s.snake);
      } else {
        s.snake.pop();
      }
    },

    render: () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      const s = stateRef.current;

      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = "rgba(255,255,255,0.02)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= COLS; x++) {
        ctx.moveTo(x * GRID, 0);
        ctx.lineTo(x * GRID, HEIGHT);
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.moveTo(0, y * GRID);
        ctx.lineTo(WIDTH, y * GRID);
      }
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(
        s.food.x * GRID + GRID / 2,
        s.food.y * GRID + GRID / 2,
        GRID / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();

      for (let i = 0; i < s.snake.length; i++) {
        const part = s.snake[i];
        ctx.fillStyle = i === 0 ? "#10b981" : "#047857";
        ctx.fillRect(part.x * GRID + 1, part.y * GRID + 1, GRID - 2, GRID - 2);
      }

      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(String(s.score), 16, 32);

      if (!s.started) {
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "bold 22px system-ui, sans-serif";
        ctx.fillText("Arrow keys, WASD, or swipe to start", WIDTH / 2, HEIGHT / 2);
      }

      if (s.paused) drawPauseOverlay(ctx, WIDTH, HEIGHT);
      if (s.over) drawGameOverFlash(ctx, WIDTH, HEIGHT);
    },
  });

  return (
    <canvas
      ref={canvasRef}
      className="touch-none bg-zinc-950"
      aria-label="Snake game"
    />
  );
};
