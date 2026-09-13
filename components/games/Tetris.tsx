"use client";

import React, { useRef } from "react";
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
const COLS = 10;
const ROWS = 20;
const BLOCK = 28;
const GRID_X = (WIDTH - COLS * BLOCK) / 2 - 60;
const GRID_Y = (HEIGHT - ROWS * BLOCK) / 2;

/** Delayed Auto Shift: hold time before a held direction starts repeating. */
const DAS_MS = 150;
/** Auto Repeat Rate: interval between repeats once DAS has elapsed. */
const ARR_MS = 40;
/**
 * Lock delay: grace period after a piece lands during which it can still be
 * moved or rotated. Without it, pieces cement the instant they touch down and
 * tucking a piece under an overhang is impossible.
 */
const LOCK_DELAY_MS = 500;
/** Number of moves that may reset the lock timer, so it cannot be stalled forever. */
const MAX_LOCK_RESETS = 15;

const SHAPES: number[][][] = [
  [],
  [[1, 1, 1, 1]], // I
  [[0, 2, 0], [2, 2, 2]], // T
  [[3, 0, 0], [3, 3, 3]], // J
  [[0, 0, 4], [4, 4, 4]], // L
  [[5, 5], [5, 5]], // O
  [[0, 6, 6], [6, 6, 0]], // S
  [[7, 7, 0], [0, 7, 7]], // Z
];

const COLORS = [
  "",
  "#06b6d4", // I cyan
  "#a855f7", // T violet
  "#3b82f6", // J blue
  "#f97316", // L orange
  "#eab308", // O yellow
  "#10b981", // S green
  "#ef4444", // Z red
];

/**
 * Wall-kick offsets tried in order when a rotation collides.
 * Rotating flush against a wall or another piece previously just failed
 * silently; these nudges let the piece shift into a legal spot instead.
 */
const KICKS: Array<[number, number]> = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [-2, 0],
  [2, 0],
  [0, -1],
  [-1, -1],
  [1, -1],
];

type Matrix = number[][];

function rotateCW(m: Matrix): Matrix {
  const rows = m.length;
  const cols = m[0].length;
  const out: Matrix = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out[c][rows - 1 - r] = m[r][c];
    }
  }
  return out;
}

/**
 * 7-bag randomiser.
 *
 * Plain Math.random() lets the same piece repeat many times and an I-piece go
 * missing for 20+ drops, which players read as the game cheating. A bag deals
 * all seven pieces in random order before reshuffling, which is what every
 * modern Tetris uses and is the single biggest "feels official" change.
 */
function createBag() {
  let bag: number[] = [];
  const refill = () => {
    bag = [1, 2, 3, 4, 5, 6, 7];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  };
  refill();
  return () => {
    if (bag.length === 0) refill();
    return bag.pop()!;
  };
}

function emptyGrid(): number[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

export const ClassicTetris: React.FC<GameProps> = ({ onGameOver }) => {
  const { canvasRef, ctxRef } = useGameCanvas(WIDTH, HEIGHT);
  const onGameOverRef = useLatest(onGameOver);

  const stateRef = useRef({
    grid: emptyGrid(),
    nextPiece: createBag(),
    matrix: [] as Matrix,
    type: 0,
    x: 0,
    y: 0,
    queued: 0,
    score: 0,
    lines: 0,
    level: 1,
    dropTimer: 0,
    lockTimer: 0,
    lockResets: 0,
    grounded: false,
    dasTimer: 0,
    dasDir: 0,
    arrTimer: 0,
    over: false,
    paused: false,
    reported: false,
    initialised: false,
  });

  const collides = (
    s: typeof stateRef.current,
    m: Matrix,
    ox: number,
    oy: number
  ): boolean => {
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (m[r][c] === 0) continue;
        const gx = ox + c;
        const gy = oy + r;
        if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
        if (gy >= 0 && s.grid[gy][gx] !== 0) return true;
      }
    }
    return false;
  };

  const spawn = (s: typeof stateRef.current) => {
    s.type = s.queued || s.nextPiece();
    s.queued = s.nextPiece();
    s.matrix = SHAPES[s.type].map((row) => [...row]);
    s.x = Math.floor((COLS - s.matrix[0].length) / 2);
    s.y = 0;
    s.grounded = false;
    s.lockTimer = 0;
    s.lockResets = 0;
    if (collides(s, s.matrix, s.x, s.y)) s.over = true;
  };

  const clearLines = (s: typeof stateRef.current) => {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (s.grid[r].every((v) => v !== 0)) {
        s.grid.splice(r, 1);
        s.grid.unshift(Array(COLS).fill(0));
        cleared++;
        r++; // re-check this index; a row shifted down into it
      }
    }
    if (cleared > 0) {
      s.lines += cleared;
      s.level = Math.floor(s.lines / 10) + 1;
      // Standard scoring, multiplied by level so late clears are worth more.
      const base = [0, 100, 300, 500, 800][Math.min(cleared, 4)];
      s.score += base * s.level;
    }
  };

  const lockPiece = (s: typeof stateRef.current) => {
    for (let r = 0; r < s.matrix.length; r++) {
      for (let c = 0; c < s.matrix[r].length; c++) {
        if (s.matrix[r][c] !== 0 && s.y + r >= 0) {
          s.grid[s.y + r][s.x + c] = s.type;
        }
      }
    }
    clearLines(s);
    spawn(s);
  };

  const tryMove = (s: typeof stateRef.current, dx: number): boolean => {
    if (collides(s, s.matrix, s.x + dx, s.y)) return false;
    s.x += dx;
    if (s.grounded && s.lockResets < MAX_LOCK_RESETS) {
      s.lockTimer = 0;
      s.lockResets++;
    }
    return true;
  };

  const tryRotate = (s: typeof stateRef.current) => {
    const rotated = rotateCW(s.matrix);
    for (const [kx, ky] of KICKS) {
      if (!collides(s, rotated, s.x + kx, s.y + ky)) {
        s.matrix = rotated;
        s.x += kx;
        s.y += ky;
        if (s.grounded && s.lockResets < MAX_LOCK_RESETS) {
          s.lockTimer = 0;
          s.lockResets++;
        }
        return;
      }
    }
  };

  const input = useGameInput({
    target: canvasRef,
    queueDirections: false,
    onPause: () => {
      const s = stateRef.current;
      if (!s.over) s.paused = !s.paused;
    },
    onTap: (x) => {
      // Touch: tap the left or right third to shift, the middle to rotate.
      const s = stateRef.current;
      if (s.over || s.paused) return;
      if (x < WIDTH / 3) tryMove(s, -1);
      else if (x > (2 * WIDTH) / 3) tryMove(s, 1);
      else tryRotate(s);
    },
  });

  useGameLoop({
    step: 1000 / 60,

    update: (dt) => {
      const s = stateRef.current;
      const io = input.current;
      if (!io) return;

      if (!s.initialised) {
        s.initialised = true;
        spawn(s);
      }

      if (s.over || s.paused) return;

      const ms = dt * 1000;

      // Horizontal movement with DAS/ARR. Relying on the OS key-repeat delay
      // (~500ms) made shifting a piece across the board feel unresponsive.
      //
      // The initial step comes from the press edge, not the held state: a fast
      // tap can be down and up again inside a single 16ms tick, and polling
      // `isDown` alone would drop it entirely.
      while (io.consumePress("left")) tryMove(s, -1);
      while (io.consumePress("right")) tryMove(s, 1);

      const left = io.isDown("left");
      const right = io.isDown("right");
      const dir = left && !right ? -1 : right && !left ? 1 : 0;

      if (dir !== s.dasDir) {
        s.dasDir = dir;
        s.dasTimer = 0;
        s.arrTimer = 0;
      } else if (dir !== 0) {
        s.dasTimer += ms;
        if (s.dasTimer >= DAS_MS) {
          s.arrTimer += ms;
          while (s.arrTimer >= ARR_MS) {
            s.arrTimer -= ARR_MS;
            if (!tryMove(s, dir)) break;
          }
        }
      }

      if (io.consumePress("up")) tryRotate(s);

      if (io.consumePress("primary")) {
        // Hard drop: 2 points per cell, then lock immediately.
        let dropped = 0;
        while (!collides(s, s.matrix, s.x, s.y + 1)) {
          s.y++;
          dropped++;
        }
        s.score += dropped * 2;
        lockPiece(s);
        s.dropTimer = 0;
        return;
      }

      // Gravity. Level 1 falls once per second, accelerating to a 50ms floor.
      const interval = Math.max(50, 1000 - (s.level - 1) * 85);
      const softDrop = io.isDown("down");
      s.dropTimer += softDrop ? ms * 12 : ms;

      if (s.dropTimer >= interval) {
        s.dropTimer = 0;
        if (!collides(s, s.matrix, s.x, s.y + 1)) {
          s.y++;
          if (softDrop) s.score += 1;
          s.grounded = false;
          s.lockTimer = 0;
        }
      }

      // Lock delay: once resting on the stack, allow a short window to slide or
      // rotate before the piece cements.
      if (collides(s, s.matrix, s.x, s.y + 1)) {
        s.grounded = true;
        s.lockTimer += ms;
        if (s.lockTimer >= LOCK_DELAY_MS) {
          lockPiece(s);
          s.dropTimer = 0;
        }
      } else {
        s.grounded = false;
        s.lockTimer = 0;
      }

      if (s.over && !s.reported) {
        s.reported = true;
        const final = s.score;
        setTimeout(() => onGameOverRef.current(final), 1200);
      }
    },

    render: () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      const s = stateRef.current;

      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 4;
      ctx.strokeRect(GRID_X - 2, GRID_Y - 2, COLS * BLOCK + 4, ROWS * BLOCK + 4);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = s.grid[r][c];
          if (t !== 0) {
            ctx.fillStyle = COLORS[t];
            ctx.fillRect(GRID_X + c * BLOCK + 1, GRID_Y + r * BLOCK + 1, BLOCK - 2, BLOCK - 2);
          }
        }
      }

      if (s.matrix.length > 0 && !s.over) {
        let ghostY = s.y;
        while (!collides(s, s.matrix, s.x, ghostY + 1)) ghostY++;

        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.lineWidth = 1;
        for (let r = 0; r < s.matrix.length; r++) {
          for (let c = 0; c < s.matrix[r].length; c++) {
            if (s.matrix[r][c] === 0) continue;
            const px = GRID_X + (s.x + c) * BLOCK + 1;
            const py = GRID_Y + (ghostY + r) * BLOCK + 1;
            ctx.fillRect(px, py, BLOCK - 2, BLOCK - 2);
            ctx.strokeRect(px, py, BLOCK - 2, BLOCK - 2);
          }
        }

        ctx.fillStyle = COLORS[s.type];
        for (let r = 0; r < s.matrix.length; r++) {
          for (let c = 0; c < s.matrix[r].length; c++) {
            if (s.matrix[r][c] === 0) continue;
            ctx.fillRect(
              GRID_X + (s.x + c) * BLOCK + 1,
              GRID_Y + (s.y + r) * BLOCK + 1,
              BLOCK - 2,
              BLOCK - 2
            );
          }
        }
      }

      const panelX = GRID_X + COLS * BLOCK + 28;
      ctx.textAlign = "left";

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillText("SCORE", panelX, GRID_Y + 22);
      ctx.font = "bold 26px monospace";
      ctx.fillText(String(s.score), panelX, GRID_Y + 52);

      ctx.fillStyle = "#71717a";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillText(`LINES  ${s.lines}`, panelX, GRID_Y + 80);
      ctx.fillText(`LEVEL  ${s.level}`, panelX, GRID_Y + 100);

      // Next-piece preview: planning the next placement is core to the game.
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillText("NEXT", panelX, GRID_Y + 140);
      if (s.queued) {
        const preview = SHAPES[s.queued];
        const size = 18;
        ctx.fillStyle = COLORS[s.queued];
        for (let r = 0; r < preview.length; r++) {
          for (let c = 0; c < preview[r].length; c++) {
            if (preview[r][c] === 0) continue;
            ctx.fillRect(panelX + c * size, GRID_Y + 152 + r * size, size - 2, size - 2);
          }
        }
      }

      ctx.fillStyle = "#a855f7";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText("CONTROLS", panelX, GRID_Y + 250);
      ctx.fillStyle = "#52525b";
      ctx.font = "11px monospace";
      const hints = [
        "← →  Move",
        "↑    Rotate",
        "↓    Soft drop",
        "Space  Hard drop",
        "P      Pause",
      ];
      hints.forEach((h, i) => ctx.fillText(h, panelX, GRID_Y + 272 + i * 18));

      if (s.paused) drawPauseOverlay(ctx, WIDTH, HEIGHT);
      if (s.over) {
        drawGameOverFlash(ctx, WIDTH, HEIGHT);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 44px system-ui, sans-serif";
        ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2);
      }
    },
  });

  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full touch-none bg-zinc-950"
      aria-label="Tetris game"
    />
  );
};
