"use client";

import React, { useEffect, useRef } from "react";
import { GameProps } from "./types";

export const ClassicAsteroids: React.FC<GameProps> = ({ onGameOver }) => {
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

    // Ship
    let sx = w / 2;
    let sy = h / 2;
    let sAngle = -Math.PI / 2;
    let svx = 0;
    let svy = 0;
    const shipR = 12;

    // Asteroids
    interface Asteroid {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      sides: number;
      offsets: number[];
    }
    const asteroids: Asteroid[] = [];

    const makeAsteroid = (x: number, y: number, r: number) => {
      const sides = Math.floor(Math.random() * 5) + 8;
      const offsets = Array(sides).fill(0).map(() => Math.random() * 0.4 + 0.8);
      const angleMultiplier = (Math.random() - 0.5) * 2;
      return {
        x,
        y,
        vx: angleMultiplier * 1.5,
        vy: (Math.random() - 0.5) * 3,
        r,
        sides,
        offsets,
      };
    };

    // Initial asteroids
    for (let i = 0; i < 4; i++) {
      asteroids.push(makeAsteroid(Math.random() * w, Math.random() * h / 3, 40));
    }

    // Lasers
    interface Laser {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
    }
    let lasers: Laser[] = [];

    let score = 0;
    let lives = 3;
    const keysPressed: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      keysPressed[e.key] = true;

      if (e.key === " ") {
        // Shoot
        lasers.push({
          x: sx + Math.cos(sAngle) * shipR,
          y: sy + Math.sin(sAngle) * shipR,
          vx: Math.cos(sAngle) * 8,
          vy: Math.sin(sAngle) * 8,
          life: 60, // frames alive
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

    const update = () => {
      // Rotate ship
      if (keysPressed["ArrowLeft"]) sAngle -= 0.07;
      if (keysPressed["ArrowRight"]) sAngle += 0.07;

      // Thrust ship
      if (keysPressed["ArrowUp"]) {
        svx += Math.cos(sAngle) * 0.12;
        svy += Math.sin(sAngle) * 0.12;
      }
      // Apply friction
      svx *= 0.985;
      svy *= 0.985;

      sx += svx;
      sy += svy;

      // Wrap-around ship
      if (sx < 0) sx = w;
      if (sx > w) sx = 0;
      if (sy < 0) sy = h;
      if (sy > h) sy = 0;

      // Update Lasers
      lasers.forEach(l => {
        l.x += l.vx;
        l.y += l.vy;
        l.life--;

        // Wrap lasers
        if (l.x < 0) l.x = w;
        if (l.x > w) l.x = 0;
        if (l.y < 0) l.y = h;
        if (l.y > h) l.y = 0;
      });
      lasers = lasers.filter(l => l.life > 0);

      // Update Asteroids
      asteroids.forEach(a => {
        a.x += a.vx;
        a.y += a.vy;

        // Wrap asteroids
        if (a.x < -a.r) a.x = w + a.r;
        if (a.x > w + a.r) a.x = -a.r;
        if (a.y < -a.r) a.y = h + a.r;
        if (a.y > h + a.r) a.y = -a.r;
      });

      // Laser collision with Asteroids
      for (let li = lasers.length - 1; li >= 0; li--) {
        const l = lasers[li];
        for (let ai = asteroids.length - 1; ai >= 0; ai--) {
          const a = asteroids[ai];
          const dist = Math.hypot(l.x - a.x, l.y - a.y);
          if (dist < a.r) {
            // hit!
            lasers.splice(li, 1);
            score += Math.floor(1000 / a.r);

            // split if large enough
            if (a.r > 15) {
              asteroids.push(makeAsteroid(a.x, a.y, a.r / 2));
              asteroids.push(makeAsteroid(a.x, a.y, a.r / 2));
            }
            asteroids.splice(ai, 1);
            break;
          }
        }
      }

      // Ship collision with Asteroids
      for (let ai = asteroids.length - 1; ai >= 0; ai--) {
        const a = asteroids[ai];
        const dist = Math.hypot(sx - a.x, sy - a.y);
        if (dist < a.r + shipR) {
          lives--;
          if (lives <= 0) {
            triggerGameOver(score);
            return;
          }
          // Reset ship to middle
          sx = w / 2;
          sy = h / 2;
          svx = 0;
          svy = 0;
          sAngle = -Math.PI / 2;
          // Splat colliding asteroid
          asteroids.splice(ai, 1);
          break;
        }
      }

      // Spawn new asteroids if all destroyed
      if (asteroids.length === 0) {
        for (let i = 0; i < 5; i++) {
          asteroids.push(makeAsteroid(Math.random() * w, Math.random() * h / 3, 40));
        }
      }

      // Render
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, w, h);

      // Draw HUD
      ctx.font = "semibold 12px sans-serif";
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText(`SCORE: ${score}`, 25, 25);
      ctx.fillText(`SHIPS: ${"▲".repeat(lives)}`, w - 100, 25);

      // Draw Lasers (Neon Cyan Sparks)
      lasers.forEach(l => {
        ctx.save();
        
        
        ctx.fillStyle = "#22d3ee";
        ctx.beginPath();
        ctx.arc(l.x, l.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Asteroids (Neon Orange Polygons)
      asteroids.forEach(a => {
        ctx.save();
        
        
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < a.sides; i++) {
          const ang = (i / a.sides) * Math.PI * 2;
          const dist = a.r * a.offsets[i];
          const px = a.x + Math.cos(ang) * dist;
          const py = a.y + Math.sin(ang) * dist;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      });

      // Draw Ship (Neon Cyan Triangle)
      ctx.save();
      
      
      ctx.strokeStyle = "#22d3ee";
      ctx.fillStyle = "#0891b2";
      ctx.lineWidth = 2;

      ctx.translate(sx, sy);
      ctx.rotate(sAngle);
      ctx.beginPath();
      ctx.moveTo(shipR * 1.5, 0);
      ctx.lineTo(-shipR, -shipR * 0.8);
      ctx.lineTo(-shipR * 0.4, 0);
      ctx.lineTo(-shipR, shipR * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Thruster Flame
      if (keysPressed["ArrowUp"]) {
        ctx.strokeStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(-shipR * 0.5, 0);
        ctx.lineTo(-shipR * 1.8, -shipR * 0.4);
        ctx.lineTo(-shipR * 2.2, 0);
        ctx.lineTo(-shipR * 1.8, shipR * 0.4);
        ctx.closePath();
        ctx.stroke();
      }

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
