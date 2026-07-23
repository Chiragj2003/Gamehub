"use client";

import React, { useEffect, useRef } from "react";
import { GameProps } from "./types";

export const ClassicSnake: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let isGameOver = false;
    const grid = 20;
    const w = canvas.width;
    const h = canvas.height;
    
    let snake = [
      { x: 160, y: 200 },
      { x: 140, y: 200 },
      { x: 120, y: 200 },
    ];
    let dx = grid;
    let dy = 0;
    let food = { x: 300, y: 200 };
    let score = 0;
    let lastTime = 0;
    const speed = 100; // ms per update
    const inputQueue: {dx: number, dy: number}[] = [];

    const spawnFood = () => {
      food.x = Math.floor(Math.random() * (w / grid)) * grid;
      food.y = Math.floor(Math.random() * (h / grid)) * grid;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "w", "s", "a", "d"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      
      const key = e.key.toLowerCase();
      const lastInput = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : { dx, dy };

      if ((key === "arrowleft" || key === "a") && lastInput.dx === 0) {
        inputQueue.push({ dx: -grid, dy: 0 });
      } else if ((key === "arrowright" || key === "d") && lastInput.dx === 0) {
        inputQueue.push({ dx: grid, dy: 0 });
      } else if ((key === "arrowup" || key === "w") && lastInput.dy === 0) {
        inputQueue.push({ dx: 0, dy: -grid });
      } else if ((key === "arrowdown" || key === "s") && lastInput.dy === 0) {
        inputQueue.push({ dx: 0, dy: grid });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    const triggerGameOver = () => {
      isGameOver = true;
      cancelAnimationFrame(animId);
      ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
      ctx.fillRect(0, 0, w, h);
      setTimeout(() => onGameOver(score), 1500);
    };

    const update = (time: number) => {
      if (!isGameOver) animId = requestAnimationFrame(update);
      if (time - lastTime < speed) return;
      lastTime = time;

      if (inputQueue.length > 0) {
        const nextInput = inputQueue.shift()!;
        dx = nextInput.dx;
        dy = nextInput.dy;
      }

      // Move head
      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      // Wall collision
      if (head.x < 0 || head.x >= w || head.y < 0 || head.y >= h) {
        triggerGameOver();
        return;
      }

      // Self collision
      for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
          triggerGameOver();
          return;
        }
      }

      snake.unshift(head);

      // Eat food
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        spawnFood();
      } else {
        snake.pop();
      }

      // Draw
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, w, h);

      // Neon grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.02)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw food (Neon Red Capsule)
      ctx.save();
      
      
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(food.x + grid / 2, food.y + grid / 2, grid / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw snake (Neon Green capsules)
      snake.forEach((part, index) => {
        ctx.save();
        ctx.shadowColor = index === 0 ? "#10b981" : "#059669";
        
        ctx.fillStyle = index === 0 ? "#10b981" : "#047857";
        ctx.fillRect(part.x + 1, part.y + 1, grid - 2, grid - 2);
        ctx.restore();
      });
    };

    if (!isGameOver) animId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(animId);
    };
  }, [onGameOver]);

  return <canvas ref={canvasRef} width={800} height={600} className="w-full h-full block bg-zinc-950" />;
};
