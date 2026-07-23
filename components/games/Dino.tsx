"use client";

import React, { useEffect, useRef } from "react";
import { GameProps } from "./types";

export const ClassicDino: React.FC<GameProps> = ({ onGameOver }) => {
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

    // Dino
    let dy = h - 60;
    let dvy = 0;
    const gravity = 0.6;
    const jumpPower = -12;
    let isJumping = false;
    
    // Cactus
    interface Cactus { x: number; w: number; h: number; passed: boolean }
    let cacti: Cactus[] = [];
    let speed = 6;
    let score = 0;
    let spawnTimer = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ([" ", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        if (!isJumping && !isGameOver) {
          dvy = jumpPower;
          isJumping = true;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    const update = () => {
      // Physics
      dvy += gravity;
      dy += dvy;
      if (dy >= h - 60) {
        dy = h - 60;
        dvy = 0;
        isJumping = false;
      }

      // Cacti
      spawnTimer++;
      if (spawnTimer > 100 - speed * 2) {
        spawnTimer = 0;
        cacti.push({
          x: w,
          w: 20 + Math.random() * 20,
          h: 40 + Math.random() * 40,
          passed: false
        });
      }

      for (let i = 0; i < cacti.length; i++) {
        let c = cacti[i];
        c.x -= speed;

        // Collision
        if (
          100 < c.x + c.w &&
          140 > c.x &&
          dy < h - 60 + c.h &&
          dy + 40 > h - c.h
        ) {
          isGameOver = true;
          cancelAnimationFrame(animId);
          ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
          ctx.fillRect(0, 0, w, h);
          setTimeout(() => onGameOver(score), 1500);
          return;
        }

        if (!c.passed && c.x < 100) {
          c.passed = true;
          score += 10;
          if (score % 100 === 0) speed += 0.5;
        }
      }
      cacti = cacti.filter(c => c.x + c.w > 0);

      // Draw
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, w, h);

      // Ground
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.moveTo(0, h - 20);
      ctx.lineTo(w, h - 20);
      ctx.stroke();

      // Score
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "bold 24px monospace";
      ctx.fillText(`SCORE: ${score}`, 20, 40);

      // Dino
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(100, dy - 40, 40, 40);

      // Cacti
      ctx.fillStyle = "#10b981";
      cacti.forEach(c => {
        ctx.fillRect(c.x, h - 20 - c.h, c.w, c.h);
      });

      if (!isGameOver) animId = requestAnimationFrame(update);
    };

    if (!isGameOver) animId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(animId);
    };
  }, [onGameOver]);

  return <canvas ref={canvasRef} width={800} height={400} className="w-full max-w-3xl aspect-[2/1] block bg-zinc-950 rounded-xl" />;
};
