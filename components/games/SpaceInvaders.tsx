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

const PLAYER_W = 50;
const PLAYER_H = 18;
const PLAYER_Y = HEIGHT - 50;
const PLAYER_SPEED = 380;
const PLAYER_MARGIN = 20;
/** Seconds of invulnerability after losing a life. */
const RESPAWN_SHIELD = 1.6;

const BULLET_UP = 560;
const BULLET_DOWN = 260;
const MAX_PLAYER_BULLETS = 3;
const FIRE_COOLDOWN = 0.22;

const ALIEN_ROWS = 4;
const ALIEN_COLS = 10;
const ALIEN_W = 32;
const ALIEN_H = 24;
const ALIEN_PAD_X = 18;
const ALIEN_PAD_Y = 18;
const ALIEN_START_X = 60;
const ALIEN_START_Y = 80;
const ALIEN_STEP_X = 16;
const ALIEN_STEP_Y = 24;
/** Seconds between formation steps at full strength; shrinks as aliens die. */
const STEP_START = 0.75;
const STEP_MIN = 0.08;
/** Base alien shots per second across the whole formation. */
const ALIEN_FIRE_RATE = 0.9;

const ALIEN_COLORS = ["#c084fc", "#f472b6", "#38bdf8", "#4ade80"];
const ALIEN_POINTS = [40, 30, 20, 10];

type Bullet = { x: number; y: number; vy: number };
type Alien = { x: number; y: number; row: number };

function buildWave(): Alien[] {
  const aliens: Alien[] = [];
  for (let r = 0; r < ALIEN_ROWS; r++) {
    for (let c = 0; c < ALIEN_COLS; c++) {
      aliens.push({
        x: ALIEN_START_X + c * (ALIEN_W + ALIEN_PAD_X),
        y: ALIEN_START_Y + r * (ALIEN_H + ALIEN_PAD_Y),
        row: r,
      });
    }
  }
  return aliens;
}

function initialState() {
  return {
    px: (WIDTH - PLAYER_W) / 2,
    bullets: [] as Bullet[],
    aliens: buildWave(),
    alienDir: 1,
    stepTimer: STEP_START,
    fireCooldown: 0,
    shield: 0,
    wave: 1,
    score: 0,
    lives: 3,
    banner: 0,
    paused: false,
    over: false,
    reported: false,
    lastPointerX: -1,
  };
}

export const ClassicSpaceInvaders: React.FC<GameProps> = ({ onGameOver }) => {
  const { canvasRef, ctxRef } = useGameCanvas(WIDTH, HEIGHT);
  const onGameOverRef = useLatest(onGameOver);
  const stateRef = useRef(initialState());

  const fire = () => {
    const s = stateRef.current;
    if (s.over || s.paused || s.banner > 0 || s.fireCooldown > 0) return;
    if (s.bullets.filter((b) => b.vy < 0).length >= MAX_PLAYER_BULLETS) return;
    s.bullets.push({ x: s.px + PLAYER_W / 2, y: PLAYER_Y - 10, vy: -BULLET_UP });
    s.fireCooldown = FIRE_COOLDOWN;
  };

  const input = useGameInput({
    target: canvasRef,
    queueDirections: false,
    enableSwipe: false,
    onTap: fire,
    onPause: () => {
      const s = stateRef.current;
      if (!s.over) s.paused = !s.paused;
    },
  });

  useGameLoop({
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
      if (!io || s.over || s.paused) return;

      if (s.banner > 0) {
        s.banner -= dt;
        return;
      }

      s.fireCooldown = Math.max(0, s.fireCooldown - dt);
      s.shield = Math.max(0, s.shield - dt);

      const keyed = io.isDown("left") || io.isDown("right");
      const p = io.pointer();
      if (keyed) {
        if (io.isDown("left")) s.px -= PLAYER_SPEED * dt;
        if (io.isDown("right")) s.px += PLAYER_SPEED * dt;
      } else if (p && p.x !== s.lastPointerX) {
        s.px = p.x - PLAYER_W / 2;
      }
      if (p) s.lastPointerX = p.x;
      s.px = Math.max(PLAYER_MARGIN, Math.min(WIDTH - PLAYER_W - PLAYER_MARGIN, s.px));

      // Holding fire auto-repeats at the cooldown rate; tapping fires at once.
      if (io.consumePress("primary") || io.isDown("primary")) fire();

      for (const b of s.bullets) b.y += b.vy * dt;
      s.bullets = s.bullets.filter((b) => b.y > -20 && b.y < HEIGHT + 20);

      // Formation marches in discrete steps; the pace quickens as aliens die
      // and with each wave, so the last few invaders are genuinely frantic.
      const total = ALIEN_ROWS * ALIEN_COLS;
      const alive = s.aliens.length;
      const waveFactor = Math.max(0.45, 1 - (s.wave - 1) * 0.12);
      const interval = Math.max(STEP_MIN, STEP_START * (alive / total) * waveFactor);
      s.stepTimer -= dt;
      if (s.stepTimer <= 0) {
        s.stepTimer += interval;
        let hitEdge = false;
        for (const a of s.aliens) {
          a.x += s.alienDir * ALIEN_STEP_X;
          if (a.x <= PLAYER_MARGIN || a.x + ALIEN_W >= WIDTH - PLAYER_MARGIN) hitEdge = true;
        }
        if (hitEdge) {
          s.alienDir = -s.alienDir;
          for (const a of s.aliens) {
            a.y += ALIEN_STEP_Y;
            if (a.y + ALIEN_H >= PLAYER_Y) s.over = true;
          }
        }
      }

      // Alien fire: only the lowest alien in each column shoots, as in the
      // original, so shots come from the front line rather than through it.
      if (alive > 0 && Math.random() < ALIEN_FIRE_RATE * (1 + (s.wave - 1) * 0.25) * dt) {
        const lowest = new Map<number, Alien>();
        for (const a of s.aliens) {
          const key = Math.round(a.x);
          const cur = lowest.get(key);
          if (!cur || a.y > cur.y) lowest.set(key, a);
        }
        const shooters = [...lowest.values()];
        const shooter = shooters[Math.floor(Math.random() * shooters.length)];
        s.bullets.push({ x: shooter.x + ALIEN_W / 2, y: shooter.y + ALIEN_H, vy: BULLET_DOWN });
      }

      // Resolve every collision against a snapshot, then drop the casualties in
      // one pass; splicing mid-iteration made a double-removal skip an element.
      const dead = new Set<Bullet>();
      for (const b of s.bullets) {
        if (dead.has(b)) continue;
        if (b.vy < 0) {
          let hit = false;
          for (let j = s.aliens.length - 1; j >= 0; j--) {
            const a = s.aliens[j];
            if (b.x > a.x && b.x < a.x + ALIEN_W && b.y > a.y && b.y < a.y + ALIEN_H) {
              s.score += ALIEN_POINTS[a.row];
              s.aliens.splice(j, 1);
              hit = true;
              break;
            }
          }
          if (hit) {
            dead.add(b);
            continue;
          }
          // A player shot can intercept an incoming alien shot.
          for (const o of s.bullets) {
            if (o.vy > 0 && !dead.has(o) && Math.abs(o.x - b.x) < 6 && Math.abs(o.y - b.y) < 14) {
              dead.add(b);
              dead.add(o);
              break;
            }
          }
        } else if (
          s.shield <= 0 &&
          b.x > s.px &&
          b.x < s.px + PLAYER_W &&
          b.y + 12 > PLAYER_Y &&
          b.y < PLAYER_Y + PLAYER_H
        ) {
          dead.add(b);
          s.lives--;
          if (s.lives <= 0) {
            s.over = true;
          } else {
            s.shield = RESPAWN_SHIELD;
            s.px = (WIDTH - PLAYER_W) / 2;
          }
        }
      }
      if (dead.size > 0) s.bullets = s.bullets.filter((b) => !dead.has(b));

      if (s.aliens.length === 0) {
        s.score += 500 * s.wave;
        s.wave++;
        s.aliens = buildWave();
        s.alienDir = 1;
        s.stepTimer = STEP_START;
        s.bullets = s.bullets.filter((b) => b.vy < 0);
        s.banner = 1.5;
        s.shield = RESPAWN_SHIELD;
      }
    },

    render: () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      const s = stateRef.current;

      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (const b of s.bullets) {
        ctx.fillStyle = b.vy < 0 ? "#06b6d4" : "#ef4444";
        ctx.fillRect(b.x - 2, b.y, 4, 12);
      }

      for (const a of s.aliens) {
        const color = ALIEN_COLORS[a.row];
        ctx.strokeStyle = color;
        ctx.fillStyle = color + "33";
        ctx.lineWidth = 1.5;
        ctx.fillRect(a.x, a.y, ALIEN_W, ALIEN_H);
        ctx.strokeRect(a.x, a.y, ALIEN_W, ALIEN_H);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(a.x + 8, a.y + 6, 4, 4);
        ctx.fillRect(a.x + ALIEN_W - 12, a.y + 6, 4, 4);
        ctx.fillRect(a.x + 10, a.y + 15, ALIEN_W - 20, 3);
      }

      // Player blinks while shielded so the grace period is visible.
      const blink = s.shield > 0 && Math.floor(s.shield * 10) % 2 === 0;
      if (!blink) {
        ctx.fillStyle = "#10b981";
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 2;
        ctx.fillRect(s.px, PLAYER_Y, PLAYER_W, PLAYER_H);
        ctx.strokeRect(s.px, PLAYER_Y, PLAYER_W, PLAYER_H);
        ctx.fillRect(s.px + PLAYER_W / 2 - 4, PLAYER_Y - 10, 8, 10);
      }

      ctx.textAlign = "left";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText(`SCORE  ${s.score}`, 24, 32);
      ctx.fillText(`WAVE  ${s.wave}`, 24, 52);
      ctx.textAlign = "right";
      ctx.fillText("♥ ".repeat(s.lives).trim(), WIDTH - 24, 32);

      if (s.banner > 0) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 40px system-ui, sans-serif";
        ctx.fillText(`WAVE ${s.wave}`, WIDTH / 2, HEIGHT / 2);
      }

      if (s.paused) drawPauseOverlay(ctx, WIDTH, HEIGHT);
      if (s.over) drawGameOverFlash(ctx, WIDTH, HEIGHT);
    },
  });

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={fire}
      className="block h-full w-full touch-none bg-zinc-950"
      aria-label="Space Invaders game"
    />
  );
};
