"use client";

import React, { useEffect, useRef } from "react";
import { GameProps } from "./types";

export const ClassicFlappyBird: React.FC<GameProps> = ({ onGameOver }) => {
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

    // Bird state
    let by = h / 2;
    let bvy = 0;
    const gravity = 0.25;
    const flapPower = -5.5;
    const brad = 14;

    // Pipes state
    interface Pipe {
      x: number;
      topH: number;
      bottomH: number;
      passed: boolean;
    }
    let pipes: Pipe[] = [];
    const pipeW = 60;
    const pipeGap = 160;
    let pipeSpeed = 3.0;
    let score = 0;
    let spawnTimer = 0;

    const triggerGameOver = () => {
      isGameOver = true;
      cancelAnimationFrame(animId);
      ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
      ctx.fillRect(0, 0, w, h);
      setTimeout(() => onGameOver(score), 1500);
    };

    const spawnPipe = () => {
      const minH = 60;
      const maxH = h - pipeGap - minH;
      const topH = Math.floor(Math.random() * (maxH - minH)) + minH;
      const bottomH = h - pipeGap - topH;
      pipes.push({ x: w, topH, bottomH, passed: false });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        bvy = flapPower;
      }
    };

    const handleMouseDown = () => {
      bvy = flapPower;
    };

    window.addEventListener("keydown", handleKeyDown);
    canvas.addEventListener("mousedown", handleMouseDown);

    // Initial spawn
    spawnPipe();

    const update = () => {
      // Physics
      bvy += gravity;
      by += bvy;

      // Wall collision (floor/ceiling)
      if (by + brad >= h || by - brad <= 0) {
        triggerGameOver();
        return;
      }

      // Pipes update
      pipes.forEach(pipe => {
        pipe.x -= pipeSpeed;

        // Collision Check
        const birdX = w / 4;
        if (birdX + brad > pipe.x && birdX - brad < pipe.x + pipeW) {
          if (by - brad < pipe.topH || by + brad > h - pipe.bottomH) {
            triggerGameOver();
          }
        }

        // Score check
        if (!pipe.passed && pipe.x + pipeW < birdX) {
          pipe.passed = true;
          score += 1;
          // Increase speed slightly
          if (score % 5 === 0) {
            pipeSpeed += 0.5;
          }
        }
      });

      // Clear off-screen pipes
      pipes = pipes.filter(p => p.x + pipeW > 0);

      // Pipe spawning
      spawnTimer++;
      if (spawnTimer >= 100) {
        spawnTimer = 0;
        spawnPipe();
      }

      // Draw
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, w, h);

      // Draw background city silhouettes (Neon theme)
      ctx.fillStyle = "rgba(255,255,255,0.01)";
      ctx.fillRect(0, h - 180, w, 180);
      ctx.fillStyle = "rgba(255,255,255,0.015)";
      ctx.fillRect(40, h - 220, 80, 220);
      ctx.fillRect(200, h - 250, 100, 250);
      ctx.fillRect(450, h - 200, 120, 200);

      // Draw Pipes
      pipes.forEach(p => {
        ctx.save();
        
        
        ctx.strokeStyle = "#3b82f6";
        ctx.fillStyle = "rgba(59,130,246,0.1)";
        ctx.lineWidth = 3;

        // Top Pipe
        ctx.fillRect(p.x, 0, pipeW, p.topH);
        ctx.strokeRect(p.x, 0, pipeW, p.topH);

        // Bottom Pipe
        ctx.fillRect(p.x, h - p.bottomH, pipeW, p.bottomH);
        ctx.strokeRect(p.x, h - p.bottomH, pipeW, p.bottomH);

        ctx.restore();
      });

      // Draw Bird (Neon Pink Triangle)
      ctx.save();
      
      
      ctx.fillStyle = "#ec4899";
      ctx.strokeStyle = "#f472b6";
      ctx.lineWidth = 2;

      ctx.beginPath();
      // Draw flying ship/bird pointing in movement direction
      const angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 6, bvy * 0.08));
      ctx.translate(w / 4, by);
      ctx.rotate(angle);
      ctx.moveTo(brad, 0);
      ctx.lineTo(-brad, -brad / 1.5);
      ctx.lineTo(-brad / 2, 0);
      ctx.lineTo(-brad, brad / 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      // HUD Score
      ctx.font = "bold 36px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillText(score.toString(), w / 2 - 10, 60);

      if (!isGameOver) animId = requestAnimationFrame(update);
    };

    if (!isGameOver) animId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("mousedown", handleMouseDown);
      cancelAnimationFrame(animId);
    };
  }, [onGameOver]);

  return <canvas ref={canvasRef} width={800} height={600} className="w-full h-full block bg-zinc-950" />;
};
