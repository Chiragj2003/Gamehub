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
const COLS = 15;
const ROWS = 11;
const TS = 40;
const OFF_X = (WIDTH - COLS * TS) / 2;
const OFF_Y = (HEIGHT - ROWS * TS) / 2;

const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,1,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,1,0,1,1,1,0,1,0,1,1,1,0,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,0,1,1,1,0,1,0,1,1,1,0,1,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const PLAYER_SPAWN = { c: 7, r: 5 };
const POWER_CELLS = new Set(["1,1", "13,1", "1,9", "13,9"]);
const PLAYER_R = 14;

const PLAYER_SPEED = 152;
const GHOST_SPEED = 124;
const GHOST_SPEED_PER_LEVEL = 7;
const GHOST_SPEED_MAX = 165;
const FRIGHT_SPEED = 68;
const FRIGHT_TIME = 6.5;
const FRIGHT_TIME_MIN = 2.5;
/** Ghosts alternate between hunting and retreating to their corner. */
const SCATTER_TIME = 6;
const CHASE_TIME = 18;
/** Seconds a ghost sits at home after being eaten. */
const DORMANT_TIME = 2.2;
const DEATH_FREEZE = 1.4;

type Dir = { dx: number; dy: number };
const NONE: Dir = { dx: 0, dy: 0 };
const DIRS: Dir[] = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
];
const KEY_DIRS: Record<string, Dir> = {
  right: DIRS[0],
  left: DIRS[1],
  down: DIRS[2],
  up: DIRS[3],
};

type Mover = { x: number; y: number; dir: Dir };

type Ghost = Mover & {
  color: string;
  home: { c: number; r: number };
  /** Personality: how far ahead of the player this ghost aims. */
  lead: number;
  dormant: number;
};

function centerOf(c: number, r: number) {
  return { x: c * TS + TS / 2, y: r * TS + TS / 2 };
}

function isWall(c: number, r: number) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
  return MAP[r][c] === 1;
}

function tileOf(m: Mover) {
  return { c: Math.floor(m.x / TS), r: Math.floor(m.y / TS) };
}

function buildDots() {
  const dots = new Set<string>();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (MAP[r][c] === 0) dots.add(`${c},${r}`);
    }
  }
  return dots;
}

function makeGhosts(): Ghost[] {
  const spec = [
    { color: "#ef4444", home: { c: 1, r: 1 }, lead: 0 },
    { color: "#ec4899", home: { c: 13, r: 1 }, lead: 4 },
    { color: "#06b6d4", home: { c: 1, r: 9 }, lead: 2 },
    { color: "#f97316", home: { c: 13, r: 9 }, lead: -2 },
  ];
  return spec.map((g) => ({
    ...centerOf(g.home.c, g.home.r),
    dir: NONE,
    dormant: 0,
    ...g,
  }));
}

function initialState() {
  return {
    player: { ...centerOf(PLAYER_SPAWN.c, PLAYER_SPAWN.r), dir: NONE } as Mover,
    wantDir: NONE as Dir,
    ghosts: makeGhosts(),
    dots: buildDots(),
    fright: 0,
    frightCombo: 0,
    modeTimer: SCATTER_TIME,
    scatter: true,
    freeze: 0,
    level: 1,
    score: 0,
    lives: 3,
    mouth: 0,
    started: false,
    banner: 0,
    paused: false,
    over: false,
    reported: false,
  };
}

/**
 * Move an entity along its direction by `dist` pixels, snapping to tile
 * centres as it crosses them so that turns are only taken exactly on the grid.
 * `decide` is called at each centre and returns the direction to continue in.
 */
function advance(m: Mover, dist: number, decide: (m: Mover) => Dir) {
  let guard = 8;
  while (dist > 0 && guard-- > 0) {
    if (m.dir.dx === 0 && m.dir.dy === 0) {
      const next = decide(m);
      if (next.dx === 0 && next.dy === 0) return;
      m.dir = next;
    }

    const t = tileOf(m);
    const center = centerOf(t.c, t.r);
    let ahead = (center.x - m.x) * m.dir.dx + (center.y - m.y) * m.dir.dy;
    let target = center;
    // At or past this tile's centre, the next decision point is the centre of
    // the tile ahead. (`<=` matters: exactly on centre must not re-target it,
    // or the entity never leaves the spot.)
    if (ahead <= 0) {
      target = { x: center.x + m.dir.dx * TS, y: center.y + m.dir.dy * TS };
      ahead += TS;
    }

    if (ahead > dist) {
      m.x += m.dir.dx * dist;
      m.y += m.dir.dy * dist;
      return;
    }

    m.x = target.x;
    m.y = target.y;
    dist -= ahead;
    const next = decide(m);
    if (next.dx === 0 && next.dy === 0) {
      m.dir = NONE;
      return;
    }
    m.dir = next;
  }
}

export const ClassicPacman: React.FC<GameProps> = ({ onGameOver }) => {
  const { canvasRef, ctxRef } = useGameCanvas(WIDTH, HEIGHT);
  const onGameOverRef = useLatest(onGameOver);
  const stateRef = useRef(initialState());

  const input = useGameInput({
    target: canvasRef,
    queueDirections: true,
    onPause: () => {
      const s = stateRef.current;
      if (!s.over && s.started) s.paused = !s.paused;
    },
  });

  const resetPositions = (s: ReturnType<typeof initialState>) => {
    s.player = { ...centerOf(PLAYER_SPAWN.c, PLAYER_SPAWN.r), dir: NONE };
    s.wantDir = NONE;
    for (const g of s.ghosts) {
      const home = centerOf(g.home.c, g.home.r);
      g.x = home.x;
      g.y = home.y;
      g.dir = NONE;
      g.dormant = 0;
    }
    s.fright = 0;
  };

  useGameLoop({
    // Window blur pauses the loop; latch our own flag so the PAUSED overlay
    // shows and the player resumes deliberately when focus returns.
    onPauseChange: (paused) => {
      const s = stateRef.current;
      if (paused && s.started && !s.over) s.paused = true;
    },
    step: 1000 / 120,
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
      if (!io || s.over || s.paused) return;

      const queued = io.shiftDirection();
      if (queued) {
        s.wantDir = KEY_DIRS[queued];
        s.started = true;
      }
      if (!s.started) return;

      if (s.banner > 0) {
        s.banner -= dt;
        return;
      }
      if (s.freeze > 0) {
        s.freeze -= dt;
        if (s.freeze <= 0) resetPositions(s);
        return;
      }

      s.mouth += dt * 10;

      // Reversing is allowed anywhere; other turns wait for a tile centre.
      const p = s.player;
      if (s.wantDir.dx === -p.dir.dx && s.wantDir.dy === -p.dir.dy && (p.dir.dx || p.dir.dy)) {
        p.dir = s.wantDir;
      }

      advance(p, PLAYER_SPEED * dt, (m) => {
        const t = tileOf(m);
        const want = s.wantDir;
        if ((want.dx || want.dy) && !isWall(t.c + want.dx, t.r + want.dy)) return want;
        if ((m.dir.dx || m.dir.dy) && !isWall(t.c + m.dir.dx, t.r + m.dir.dy)) return m.dir;
        return NONE;
      });

      const pt = tileOf(p);
      const key = `${pt.c},${pt.r}`;
      if (s.dots.has(key)) {
        s.dots.delete(key);
        if (POWER_CELLS.has(key)) {
          s.score += 50;
          s.fright = Math.max(FRIGHT_TIME_MIN, FRIGHT_TIME - (s.level - 1) * 0.6);
          s.frightCombo = 0;
          // Frightened ghosts reverse, as in the original.
          for (const g of s.ghosts) {
            if (g.dormant <= 0) g.dir = { dx: -g.dir.dx, dy: -g.dir.dy };
          }
        } else {
          s.score += 10;
        }
      }

      if (s.fright > 0) {
        s.fright -= dt;
      } else {
        s.modeTimer -= dt;
        if (s.modeTimer <= 0) {
          s.scatter = !s.scatter;
          s.modeTimer = s.scatter ? SCATTER_TIME : CHASE_TIME;
        }
      }

      const ghostSpeed = Math.min(GHOST_SPEED_MAX, GHOST_SPEED + (s.level - 1) * GHOST_SPEED_PER_LEVEL);

      for (const g of s.ghosts) {
        if (g.dormant > 0) {
          g.dormant -= dt;
          continue;
        }

        const frightened = s.fright > 0;
        const speed = frightened ? FRIGHT_SPEED : ghostSpeed;

        advance(g, speed * dt, (m) => {
          const t = tileOf(m);
          const back = { dx: -m.dir.dx, dy: -m.dir.dy };
          const options = DIRS.filter(
            (d) => !(d.dx === back.dx && d.dy === back.dy) && !isWall(t.c + d.dx, t.r + d.dy)
          );
          if (options.length === 0) return back;
          if (frightened) return options[Math.floor(Math.random() * options.length)];

          // Chase: aim at a point ahead of the player so the four ghosts
          // approach from different angles instead of forming a conga line.
          // Scatter: retreat to the home corner, giving the player breathing room.
          let target: { c: number; r: number };
          if (s.scatter) {
            target = g.home;
          } else {
            const pTile = tileOf(s.player);
            target = {
              c: pTile.c + s.player.dir.dx * g.lead,
              r: pTile.r + s.player.dir.dy * g.lead,
            };
          }
          // A little noise keeps them from being perfectly predictable.
          if (Math.random() < 0.12) return options[Math.floor(Math.random() * options.length)];

          let best = options[0];
          let bestDist = Infinity;
          for (const d of options) {
            const dc = t.c + d.dx - target.c;
            const dr = t.r + d.dy - target.r;
            const dist = dc * dc + dr * dr;
            if (dist < bestDist) {
              bestDist = dist;
              best = d;
            }
          }
          return best;
        });

        if (Math.hypot(p.x - g.x, p.y - g.y) < PLAYER_R + 8) {
          if (s.fright > 0) {
            s.frightCombo++;
            s.score += 200 * Math.pow(2, s.frightCombo - 1);
            const home = centerOf(g.home.c, g.home.r);
            g.x = home.x;
            g.y = home.y;
            g.dir = NONE;
            g.dormant = DORMANT_TIME;
          } else {
            s.lives--;
            if (s.lives <= 0) {
              s.over = true;
            } else {
              s.freeze = DEATH_FREEZE;
            }
            break;
          }
        }
      }

      if (s.dots.size === 0 && !s.over) {
        s.score += 1000 * s.level;
        s.level++;
        s.dots = buildDots();
        resetPositions(s);
        s.scatter = true;
        s.modeTimer = SCATTER_TIME;
        s.banner = 1.6;
      }
    },

    render: () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      const s = stateRef.current;

      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (MAP[r][c] !== 1) continue;
          ctx.strokeStyle = "rgba(59,130,246,0.35)";
          ctx.lineWidth = 1;
          ctx.strokeRect(OFF_X + c * TS, OFF_Y + r * TS, TS, TS);
          ctx.fillStyle = "rgba(37,99,235,0.09)";
          ctx.fillRect(OFF_X + c * TS + 2, OFF_Y + r * TS + 2, TS - 4, TS - 4);
        }
      }

      ctx.fillStyle = "#facc15";
      for (const key of s.dots) {
        const [c, r] = key.split(",").map(Number);
        const cx = OFF_X + c * TS + TS / 2;
        const cy = OFF_Y + r * TS + TS / 2;
        if (POWER_CELLS.has(key)) {
          // Power pellets pulse so they read as special.
          const pulse = 6 + Math.sin(s.mouth * 0.6) * 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(cx - 2, cy - 2, 4, 4);
        }
      }

      for (const g of s.ghosts) {
        const gx = OFF_X + g.x;
        const gy = OFF_Y + g.y;
        const frightened = s.fright > 0 && g.dormant <= 0;
        // Flash white as the fright timer runs out, warning the player.
        const flashing = frightened && s.fright < 2 && Math.floor(s.fright * 6) % 2 === 0;

        if (g.dormant <= 0) {
          ctx.fillStyle = flashing ? "#e5e7eb" : frightened ? "#3b82f6" : g.color;
          ctx.beginPath();
          ctx.arc(gx, gy - 2, PLAYER_R, Math.PI, 0);
          ctx.lineTo(gx + PLAYER_R, gy + PLAYER_R);
          ctx.lineTo(gx + PLAYER_R / 2, gy + PLAYER_R / 1.5);
          ctx.lineTo(gx, gy + PLAYER_R);
          ctx.lineTo(gx - PLAYER_R / 2, gy + PLAYER_R / 1.5);
          ctx.lineTo(gx - PLAYER_R, gy + PLAYER_R);
          ctx.closePath();
          ctx.fill();
        }

        // Eyes always draw; a dormant ghost is just its eyes waiting at home.
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(gx - 5, gy - 2, 3.5, 0, Math.PI * 2);
        ctx.arc(gx + 5, gy - 2, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1e3a8a";
        ctx.beginPath();
        ctx.arc(gx - 5 + g.dir.dx * 1.5, gy - 2 + g.dir.dy * 1.5, 1.6, 0, Math.PI * 2);
        ctx.arc(gx + 5 + g.dir.dx * 1.5, gy - 2 + g.dir.dy * 1.5, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      const p = s.player;
      const px = OFF_X + p.x;
      const py = OFF_Y + p.y;
      const moving = p.dir.dx !== 0 || p.dir.dy !== 0;
      const chomp = moving ? Math.abs(Math.sin(s.mouth)) * 0.28 : 0.12;
      const face = p.dir.dx > 0 ? 0 : p.dir.dx < 0 ? Math.PI : p.dir.dy > 0 ? Math.PI / 2 : p.dir.dy < 0 ? -Math.PI / 2 : 0;
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.arc(px, py, PLAYER_R, face + chomp, face + Math.PI * 2 - chomp);
      ctx.closePath();
      ctx.fill();

      ctx.textAlign = "left";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText(`SCORE  ${s.score}`, 24, 30);
      ctx.fillText(`LEVEL  ${s.level}`, 24, 50);
      ctx.textAlign = "right";
      ctx.fillText("♥ ".repeat(s.lives).trim(), WIDTH - 24, 30);

      if (!s.started) {
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = "bold 20px system-ui, sans-serif";
        ctx.fillText("Arrow keys, WASD, or swipe to start", WIDTH / 2, OFF_Y - 14);
      }

      if (s.banner > 0) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 40px system-ui, sans-serif";
        ctx.fillText(`LEVEL ${s.level}`, WIDTH / 2, HEIGHT / 2);
      }

      if (s.paused) drawPauseOverlay(ctx, WIDTH, HEIGHT);
      if (s.over) drawGameOverFlash(ctx, WIDTH, HEIGHT);
    },
  });

  return (
    <canvas
      ref={canvasRef}
      className="touch-none bg-zinc-950"
      aria-label="Pac-Man style game"
    />
  );
};
