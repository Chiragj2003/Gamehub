"use client";

import React, { useEffect, useRef } from "react";
import { GameProps } from "./types";

export const ClassicBalance: React.FC<GameProps> = ({ onGameOver }) => {
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

    let angle = 0;
    let velocity = 0;
    let playerMove = 0;
    let score = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") playerMove = -0.05;
      if (e.key === "ArrowRight") playerMove = 0.05;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && playerMove < 0) playerMove = 0;
      if (e.key === "ArrowRight" && playerMove > 0) playerMove = 0;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const update = () => {
      score++;
      
      // Wind / instability
      velocity += (Math.random() - 0.5) * 0.005;
      velocity += playerMove;
      
      // Gravity pulls it down more if it's already leaning
      velocity += angle * 0.02;
      
      angle += velocity;

      if (Math.abs(angle) > Math.PI / 3) {
        isGameOver = true;
        cancelAnimationFrame(animId);
        ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
        ctx.fillRect(0, 0, w, h);
        setTimeout(() => onGameOver(score), 1500);
        return;
      }

      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "bold 24px monospace";
      ctx.fillText(`SCORE: ${score}`, 20, 40);

      // Draw Fulcrum
      ctx.fillStyle = "#52525b";
      ctx.beginPath();
      ctx.moveTo(w / 2, h - 50);
      ctx.lineTo(w / 2 - 20, h);
      ctx.lineTo(w / 2 + 20, h);
      ctx.fill();

      // Draw Platform
      ctx.translate(w / 2, h - 50);
      ctx.rotate(angle);
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(-150, -10, 300, 20);
      ctx.rotate(-angle);
      ctx.translate(-w / 2, -(h - 50));

      if (!isGameOver) animId = requestAnimationFrame(update);
    };

    if (!isGameOver) animId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cancelAnimationFrame(animId);
    };
  }, [onGameOver]);

  return <canvas ref={canvasRef} width={800} height={400} className="w-full max-w-3xl aspect-[2/1] block bg-zinc-950 rounded-xl" />;
};
