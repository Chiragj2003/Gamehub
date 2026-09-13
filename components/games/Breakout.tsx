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

const PAD_W = 110;
const PAD_H = 14;
const PAD_Y = HEIGHT - 40;
const PAD_SPEED = 560;

const BALL_R = 7;
const BALL_START_SPEED = 340;
const BALL_SPEED_PER_LEVEL = 40;
const BALL_MAX_SPEED = 620;
/** Bounce angle range off the paddle, measured from vertical. */
const MAX_BOUNCE = Math.PI / 3;

const BRICK_COLS = 10;
const BRICK_H = 22;
const BRICK_PAD = 6;
const BRICK_TOP = 70;
const BRICK_SIDE = 30;
const BRICK_W = (WIDTH - BRICK_SIDE * 2 - BRICK_PAD * (BRICK_COLS - 1)) / BRICK_COLS;

const COLORS = ["#f43f5e", "#f97316", "#eab308", "#10b981", "#06b6d4", "#a855f7"];

type Brick = { x: number; y: number; hp: number; color: string };

function buildBricks(level: number): Brick[] {
  const rows = Math.min(4 + level, 8);
  const bricks: Brick[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      // Top rows take two hits from level 2 onward.
      const hp = level >= 2 && r < 2 ? 2 : 1;
      bricks.push({
        x: BRICK_SIDE + c * (BRICK_W + BRICK_PAD),
        y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
        hp,
        color: COLORS[r % COLORS.length],
      });
    }
  }
  return bricks;
}

function initialState() {
  return {
    padX: (WIDTH - PAD_W) / 2,
    bx: WIDTH / 2,
    by: PAD_Y - BALL_R - 1,
    bvx: 0,
    bvy: 0,
    /** Ball rides the paddle until launched. */
    stuck: true,
    bricks: buildBricks(1),
    level: 1,
    score: 0,
    lives: 3,
    paused: false,
    over: false,
    reported: false,
    /** Brief banner shown between levels. */
    banner: 0,
    lastPointerX: -1,
  };
}

export const ClassicBreakout: React.FC<GameProps> = ({ onGameOver }) => {
  const { canvasRef, ctxRef } = useGameCanvas(WIDTH, HEIGHT);
  const onGameOverRef = useLatest(onGameOver);
  const stateRef = useRef(initialState());

  const launch = () => {
    const s = stateRef.current;
    if (!s.stuck || s.over || s.paused) return;
    s.stuck = false;
    const speed = Math.min(BALL_MAX_SPEED, BALL_START_SPEED + (s.level - 1) * BALL_SPEED_PER_LEVEL);
    const angle = (Math.random() - 0.5) * 0.6;
    s.bvx = Math.sin(angle) * speed;
    s.bvy = -Math.cos(angle) * speed;
  };

  const input = useGameInput({
    target: canvasRef,
    queueDirections: false,
    enableSwipe: false,
    onTap: launch,
    onPause: () => {
      const s = stateRef.current;
      if (!s.over) s.paused = !s.paused;
    },
  });

  useGameLoop({
    // Window blur pauses the loop; latch our own flag so the PAUSED overlay
    // shows and the player resumes deliberately when focus returns.
    onPauseChange: (paused) => {
      const s = stateRef.current;
      if (paused && !s.over) s.paused = true;
    },
    step: 1000 / 240, // fine step so a fast ball never skips a brick
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

      if (s.banner > 0) {
        s.banner -= dt;
        return;
      }

      // Paddle: keys take priority; otherwise follow the pointer or finger,
      // but only while it is actually moving so a resting mouse does not pin
      // the paddle for a keyboard player.
      const keyed = io.isDown("left") || io.isDown("right");
      const p = io.pointer();
      if (keyed) {
        if (io.isDown("left")) s.padX -= PAD_SPEED * dt;
        if (io.isDown("right")) s.padX += PAD_SPEED * dt;
      } else if (p && p.x !== s.lastPointerX) {
        s.padX = p.x - PAD_W / 2;
      }
      if (p) s.lastPointerX = p.x;
      s.padX = Math.max(0, Math.min(WIDTH - PAD_W, s.padX));

      if (io.consumePress("primary") || io.consumePress("up")) launch();

      if (s.stuck) {
        s.bx = s.padX + PAD_W / 2;
        s.by = PAD_Y - BALL_R - 1;
        return;
      }

      s.bx += s.bvx * dt;
      s.by += s.bvy * dt;

      // Walls: reflect and clamp so the ball cannot sink into an edge.
      if (s.bx - BALL_R <= 0) {
        s.bx = BALL_R;
        s.bvx = Math.abs(s.bvx);
      } else if (s.bx + BALL_R >= WIDTH) {
        s.bx = WIDTH - BALL_R;
        s.bvx = -Math.abs(s.bvx);
      }
      if (s.by - BALL_R <= 0) {
        s.by = BALL_R;
        s.bvy = Math.abs(s.bvy);
      }

      // Paddle: only while descending, using the ball's full extent.
      if (
        s.bvy > 0 &&
        s.by + BALL_R >= PAD_Y &&
        s.by - BALL_R <= PAD_Y + PAD_H &&
        s.bx + BALL_R >= s.padX &&
        s.bx - BALL_R <= s.padX + PAD_W
      ) {
        // Angle depends on where the ball struck; speed stays constant so a
        // centre hit is not slower than an edge hit.
        const rel = (s.bx - (s.padX + PAD_W / 2)) / (PAD_W / 2);
        const angle = Math.max(-1, Math.min(1, rel)) * MAX_BOUNCE;
        const speed = Math.hypot(s.bvx, s.bvy);
        s.bvx = Math.sin(angle) * speed;
        s.bvy = -Math.cos(angle) * speed;
        s.by = PAD_Y - BALL_R;
      }

      if (s.by - BALL_R > HEIGHT) {
        s.lives--;
        if (s.lives <= 0) {
          s.over = true;
        } else {
          s.stuck = true;
        }
      }

      // Bricks: one hit per step, reflected on the axis of least penetration.
      // Flipping Y on every brick (the old behaviour) sent side hits straight
      // through, and two hits in one frame cancelled out entirely.
      for (let i = 0; i < s.bricks.length; i++) {
        const b = s.bricks[i];
        const closestX = Math.max(b.x, Math.min(s.bx, b.x + BRICK_W));
        const closestY = Math.max(b.y, Math.min(s.by, b.y + BRICK_H));
        const dx = s.bx - closestX;
        const dy = s.by - closestY;
        if (dx * dx + dy * dy > BALL_R * BALL_R) continue;

        const overlapX = BALL_R - Math.abs(dx);
        const overlapY = BALL_R - Math.abs(dy);
        if (overlapX < overlapY) {
          s.bvx = dx < 0 ? -Math.abs(s.bvx) : Math.abs(s.bvx);
          s.bx += dx < 0 ? -overlapX : overlapX;
        } else {
          s.bvy = dy < 0 ? -Math.abs(s.bvy) : Math.abs(s.bvy);
          s.by += dy < 0 ? -overlapY : overlapY;
        }

        b.hp--;
        s.score += b.hp === 0 ? 20 : 10;
        if (b.hp === 0) s.bricks.splice(i, 1);
        break;
      }

      if (s.bricks.length === 0) {
        s.score += 500 * s.level;
        s.level++;
        s.bricks = buildBricks(s.level);
        s.stuck = true;
        s.banner = 1.5;
      }
    },

    render: () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      const s = stateRef.current;

      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (const b of s.bricks) {
        ctx.fillStyle = b.color;
        ctx.globalAlpha = b.hp > 1 ? 1 : 0.85;
        ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
        if (b.hp > 1) {
          ctx.strokeStyle = "rgba(255,255,255,0.6)";
          ctx.lineWidth = 2;
          ctx.strokeRect(b.x + 1, b.y + 1, BRICK_W - 2, BRICK_H - 2);
        }
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#8b5cf6";
      ctx.fillRect(s.padX, PAD_Y, PAD_W, PAD_H);

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s.bx, s.by, BALL_R, 0, Math.PI * 2);
      ctx.fill();

      ctx.textAlign = "left";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText(`SCORE  ${s.score}`, 24, 32);
      ctx.fillText(`LEVEL  ${s.level}`, 24, 52);
      ctx.textAlign = "right";
      ctx.fillText("♥ ".repeat(s.lives).trim(), WIDTH - 24, 32);

      if (s.stuck && s.banner <= 0) {
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = "bold 18px system-ui, sans-serif";
        ctx.fillText("Space or tap to launch  ·  ← → or drag to move", WIDTH / 2, HEIGHT / 2 + 60);
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
      onMouseDown={launch}
      className="touch-none bg-zinc-950"
      aria-label="Breakout game"
    />
  );
};
