"use client";
import React, { useEffect, useRef } from "react";
import { GameProps } from "./types";

export const ClassicSpaceInvaders: React.FC<GameProps> = ({ onGameOver }) => {
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

    // Player
    const playerW = 50;
    const playerH = 18;
    let px = (w - playerW) / 2;
    const pSpeed = 5;

    // Bullets
    interface Bullet {
      x: number;
      y: number;
      vy: number;
    }
    let bullets: Bullet[] = [];

    // Aliens
    interface Alien {
      x: number;
      y: number;
      type: number; // 0, 1, 2 rows
    }
    let aliens: Alien[] = [];
    const alienRows = 4;
    const alienCols = 10;
    const alienW = 32;
    const alienH = 24;
    const paddingX = 18;
    const paddingY = 18;
    const startX = 60;
    const startY = 80;

    const setupAliens = () => {
      aliens = [];
      for (let r = 0; r < alienRows; r++) {
        for (let c = 0; c < alienCols; c++) {
          aliens.push({
            x: c * (alienW + paddingX) + startX,
            y: r * (alienH + paddingY) + startY,
            type: r,
          });
        }
      }
    };
    setupAliens();

    let alienDir = 1; // 1 = Right, -1 = Left
    let alienSpeed = 1.0;
    let lastAlienMove = 0;
    const alienMoveInterval = 800; // ticks down as they die

    let score = 0;
    let lives = 3;
    const keysPressed: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      keysPressed[e.key] = true;

      // Player Shoot (limited to 3 bullets max at once)
      if (e.key === " " && bullets.filter(b => b.vy < 0).length < 3) {
        bullets.push({
          x: px + playerW / 2,
          y: h - 45,
          vy: -6,
        });
      }
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

    const update = (time: number) => {
      // Player movement
      if (keysPressed["ArrowLeft"]) px = Math.max(20, px - pSpeed);
      if (keysPressed["ArrowRight"]) px = Math.min(w - playerW - 20, px + pSpeed);

      // Bullets update
      bullets.forEach(b => {
        b.y += b.vy;
      });
      bullets = bullets.filter(b => b.y > 0 && b.y < h);

      // Alien Movement (step intervals)
      const currentInterval = alienMoveInterval - (alienCols * alienRows - aliens.length) * 12;
      if (time - lastAlienMove > Math.max(100, currentInterval)) {
        lastAlienMove = time;
        
        let reachEdge = false;
        aliens.forEach(a => {
          a.x += alienDir * 16;
          if (a.x <= 20 || a.x + alienW >= w - 20) {
            reachEdge = true;
          }
        });

        if (reachEdge) {
          alienDir = -alienDir;
          aliens.forEach(a => {
            a.y += 24;
            // check landing game over
            if (a.y + alienH >= h - 60) {
              triggerGameOver(score);
            }
          });
        }
      }

      // Alien shooting bullets down
      if (Math.random() < 0.015 && aliens.length > 0) {
        const randomAlien = aliens[Math.floor(Math.random() * aliens.length)];
        bullets.push({
          x: randomAlien.x + alienW / 2,
          y: randomAlien.y + alienH,
          vy: 4,
        });
      }

      // Bullet Collisions
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        if (b.vy < 0) {
          // Player shooting Alien
          for (let ai = aliens.length - 1; ai >= 0; ai--) {
            const al = aliens[ai];
            if (b.x > al.x && b.x < al.x + alienW && b.y > al.y && b.y < al.y + alienH) {
              bullets.splice(bi, 1);
              aliens.splice(ai, 1);
              score += 50;
              break;
            }
          }
        } else {
          // Alien shooting Player
          if (b.x > px && b.x < px + playerW && b.y > h - 45 && b.y < h - 45 + playerH) {
            bullets.splice(bi, 1);
            lives--;
            if (lives <= 0) {
              triggerGameOver(score);
              return;
            }
          }
        }
      }

      // If aliens all cleared
      if (aliens.length === 0) {
        setupAliens();
        alienSpeed += 0.5;
        score += 1000; // clearing wave bonus
      }

      // Render
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, w, h);

      // HUD
      ctx.font = "semibold 12px sans-serif";
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText(`SCORE: ${score}`, 25, 25);
      ctx.fillText(`LIVES: ${"❤".repeat(lives)}`, w - 100, 25);

      // Draw Bullets
      bullets.forEach(b => {
        ctx.save();
        ctx.shadowColor = b.vy < 0 ? "#22d3ee" : "#ef4444";
        
        ctx.fillStyle = b.vy < 0 ? "#06b6d4" : "#ef4444";
        ctx.fillRect(b.x - 2, b.y, 4, 12);
        ctx.restore();
      });

      // Draw Aliens (Alien Neon Crab Vector Style)
      aliens.forEach(a => {
        ctx.save();
        
        
        ctx.strokeStyle = "#c084fc";
        ctx.fillStyle = "rgba(168,85,247,0.2)";
        ctx.lineWidth = 1.5;

        ctx.strokeRect(a.x, a.y, alienW, alienH);
        ctx.fillRect(a.x, a.y, alienW, alienH);
        
        // simple grid eye markings
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(a.x + 8, a.y + 6, 4, 4);
        ctx.fillRect(a.x + alienW - 12, a.y + 6, 4, 4);

        ctx.restore();
      });

      // Draw Player Cannon (Neon Green Tank)
      ctx.save();
      
      
      ctx.fillStyle = "#10b981";
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 2;

      ctx.fillRect(px, h - 45, playerW, playerH);
      ctx.strokeRect(px, h - 45, playerW, playerH);
      ctx.fillRect(px + playerW / 2 - 4, h - 55, 8, 10); // Barrel

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
