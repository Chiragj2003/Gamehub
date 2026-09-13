"use client";

import React, { useRef, useState } from "react";
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

const PAD_W = 12;
const PAD_H = 80;
const PAD_INSET = 10;
/** Pixels per second — every speed below is per second, not per frame. */
const PADDLE_SPEED = 420;
const AI_SPEED = 330;

const BALL_RADIUS = 8;
const BALL_START_SPEED = 330;
/** Hard ceiling: above this the ball outruns any human reaction time. */
const BALL_MAX_SPEED = 780;
const BALL_SPEEDUP = 1.04;

const WIN_SCORE = 11;

type Mode = "ai" | "two-player";

function initialState() {
  return {
    p1y: (HEIGHT - PAD_H) / 2,
    p2y: (HEIGHT - PAD_H) / 2,
    bx: WIDTH / 2,
    by: HEIGHT / 2,
    bvx: BALL_START_SPEED,
    bvy: 0,
    p1score: 0,
    p2score: 0,
    aiError: 0,
    /** Countdown before the ball launches, so a point does not start instantly. */
    serveDelay: 1.2,
    over: false,
    paused: false,
    reported: false,
  };
}

export const ClassicPong: React.FC<GameProps> = ({ onGameOver }) => {
  const { canvasRef, ctxRef } = useGameCanvas(WIDTH, HEIGHT);
  const stateRef = useRef(initialState());
  const [mode, setMode] = useState<Mode>("ai");
  const modeRef = useLatest(mode);
  const onGameOverRef = useLatest(onGameOver);

  const input = useGameInput({
    target: canvasRef,
    queueDirections: false,
    onPause: () => {
      const s = stateRef.current;
      if (!s.over) s.paused = !s.paused;
    },
  });

  const serve = (s: ReturnType<typeof initialState>, direction: number) => {
    s.bx = WIDTH / 2;
    s.by = HEIGHT / 2;
    s.bvx = direction * BALL_START_SPEED;
    s.bvy = (Math.random() - 0.5) * BALL_START_SPEED * 0.6;
    s.serveDelay = 1.2;
    // Re-roll the AI's aim error each point so it is not perfectly predictable.
    s.aiError = (Math.random() - 0.5) * 46;
  };

  /**
   * Swept paddle collision.
   *
   * The old version tested the ball's centre against a fixed band each frame.
   * Once the ball got fast enough it jumped the whole paddle between frames and
   * passed straight through. Checking whether the ball *crossed* the paddle
   * plane during this step catches it at any speed.
   */
  const collide = (
    s: ReturnType<typeof initialState>,
    prevX: number,
    prevY: number,
    planeX: number,
    paddleY: number,
    movingLeft: boolean
  ): boolean => {
    const edge = movingLeft ? prevX - BALL_RADIUS : prevX + BALL_RADIUS;
    const nowEdge = movingLeft ? s.bx - BALL_RADIUS : s.bx + BALL_RADIUS;

    const crossed = movingLeft
      ? edge >= planeX && nowEdge <= planeX
      : edge <= planeX && nowEdge >= planeX;
    if (!crossed) return false;

    // Interpolate the ball's Y at the exact moment it reached the paddle plane,
    // rather than using its end-of-step position, which on a fast shot can be
    // well past the paddle.
    const span = edge - nowEdge;
    const t = span === 0 ? 0 : (edge - planeX) / span;
    const contactY = prevY + (s.by - prevY) * t;

    // Use the ball's extent, not just its centre, so edge hits still count.
    if (contactY + BALL_RADIUS < paddleY || contactY - BALL_RADIUS > paddleY + PAD_H) {
      return false;
    }

    const speed = Math.min(Math.hypot(s.bvx, s.bvy) * BALL_SPEEDUP, BALL_MAX_SPEED);
    // Where the ball struck the paddle sets the bounce angle, capped at 60°
    // so a rally can never devolve into a nearly vertical, unreturnable shot.
    const offset = (contactY - (paddleY + PAD_H / 2)) / (PAD_H / 2);
    const angle = Math.max(-1, Math.min(1, offset)) * (Math.PI / 3);

    s.bvx = (movingLeft ? 1 : -1) * speed * Math.cos(angle);
    s.bvy = speed * Math.sin(angle);
    s.bx = movingLeft ? planeX + BALL_RADIUS : planeX - BALL_RADIUS;
    return true;
  };

  useGameLoop({
    step: 1000 / 120, // finer step keeps fast-ball collision precise
    update: (dt) => {
      const s = stateRef.current;
      const io = input.current;
      if (!io || s.over || s.paused) return;

      const twoPlayer = modeRef.current === "two-player";

      // Player 1 — W/S in two-player mode, either scheme against the CPU.
      const p1Up = twoPlayer ? io.isKeyDown("w") : io.isDown("up");
      const p1Down = twoPlayer ? io.isKeyDown("s") : io.isDown("down");
      if (p1Up) s.p1y -= PADDLE_SPEED * dt;
      if (p1Down) s.p1y += PADDLE_SPEED * dt;
      s.p1y = Math.max(0, Math.min(HEIGHT - PAD_H, s.p1y));

      if (twoPlayer) {
        // Player 2 — arrow keys, or drag on the right half of a touchscreen.
        if (io.isKeyDown("arrowup")) s.p2y -= PADDLE_SPEED * dt;
        if (io.isKeyDown("arrowdown")) s.p2y += PADDLE_SPEED * dt;
        const p = io.pointer();
        if (p && p.x > WIDTH / 2) s.p2y = p.y - PAD_H / 2;
        s.p2y = Math.max(0, Math.min(HEIGHT - PAD_H, s.p2y));
      } else {
        // AI tracks the ball only while it is approaching, which is what makes
        // it beatable — it cannot pre-position during the return leg.
        if (s.bvx > 0) {
          const target = s.by + s.aiError - PAD_H / 2;
          const delta = target - s.p2y;
          const move = AI_SPEED * dt;
          s.p2y += Math.abs(delta) < move ? delta : Math.sign(delta) * move;
        }
        s.p2y = Math.max(0, Math.min(HEIGHT - PAD_H, s.p2y));
      }

      if (s.serveDelay > 0) {
        s.serveDelay -= dt;
        return;
      }

      const prevX = s.bx;
      const prevY = s.by;
      s.bx += s.bvx * dt;
      s.by += s.bvy * dt;

      if (s.by - BALL_RADIUS <= 0) {
        s.by = BALL_RADIUS;
        s.bvy = Math.abs(s.bvy);
      } else if (s.by + BALL_RADIUS >= HEIGHT) {
        s.by = HEIGHT - BALL_RADIUS;
        s.bvy = -Math.abs(s.bvy);
      }

      if (s.bvx < 0) {
        collide(s, prevX, prevY, PAD_INSET + PAD_W, s.p1y, true);
      } else {
        collide(s, prevX, prevY, WIDTH - PAD_INSET - PAD_W, s.p2y, false);
      }

      if (s.bx + BALL_RADIUS < 0) {
        s.p2score++;
        if (s.p2score >= WIN_SCORE) s.over = true;
        else serve(s, 1);
      } else if (s.bx - BALL_RADIUS > WIDTH) {
        s.p1score++;
        if (s.p1score >= WIN_SCORE) s.over = true;
        else serve(s, -1);
      }

      if (s.over && !s.reported) {
        s.reported = true;
        // Rally length matters more than the final margin, so score on points
        // won plus a win bonus — consistent whether you win or lose.
        const final = s.p1score * 100 + (s.p1score >= WIN_SCORE ? 500 : 0);
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
      ctx.setLineDash([15, 15]);
      ctx.beginPath();
      ctx.moveTo(WIDTH / 2, 0);
      ctx.lineTo(WIDTH / 2, HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = "bold 48px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.textAlign = "center";
      ctx.fillText(String(s.p1score), WIDTH / 4, 80);
      ctx.fillText(String(s.p2score), (3 * WIDTH) / 4, 80);

      ctx.fillStyle = "#06b6d4";
      ctx.fillRect(PAD_INSET, s.p1y, PAD_W, PAD_H);
      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(WIDTH - PAD_INSET - PAD_W, s.p2y, PAD_W, PAD_H);

      if (s.serveDelay <= 0) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s.bx, s.by, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "bold 20px system-ui, sans-serif";
        ctx.fillText(
          `First to ${WIN_SCORE}`,
          WIDTH / 2,
          HEIGHT / 2 + 100
        );
      }

      if (s.paused) drawPauseOverlay(ctx, WIDTH, HEIGHT);
      if (s.over) {
        drawGameOverFlash(ctx, WIDTH, HEIGHT);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 44px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          s.p1score >= WIN_SCORE ? "YOU WIN" : "YOU LOSE",
          WIDTH / 2,
          HEIGHT / 2
        );
      }
    },
  });

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none bg-zinc-950"
        aria-label="Pong game"
      />
      <div className="absolute left-1/2 top-3 flex -translate-x-1/2 gap-1 rounded-full border border-white/10 bg-black/60 p-1 backdrop-blur">
        {(["ai", "two-player"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              stateRef.current = initialState();
              setMode(m);
            }}
            className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              mode === m ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            {m === "ai" ? "vs CPU" : "2 Player"}
          </button>
        ))}
      </div>
    </div>
  );
};
