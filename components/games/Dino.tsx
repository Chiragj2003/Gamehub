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
const HEIGHT = 400;
const GROUND_Y = HEIGHT - 40;

const DINO_X = 100;
const DINO_W = 40;
const DINO_H = 44;
const DUCK_H = 24;

const GRAVITY = 2400;
const JUMP = -760;
/** Holding jump after the apex lets the fall come sooner, for short hops. */
const FAST_FALL = 2.2;

const START_SPEED = 390;
const MAX_SPEED = 820;
/** Speed gained per second of survival. */
const ACCEL = 12;

/** Spawn gap shrinks as speed rises so the screen density stays constant. */
const SPAWN_MIN = 0.9;
const SPAWN_MAX = 1.8;

type Obstacle = {
  x: number;
  w: number;
  h: number;
  /** Height above the ground; 0 for cacti, raised for birds. */
  lift: number;
  passed: boolean;
};

function initialState() {
  return {
    y: GROUND_Y,
    vy: 0,
    grounded: true,
    ducking: false,
    obstacles: [] as Obstacle[],
    speed: START_SPEED,
    spawnTimer: 1.2,
    distance: 0,
    score: 0,
    started: false,
    paused: false,
    over: false,
    reported: false,
    legPhase: 0,
  };
}

export const ClassicDino: React.FC<GameProps> = ({ onGameOver }) => {
  const { canvasRef, ctxRef } = useGameCanvas(WIDTH, HEIGHT);
  const onGameOverRef = useLatest(onGameOver);
  const stateRef = useRef(initialState());

  const jump = () => {
    const s = stateRef.current;
    if (s.over || s.paused) return;
    s.started = true;
    if (s.grounded && !s.ducking) {
      s.vy = JUMP;
      s.grounded = false;
    }
  };

  const input = useGameInput({
    target: canvasRef,
    queueDirections: false,
    enableSwipe: true,
    onTap: jump,
    onPause: () => {
      const s = stateRef.current;
      if (!s.over && s.started) s.paused = !s.paused;
    },
  });

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

      if (io.consumePress("primary") || io.consumePress("up")) jump();
      // Swipe down on touch also ducks; the swipe registers as a "down" press.
      s.ducking = s.grounded && (io.isDown("down") || io.consumePress("down"));
      if (!s.started) return;

      const holdingJump = io.isDown("primary") || io.isDown("up");
      const g = !holdingJump && s.vy < 0 ? GRAVITY * FAST_FALL : GRAVITY;
      s.vy += g * dt;
      s.y += s.vy * dt;
      if (s.y >= GROUND_Y) {
        s.y = GROUND_Y;
        s.vy = 0;
        s.grounded = true;
      }

      s.speed = Math.min(MAX_SPEED, s.speed + ACCEL * dt);
      s.distance += s.speed * dt;
      // Score like the original: one point per ~10px travelled.
      s.score = Math.floor(s.distance / 10);
      s.legPhase += dt * 12;

      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0) {
        const speedRatio = (s.speed - START_SPEED) / (MAX_SPEED - START_SPEED);
        s.spawnTimer = SPAWN_MAX - (SPAWN_MAX - SPAWN_MIN) * speedRatio + Math.random() * 0.6;

        // Birds appear only once the player has warmed up.
        const isBird = s.score > 200 && Math.random() < 0.28;
        if (isBird) {
          // Low birds must be jumped; high birds must be ducked under.
          const lift = Math.random() < 0.5 ? 18 : DUCK_H + 16;
          s.obstacles.push({ x: WIDTH + 40, w: 40, h: 22, lift, passed: false });
        } else {
          const count = 1 + (Math.random() < 0.3 ? 1 : 0) + (s.score > 400 && Math.random() < 0.25 ? 1 : 0);
          const w = 18 * count + (count - 1) * 6;
          const h = 38 + Math.random() * 28;
          s.obstacles.push({ x: WIDTH + 40, w, h, lift: 0, passed: false });
        }
      }

      const dinoH = s.ducking ? DUCK_H : DINO_H;
      const dinoTop = s.y - dinoH;
      // Slightly inset hitbox so near misses feel fair, as in the original.
      const hx = DINO_X + 6;
      const hw = DINO_W - 12;

      for (const o of s.obstacles) {
        o.x -= s.speed * dt;
        const oTop = GROUND_Y - o.lift - o.h;
        const oBottom = GROUND_Y - o.lift;
        if (hx < o.x + o.w && hx + hw > o.x && dinoTop < oBottom && s.y > oTop) {
          s.over = true;
          break;
        }
      }
      s.obstacles = s.obstacles.filter((o) => o.x + o.w > -10);
    },

    render: () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      const s = stateRef.current;

      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y + 1);
      ctx.lineTo(WIDTH, GROUND_Y + 1);
      ctx.stroke();

      // Ground texture scrolls with the run so speed is visible.
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      const scroll = (s.distance * 1) % 80;
      for (let x = -scroll; x < WIDTH; x += 80) {
        ctx.fillRect(x, GROUND_Y + 10, 26, 2);
        ctx.fillRect(x + 44, GROUND_Y + 16, 12, 2);
      }

      ctx.fillStyle = "#10b981";
      for (const o of s.obstacles) {
        const top = GROUND_Y - o.lift - o.h;
        if (o.lift > 0) {
          // Bird: body plus a flapping wing.
          ctx.fillRect(o.x, top + 6, o.w, o.h - 12);
          const wingUp = Math.floor(s.legPhase) % 2 === 0;
          ctx.fillRect(o.x + o.w / 2 - 4, wingUp ? top : top + o.h - 6, 8, 6);
        } else {
          ctx.fillRect(o.x, top, o.w, o.h);
          // Cactus arms.
          ctx.fillRect(o.x - 6, top + 10, 6, 14);
          ctx.fillRect(o.x + o.w, top + 16, 6, 12);
        }
      }

      const dinoH = s.ducking ? DUCK_H : DINO_H;
      const dinoW = s.ducking ? DINO_W + 14 : DINO_W;
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(DINO_X, s.y - dinoH, dinoW, dinoH);
      // Eye
      ctx.fillStyle = "#09090b";
      ctx.fillRect(DINO_X + dinoW - 12, s.y - dinoH + 8, 5, 5);
      // Legs alternate while running on the ground.
      if (s.grounded && s.started) {
        const step = Math.floor(s.legPhase) % 2 === 0;
        ctx.fillStyle = "#09090b";
        ctx.fillRect(DINO_X + (step ? 6 : 22), s.y - 8, 8, 8);
      }

      ctx.textAlign = "right";
      ctx.font = "bold 22px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText(String(s.score).padStart(5, "0"), WIDTH - 24, 40);

      if (!s.started) {
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "bold 20px system-ui, sans-serif";
        ctx.fillText("Space / tap to jump  ·  Down / swipe down to duck", WIDTH / 2, HEIGHT / 2 - 40);
      }

      if (s.paused) drawPauseOverlay(ctx, WIDTH, HEIGHT);
      if (s.over) drawGameOverFlash(ctx, WIDTH, HEIGHT);
    },
  });

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={jump}
      className="cursor-pointer touch-none bg-zinc-950"
      aria-label="Dino runner game"
    />
  );
};
