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

const BIRD_X = WIDTH / 4;
const BIRD_R = 14;
/** All motion is in pixels per second (or per second squared). */
const GRAVITY = 1400;
const FLAP = -420;
/** Terminal velocity: without it a long fall becomes uncontrollable. */
const MAX_FALL = 700;

const PIPE_W = 64;
const PIPE_GAP = 170;
const PIPE_MIN = 60;
const PIPE_START_SPEED = 190;
const PIPE_SPEEDUP = 18; // per 5 pipes
const PIPE_MAX_SPEED = 360;
const SPAWN_INTERVAL = 1.55;

type Pipe = { x: number; topH: number; passed: boolean };

function initialState() {
  return {
    by: HEIGHT / 2,
    bvy: 0,
    pipes: [] as Pipe[],
    speed: PIPE_START_SPEED,
    spawnTimer: SPAWN_INTERVAL * 0.6,
    score: 0,
    started: false,
    paused: false,
    over: false,
    reported: false,
  };
}

export const ClassicFlappyBird: React.FC<GameProps> = ({ onGameOver }) => {
  const { canvasRef, ctxRef } = useGameCanvas(WIDTH, HEIGHT);
  const onGameOverRef = useLatest(onGameOver);
  const stateRef = useRef(initialState());

  const flap = () => {
    const s = stateRef.current;
    if (s.over || s.paused) return;
    s.started = true;
    s.bvy = FLAP;
  };

  const input = useGameInput({
    target: canvasRef,
    queueDirections: false,
    enableSwipe: false,
    onTap: flap,
    onPause: () => {
      const s = stateRef.current;
      if (!s.over && s.started) s.paused = !s.paused;
    },
  });

  useGameLoop({
    step: 1000 / 120,
    update: (dt) => {
      const s = stateRef.current;
      const io = input.current;
      if (!io || s.over || s.paused) return;

      if (io.consumePress("primary") || io.consumePress("up")) flap();
      if (!s.started) return;

      s.bvy = Math.min(s.bvy + GRAVITY * dt, MAX_FALL);
      s.by += s.bvy * dt;

      if (s.by + BIRD_R >= HEIGHT || s.by - BIRD_R <= 0) {
        s.over = true;
      }

      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0) {
        s.spawnTimer += SPAWN_INTERVAL;
        const maxTop = HEIGHT - PIPE_GAP - PIPE_MIN;
        const topH = PIPE_MIN + Math.random() * (maxTop - PIPE_MIN);
        s.pipes.push({ x: WIDTH + PIPE_W, topH, passed: false });
      }

      for (const p of s.pipes) {
        p.x -= s.speed * dt;

        const overlapsX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W;
        if (overlapsX) {
          const gapTop = p.topH;
          const gapBottom = p.topH + PIPE_GAP;
          if (s.by - BIRD_R < gapTop || s.by + BIRD_R > gapBottom) {
            s.over = true;
            break;
          }
        }

        if (!p.passed && p.x + PIPE_W < BIRD_X) {
          p.passed = true;
          s.score++;
          if (s.score % 5 === 0) {
            s.speed = Math.min(PIPE_MAX_SPEED, s.speed + PIPE_SPEEDUP);
          }
        }
      }
      s.pipes = s.pipes.filter((p) => p.x + PIPE_W > 0);

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

      // Distant skyline, static so it reads as depth without distracting.
      ctx.fillStyle = "rgba(255,255,255,0.015)";
      ctx.fillRect(40, HEIGHT - 220, 80, 220);
      ctx.fillRect(200, HEIGHT - 250, 100, 250);
      ctx.fillRect(450, HEIGHT - 200, 120, 200);
      ctx.fillRect(650, HEIGHT - 240, 90, 240);

      ctx.strokeStyle = "#3b82f6";
      ctx.fillStyle = "rgba(59,130,246,0.12)";
      ctx.lineWidth = 3;
      for (const p of s.pipes) {
        ctx.fillRect(p.x, 0, PIPE_W, p.topH);
        ctx.strokeRect(p.x, 0, PIPE_W, p.topH);
        const bottomY = p.topH + PIPE_GAP;
        ctx.fillRect(p.x, bottomY, PIPE_W, HEIGHT - bottomY);
        ctx.strokeRect(p.x, bottomY, PIPE_W, HEIGHT - bottomY);
      }

      // Bird tilts with its vertical velocity.
      ctx.save();
      ctx.translate(BIRD_X, s.by);
      ctx.rotate(Math.max(-0.5, Math.min(0.9, s.bvy / 600)));
      ctx.fillStyle = "#ec4899";
      ctx.strokeStyle = "#f472b6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(BIRD_R, 0);
      ctx.lineTo(-BIRD_R, -BIRD_R / 1.5);
      ctx.lineTo(-BIRD_R / 2, 0);
      ctx.lineTo(-BIRD_R, BIRD_R / 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.textAlign = "center";
      ctx.font = "bold 44px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillText(String(s.score), WIDTH / 2, 70);

      if (!s.started) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "bold 22px system-ui, sans-serif";
        ctx.fillText("Tap, click, or press Space to flap", WIDTH / 2, HEIGHT / 2 + 80);
      }

      if (s.paused) drawPauseOverlay(ctx, WIDTH, HEIGHT);
      if (s.over) drawGameOverFlash(ctx, WIDTH, HEIGHT);
    },
  });

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={flap}
      className="block h-full w-full cursor-pointer touch-none bg-zinc-950"
      aria-label="Flappy Bird game"
    />
  );
};
