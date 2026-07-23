"use client";

import React, { useEffect, useRef } from "react";
import { GameProps } from "./types";

export const ClassicPong: React.FC<GameProps> = ({ onGameOver }) => {
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

    // Paddle Config
    const padW = 12;
    const padH = 80;
    let p1y = (h - padH) / 2;
    let p2y = (h - padH) / 2;
    const paddleSpeed = 6;

    // Ball Config
    let bx = w / 2;
    let by = h / 2;
    let bvx = 5;
    let bvy = 3;
    const brad = 8;

    let p1score = 0;
    let p2score = 0;
    let keysPressed: Record<string, boolean> = {};

    const resetBall = (direction: number) => {
      bx = w / 2;
      by = h / 2;
      bvx = direction * 5;
      bvy = (Math.random() - 0.5) * 6;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "w", "s", " "].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      keysPressed[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    let aiErrorOffset = 0;

    const triggerGameOver = (finalScore: number) => {
      isGameOver = true;
      cancelAnimationFrame(animId);
      ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
      ctx.fillRect(0, 0, w, h);
      setTimeout(() => onGameOver(finalScore), 1500);
    };

    const update = () => {
      // P1 input (W/S)
      if (keysPressed["w"]) p1y = Math.max(0, p1y - paddleSpeed);
      if (keysPressed["s"]) p1y = Math.min(h - padH, p1y + paddleSpeed);

      // P2 input (Arrows or AI)
      // AI tracking with error margin
      const aiTarget = by - padH / 2 + aiErrorOffset;
      if (p2y < aiTarget - 4) {
        p2y = Math.min(h - padH, p2y + paddleSpeed * 0.70);
      } else if (p2y > aiTarget + 4) {
        p2y = Math.max(0, p2y - paddleSpeed * 0.70);
      }

      // Ball move
      bx += bvx;
      by += bvy;

      // Ball wall bounces (top/bottom)
      if (by - brad <= 0) {
        by = brad;
        bvy = -bvy;
      } else if (by + brad >= h) {
        by = h - brad;
        bvy = -bvy;
      }

      // Ball paddle bounces
      // P1 (Left)
      if (bx - brad <= padW + 10 && bx + brad >= 10) {
        if (by >= p1y && by <= p1y + padH) {
          bvx = -bvx * 1.05; // speed up slightly
          const relativeIntersectY = (p1y + padH / 2) - by;
          bvy = -(relativeIntersectY / (padH / 2)) * 5;
          bx = padW + 10 + brad;
        }
      }
      // P2 (Right)
      if (bx + brad >= w - 10 - padW && bx - brad <= w - 10) {
        if (by >= p2y && by <= p2y + padH) {
          bvx = -bvx * 1.05;
          const relativeIntersectY = (p2y + padH / 2) - by;
          bvy = -(relativeIntersectY / (padH / 2)) * 5;
          bx = w - 10 - padW - brad;
        }
      }

      // Scoring
      if (bx - brad < 0) {
        p2score++;
        if (p2score >= 11) {
          triggerGameOver(p1score * 100);
          return;
        }
        aiErrorOffset = (Math.random() - 0.5) * 40;
        resetBall(1);
      } else if (bx + brad > w) {
        p1score++;
        if (p1score >= 11) {
          triggerGameOver(p1score * 100 + 500); // Victory bonus
          return;
        }
        aiErrorOffset = (Math.random() - 0.5) * 40;
        resetBall(-1);
      }

      // Render
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, w, h);

      // Dash center line
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 4;
      ctx.setLineDash([15, 15]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Scores
      ctx.font = "bold 48px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillText(p1score.toString(), w / 4, 80);
      ctx.fillText(p2score.toString(), (3 * w) / 4, 80);

      // P1 Paddle (Neon Cyan)
      ctx.save();
      
      
      ctx.fillStyle = "#06b6d4";
      ctx.fillRect(10, p1y, padW, padH);
      ctx.restore();

      // P2 Paddle (Neon Red)
      ctx.save();
      
      
      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(w - 10 - padW, p2y, padW, padH);
      ctx.restore();

      // Ball (Neon White)
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
