"use client";

import React, { useEffect, useRef } from "react";
import { GameProps } from "./types";

export const ClassicBreakout: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let isGameOver = false;
    const w = canvas.width;
    const h = canvas.height;

    // Paddle
    const padW = 100;
    const padH = 14;
    let padX = (w - padW) / 2;
    const padSpeed = 7;

    // Ball
    let bx = w / 2;
    let by = h - 50;
    let bvx = 4;
    let bvy = -4;
    const brad = 7;

    // Bricks
    const brickRows = 5;
    const brickCols = 8;
    const bPadding = 10;
    const bOffsetTop = 50;
    const bOffsetLeft = 35;
    const brickW = (w - bOffsetLeft * 2 - bPadding * (brickCols - 1)) / brickCols;
    const brickH = 20;

    interface Brick {
      x: number;
      y: number;
      status: number;
      color: string;
    }
    const colors = ["#f43f5e", "#d946ef", "#a855f7", "#3b82f6", "#06b6d4"];
    const bricks: Brick[][] = [];

    for (let r = 0; r < brickRows; r++) {
      bricks[r] = [];
      for (let c = 0; c < brickCols; c++) {
        bricks[r][c] = {
          x: c * (brickW + bPadding) + bOffsetLeft,
          y: r * (brickH + bPadding) + bOffsetTop,
          status: 1,
          color: colors[r],
        };
      }
    }

    let score = 0;
    let lives = 3;
    const keysPressed: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      keysPressed[e.key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const triggerGameOver = (finalScore: number) => {
      isGameOver = true;
      cancelAnimationFrame(animId);
      ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
      ctx.fillRect(0, 0, w, h);
      setTimeout(() => onGameOver(finalScore), 1500);
    };

    const update = () => {
      // Paddle input
      if (keysPressed["ArrowLeft"]) padX = Math.max(0, padX - padSpeed);
      if (keysPressed["ArrowRight"]) padX = Math.min(w - padW, padX + padSpeed);

      // Ball move
      bx += bvx;
      by += bvy;

      // Wall bounces (left/right)
      if (bx - brad <= 0 || bx + brad >= w) {
        bvx = -bvx;
      }
      // Wall bounces (top)
      if (by - brad <= 0) {
        bvy = -bvy;
      }

      // Ball out bottom
      if (by + brad >= h) {
        lives--;
        if (lives <= 0) {
          triggerGameOver(score);
          return;
        } else {
          // Reset ball
          bx = w / 2;
          by = h - 50;
          bvx = 4;
          bvy = -4;
          padX = (w - padW) / 2;
        }
      }

      // Paddle bounce
      if (by + brad >= h - 25 - padH && by - brad <= h - 25) {
        if (bx >= padX && bx <= padX + padW) {
          bvy = -Math.abs(bvy); // deflect up
          // alter angle depending on hit location
          const relativePos = (bx - (padX + padW / 2)) / (padW / 2);
          bvx = relativePos * 6;
        }
      }

      // Brick collision
      let activeBricks = 0;
      for (let r = 0; r < brickRows; r++) {
        for (let c = 0; c < brickCols; c++) {
          const b = bricks[r][c];
          if (b.status === 1) {
            activeBricks++;
            // Check collision
            if (bx + brad > b.x && bx - brad < b.x + brickW && by + brad > b.y && by - brad < b.y + brickH) {
              bvy = -bvy;
              b.status = 0;
              score += 20;
            }
          }
        }
      }

      if (activeBricks === 0) {
        // Victory!
        triggerGameOver(score + 1000); // 1000 victory bonus points
        return;
      }

      // Render
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, w, h);

      // Draw HUD
      ctx.font = "semibold 12px sans-serif";
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText(`SCORE: ${score}`, 25, 25);
      ctx.fillText(`LIVES: ${"❤".repeat(lives)}`, w - 100, 25);

      // Draw bricks
      for (let r = 0; r < brickRows; r++) {
        for (let c = 0; c < brickCols; c++) {
          const b = bricks[r][c];
          if (b.status === 1) {
            ctx.save();
            ctx.shadowColor = b.color;
            
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, brickW, brickH);
            ctx.restore();
          }
        }
      }

      // Draw paddle (Neon Violet)
      ctx.save();
      
      
      ctx.fillStyle = "#8b5cf6";
      ctx.fillRect(padX, h - 25 - padH, padW, padH);
      ctx.restore();

      // Draw ball (Neon White)
      ctx.save();
      
      
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(bx, by, brad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (!isGameOver) animId = requestAnimationFrame(update);
    };

    if (!isGameOver) animId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cancelAnimationFrame(animId);
    };
  }, [onGameOver]);

  return <canvas ref={canvasRef} width={800} height={600} className="w-full h-full block bg-zinc-950" />;
};
