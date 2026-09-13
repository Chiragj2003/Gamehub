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

const SHIP_R = 12;
const TURN_SPEED = 4.2; // radians per second
const THRUST = 420; // px per second squared
const MAX_SPEED = 420;
/** Fraction of velocity kept after one second of coasting. */
const DAMPING = 0.35;
/** Seconds of invulnerability after respawning, shown by blinking. */
const RESPAWN_SHIELD = 2.5;

const LASER_SPEED = 560;
const LASER_LIFE = 1.1;
const FIRE_COOLDOWN = 0.18;
const MAX_LASERS = 5;

const BIG = 42;
const MEDIUM = 24;
const SMALL = 13;

type Asteroid = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  spin: number;
  shape: number[];
};

type Laser = { x: number; y: number; vx: number; vy: number; life: number };

type Particle = { x: number; y: number; vx: number; vy: number; life: number };

function makeAsteroid(x: number, y: number, r: number, speedScale: number): Asteroid {
  const sides = 8 + Math.floor(Math.random() * 5);
  const angle = Math.random() * Math.PI * 2;
  // Smaller rocks move faster, so splitting raises the pressure.
  const speed = (30 + Math.random() * 60 + (BIG - r) * 2.2) * speedScale;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r,
    rot: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 1.6,
    shape: Array.from({ length: sides }, () => 0.75 + Math.random() * 0.45),
  };
}

/** Spawn rocks away from the ship so a new wave never starts with a collision. */
function spawnWave(count: number, shipX: number, shipY: number, speedScale: number): Asteroid[] {
  const rocks: Asteroid[] = [];
  while (rocks.length < count) {
    const x = Math.random() * WIDTH;
    const y = Math.random() * HEIGHT;
    if (Math.hypot(x - shipX, y - shipY) < 160) continue;
    rocks.push(makeAsteroid(x, y, BIG, speedScale));
  }
  return rocks;
}

function initialState() {
  return {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    angle: -Math.PI / 2,
    vx: 0,
    vy: 0,
    thrusting: false,
    shield: RESPAWN_SHIELD,
    fireCooldown: 0,
    lasers: [] as Laser[],
    asteroids: spawnWave(4, WIDTH / 2, HEIGHT / 2, 1),
    particles: [] as Particle[],
    wave: 1,
    score: 0,
    lives: 3,
    banner: 0,
    paused: false,
    over: false,
    reported: false,
  };
}

function wrap(v: number, max: number, margin: number) {
  if (v < -margin) return max + margin;
  if (v > max + margin) return -margin;
  return v;
}

export const ClassicAsteroids: React.FC<GameProps> = ({ onGameOver }) => {
  const { canvasRef, ctxRef } = useGameCanvas(WIDTH, HEIGHT);
  const onGameOverRef = useLatest(onGameOver);
  const stateRef = useRef(initialState());

  const fire = () => {
    const s = stateRef.current;
    if (s.over || s.paused || s.banner > 0 || s.fireCooldown > 0) return;
    if (s.lasers.length >= MAX_LASERS) return;
    s.lasers.push({
      x: s.x + Math.cos(s.angle) * SHIP_R * 1.5,
      y: s.y + Math.sin(s.angle) * SHIP_R * 1.5,
      vx: Math.cos(s.angle) * LASER_SPEED + s.vx * 0.5,
      vy: Math.sin(s.angle) * LASER_SPEED + s.vy * 0.5,
      life: LASER_LIFE,
    });
    s.fireCooldown = FIRE_COOLDOWN;
  };

  const burst = (s: ReturnType<typeof initialState>, x: number, y: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 140;
      s.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.4 });
    }
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

      if (io.isDown("left")) s.angle -= TURN_SPEED * dt;
      if (io.isDown("right")) s.angle += TURN_SPEED * dt;

      // Touch: dragging left/right of the ship turns it; dragging above thrusts.
      const p = io.pointer();
      if (p && io.isDown("primary")) {
        const dx = p.x - s.x;
        const dy = p.y - s.y;
        const target = Math.atan2(dy, dx);
        let diff = target - s.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        s.angle += Math.max(-TURN_SPEED * dt, Math.min(TURN_SPEED * dt, diff));
      }

      s.thrusting = io.isDown("up") || (p !== null && io.isDown("primary"));
      if (s.thrusting) {
        s.vx += Math.cos(s.angle) * THRUST * dt;
        s.vy += Math.sin(s.angle) * THRUST * dt;
      }

      // Exponential damping expressed per second, so coasting feels identical
      // at any tick rate; the old per-frame multiplier decayed 2.4x faster on
      // a 144Hz display.
      const damp = Math.pow(DAMPING, dt);
      s.vx *= damp;
      s.vy *= damp;
      const speed = Math.hypot(s.vx, s.vy);
      if (speed > MAX_SPEED) {
        s.vx = (s.vx / speed) * MAX_SPEED;
        s.vy = (s.vy / speed) * MAX_SPEED;
      }

      s.x = wrap(s.x + s.vx * dt, WIDTH, SHIP_R);
      s.y = wrap(s.y + s.vy * dt, HEIGHT, SHIP_R);

      if (io.consumePress("primary") || io.isDown("primary")) fire();

      for (const l of s.lasers) {
        l.x = wrap(l.x + l.vx * dt, WIDTH, 0);
        l.y = wrap(l.y + l.vy * dt, HEIGHT, 0);
        l.life -= dt;
      }
      s.lasers = s.lasers.filter((l) => l.life > 0);

      for (const a of s.asteroids) {
        a.x = wrap(a.x + a.vx * dt, WIDTH, a.r);
        a.y = wrap(a.y + a.vy * dt, HEIGHT, a.r);
        a.rot += a.spin * dt;
      }

      for (const pt of s.particles) {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
      }
      s.particles = s.particles.filter((pt) => pt.life > 0);

      const speedScale = 1 + (s.wave - 1) * 0.15;

      for (let li = s.lasers.length - 1; li >= 0; li--) {
        const l = s.lasers[li];
        for (let ai = s.asteroids.length - 1; ai >= 0; ai--) {
          const a = s.asteroids[ai];
          if (Math.hypot(l.x - a.x, l.y - a.y) >= a.r) continue;

          s.lasers.splice(li, 1);
          s.asteroids.splice(ai, 1);
          s.score += a.r >= BIG ? 20 : a.r >= MEDIUM ? 50 : 100;
          burst(s, a.x, a.y, a.r >= BIG ? 10 : 6);

          if (a.r >= BIG) {
            s.asteroids.push(makeAsteroid(a.x, a.y, MEDIUM, speedScale), makeAsteroid(a.x, a.y, MEDIUM, speedScale));
          } else if (a.r >= MEDIUM) {
            s.asteroids.push(makeAsteroid(a.x, a.y, SMALL, speedScale), makeAsteroid(a.x, a.y, SMALL, speedScale));
          }
          break;
        }
      }

      if (s.shield <= 0) {
        for (const a of s.asteroids) {
          if (Math.hypot(s.x - a.x, s.y - a.y) < a.r * 0.85 + SHIP_R * 0.7) {
            s.lives--;
            burst(s, s.x, s.y, 16);
            if (s.lives <= 0) {
              s.over = true;
            } else {
              s.x = WIDTH / 2;
              s.y = HEIGHT / 2;
              s.vx = 0;
              s.vy = 0;
              s.angle = -Math.PI / 2;
              s.shield = RESPAWN_SHIELD;
            }
            break;
          }
        }
      }

      if (s.asteroids.length === 0) {
        s.score += 250 * s.wave;
        s.wave++;
        s.asteroids = spawnWave(3 + s.wave, s.x, s.y, 1 + (s.wave - 1) * 0.15);
        s.lasers = [];
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

      ctx.fillStyle = "#fbbf24";
      for (const pt of s.particles) {
        ctx.globalAlpha = Math.min(1, pt.life * 2);
        ctx.fillRect(pt.x - 1.5, pt.y - 1.5, 3, 3);
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#22d3ee";
      for (const l of s.lasers) {
        ctx.beginPath();
        ctx.arc(l.x, l.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 1.5;
      for (const a of s.asteroids) {
        ctx.beginPath();
        for (let i = 0; i < a.shape.length; i++) {
          const ang = a.rot + (i / a.shape.length) * Math.PI * 2;
          const d = a.r * a.shape[i];
          const px = a.x + Math.cos(ang) * d;
          const py = a.y + Math.sin(ang) * d;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      const blink = s.shield > 0 && Math.floor(s.shield * 8) % 2 === 0;
      if (!blink && !s.over) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);
        ctx.strokeStyle = "#22d3ee";
        ctx.fillStyle = "#0891b2";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(SHIP_R * 1.5, 0);
        ctx.lineTo(-SHIP_R, -SHIP_R * 0.8);
        ctx.lineTo(-SHIP_R * 0.4, 0);
        ctx.lineTo(-SHIP_R, SHIP_R * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (s.thrusting) {
          ctx.strokeStyle = "#ef4444";
          ctx.beginPath();
          ctx.moveTo(-SHIP_R * 0.5, 0);
          ctx.lineTo(-SHIP_R * 1.8, -SHIP_R * 0.4);
          ctx.lineTo(-SHIP_R * 2.2, 0);
          ctx.lineTo(-SHIP_R * 1.8, SHIP_R * 0.4);
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.textAlign = "left";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText(`SCORE  ${s.score}`, 24, 32);
      ctx.fillText(`WAVE  ${s.wave}`, 24, 52);
      ctx.textAlign = "right";
      ctx.fillText("▲ ".repeat(s.lives).trim(), WIDTH - 24, 32);

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
      aria-label="Asteroids game"
    />
  );
};
