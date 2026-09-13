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

/**
 * Piece shapes in their SRS spawn orientation, each inside the fixed bounding
 * box SRS rotates about (4x4 for I, 3x3 for the rest). Rotating the box in
 * place is what makes the kick tables below line up with the official ones.
 */
const SHAPES: number[][][] = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [0, 2, 0],
    [2, 2, 2],
    [0, 0, 0],
  ], // T
  [
    [3, 0, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 4],
    [4, 4, 4],
    [0, 0, 0],
  ], // L
  [
    [5, 5],
    [5, 5],
  ], // O
  [
    [0, 6, 6],
    [6, 6, 0],
    [0, 0, 0],
  ], // S
  [
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0],
  ], // Z
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

const T_PIECE = 2;
const I_PIECE = 1;
const O_PIECE = 5;

type Kick = [number, number];

/**
 * Super Rotation System wall kicks, indexed by "from>to" rotation state
 * (0 spawn, 1 clockwise, 2 flipped, 3 counter-clockwise). Offsets are tried
 * in order; the first that fits is taken. Y is negated from the published
 * tables because this grid grows downward.
 */
const KICKS_JLSTZ: Record<string, Kick[]> = {
  "0>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "1>0": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "1>2": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "2>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "2>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "3>2": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "3>0": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "0>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

const KICKS_I: Record<string, Kick[]> = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

type Matrix = number[][];

function rotateCW(m: Matrix): Matrix {
  const n = m.length;
  const out: Matrix = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) out[c][n - 1 - r] = m[r][c];
  }
  return out;
}

function rotateCCW(m: Matrix): Matrix {
  const n = m.length;
  const out: Matrix = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) out[n - 1 - c][r] = m[r][c];
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
    rotation: 0,
    x: 0,
    y: 0,
    queued: 0,
    held: 0,
    /** Hold may be used once per piece; resets when a piece locks. */
    holdUsed: false,
    /** True when the last successful action was a rotation — needed for T-spins. */
    lastWasRotate: false,
    /** On-screen notice for a special clear, with a fade timer. */
    notice: "",
    noticeTimer: 0,
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

  const spawnType = (s: typeof stateRef.current, type: number) => {
    s.type = type;
    s.rotation = 0;
    s.matrix = SHAPES[type].map((row) => [...row]);
    s.x = Math.floor((COLS - s.matrix[0].length) / 2);
    // The I box has an empty top row; start it one higher so it appears at the top.
    s.y = type === I_PIECE ? -1 : 0;
    s.grounded = false;
    s.lockTimer = 0;
    s.lockResets = 0;
    s.lastWasRotate = false;
    if (collides(s, s.matrix, s.x, s.y)) s.over = true;
  };

  const spawn = (s: typeof stateRef.current) => {
    const type = s.queued || s.nextPiece();
    s.queued = s.nextPiece();
    s.holdUsed = false;
    spawnType(s, type);
  };

  const hold = (s: typeof stateRef.current) => {
    if (s.holdUsed) return;
    s.holdUsed = true;
    const swapped = s.held;
    s.held = s.type;
    if (swapped) spawnType(s, swapped);
    else {
      const type = s.queued;
      s.queued = s.nextPiece();
      spawnType(s, type);
    }
  };

  /**
   * 3-corner T-spin test: the T locked by a rotation and at least three of the
   * four cells diagonal to its centre are filled (or off the grid).
   */
  const isTSpin = (s: typeof stateRef.current) => {
    if (s.type !== T_PIECE || !s.lastWasRotate) return false;
    const cx = s.x + 1;
    const cy = s.y + 1;
    let filled = 0;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const gx = cx + dx;
      const gy = cy + dy;
      if (gx < 0 || gx >= COLS || gy >= ROWS || (gy >= 0 && s.grid[gy][gx] !== 0)) filled++;
    }
    return filled >= 3;
  };

  const clearLines = (s: typeof stateRef.current) => {
    const tSpin = isTSpin(s);
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (s.grid[r].every((v) => v !== 0)) {
        s.grid.splice(r, 1);
        s.grid.unshift(Array(COLS).fill(0));
        cleared++;
        r++; // re-check this index; a row shifted down into it
      }
    }
    if (tSpin) {
      // T-spins score far more than the same clear done normally.
      const base = [400, 800, 1200, 1600][Math.min(cleared, 3)];
      s.score += base * s.level;
      s.notice = ["T-SPIN", "T-SPIN SINGLE", "T-SPIN DOUBLE", "T-SPIN TRIPLE"][Math.min(cleared, 3)];
      s.noticeTimer = 1.4;
    } else if (cleared > 0) {
      // Standard scoring, multiplied by level so late clears are worth more.
      const base = [0, 100, 300, 500, 800][Math.min(cleared, 4)];
      s.score += base * s.level;
      if (cleared === 4) {
        s.notice = "TETRIS";
        s.noticeTimer = 1.4;
      }
    }
    if (cleared > 0) {
      s.lines += cleared;
      s.level = Math.floor(s.lines / 10) + 1;
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
    s.lastWasRotate = false;
    if (s.grounded && s.lockResets < MAX_LOCK_RESETS) {
      s.lockTimer = 0;
      s.lockResets++;
    }
    return true;
  };

  const tryRotate = (s: typeof stateRef.current, dir: 1 | -1) => {
    if (s.type === O_PIECE) return;
    const rotated = dir === 1 ? rotateCW(s.matrix) : rotateCCW(s.matrix);
    const to = (s.rotation + dir + 4) % 4;
    const table = s.type === I_PIECE ? KICKS_I : KICKS_JLSTZ;
    const kicks = table[`${s.rotation}>${to}`];
    for (const [kx, ky] of kicks) {
      if (!collides(s, rotated, s.x + kx, s.y + ky)) {
        s.matrix = rotated;
        s.rotation = to;
        s.x += kx;
        s.y += ky;
        s.lastWasRotate = true;
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
      else tryRotate(s, 1);
    },
  });

  useGameLoop({
    // Window blur pauses the loop; latch our own flag so the PAUSED overlay
    // shows and the player resumes deliberately when focus returns.
    onPauseChange: (paused) => {
      const s = stateRef.current;
      if (paused && !s.over) s.paused = true;
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

      // Rotate: Up or X clockwise, Z counter-clockwise. Hold: C or Shift.
      while (io.consumePress("up") || io.consumeKey("x")) tryRotate(s, 1);
      while (io.consumeKey("z")) tryRotate(s, -1);
      if (io.consumeKey("c") || io.consumePress("secondary")) hold(s);

      if (s.noticeTimer > 0) s.noticeTimer -= dt;

      if (io.consumePress("primary")) {
        // Hard drop: 2 points per cell, then lock immediately.
        let dropped = 0;
        while (!collides(s, s.matrix, s.x, s.y + 1)) {
          s.y++;
          dropped++;
        }
        if (dropped > 0) s.lastWasRotate = false;
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
          s.lastWasRotate = false;
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

      const drawMini = (type: number, x: number, y: number) => {
        const shape = SHAPES[type];
        const size = 16;
        ctx.fillStyle = COLORS[type];
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] === 0) continue;
            ctx.fillRect(x + c * size, y + r * size, size - 2, size - 2);
          }
        }
      };

      // Next-piece preview: planning the next placement is core to the game.
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillText("NEXT", panelX, GRID_Y + 140);
      if (s.queued) drawMini(s.queued, panelX, GRID_Y + 150);

      ctx.fillStyle = s.holdUsed ? "#52525b" : "#ffffff";
      ctx.fillText("HOLD", panelX, GRID_Y + 226);
      if (s.held) {
        ctx.globalAlpha = s.holdUsed ? 0.4 : 1;
        drawMini(s.held, panelX, GRID_Y + 236);
        ctx.globalAlpha = 1;
      }

      if (s.noticeTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, s.noticeTimer);
        ctx.textAlign = "center";
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 26px system-ui, sans-serif";
        ctx.fillText(s.notice, GRID_X + (COLS * BLOCK) / 2, GRID_Y - 12);
        ctx.restore();
      }

      ctx.fillStyle = "#a855f7";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText("CONTROLS", panelX, GRID_Y + 318);
      ctx.fillStyle = "#52525b";
      ctx.font = "11px monospace";
      const hints = [
        "← →   Move",
        "↑ / X  Rotate",
        "Z      Rotate back",
        "↓      Soft drop",
        "Space  Hard drop",
        "C      Hold",
        "P      Pause",
      ];
      hints.forEach((h, i) => ctx.fillText(h, panelX, GRID_Y + 338 + i * 17));

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
      className="touch-none bg-zinc-950"
      aria-label="Tetris game"
    />
  );
};
