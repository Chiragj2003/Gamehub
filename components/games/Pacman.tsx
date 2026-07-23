"use client";
import React, { useEffect, useRef } from "react";
import { GameProps } from "./types";

export const ClassicPacman: React.FC<GameProps> = ({ onGameOver }) => {
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

    // Simple Grid Map (15 cols, 11 rows)
    const cols = 15;
    const rows = 11;
    const ts = 40; // tile size
    const offsetX = (w - cols * ts) / 2;
    const offsetY = (h - rows * ts) / 2;

    const MAP = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,1,0,0,0,1,0,0,0,0,1],
      [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
      [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
      [1,1,0,1,1,1,0,1,0,1,1,1,0,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,0,1,1,1,0,1,0,1,1,1,0,1,1],
      [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
      [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
      [1,0,0,0,0,1,0,0,0,1,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ];

    // Initialize Dots
    interface Dot {
      r: number;
      c: number;
      active: boolean;
      power: boolean;
    }
    const dots: Dot[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (MAP[r][c] === 0) {
          // Power pellet corner locations
          const power = (r === 1 && c === 1) || (r === 9 && c === 1) || (r === 1 && c === 13) || (r === 9 && c === 13);
          dots.push({ r, c, active: true, power });
        }
      }
    }

    // Player
    let px = 7 * ts + ts/2;
    let py = 5 * ts + ts/2;
    let pDir = { x: 0, y: 0 };
    let pNextDir = { x: 0, y: 0 };
    const pSpeed = 2;
    const playerRadius = 14;

    // Ghosts
    interface Ghost {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      frightened: number; // timer
    }
    const ghosts: Ghost[] = [
      { x: 1 * ts + ts/2, y: 1 * ts + ts/2, vx: pSpeed, vy: 0, color: "#ef4444", frightened: 0 },
      { x: 13 * ts + ts/2, y: 1 * ts + ts/2, vx: -pSpeed, vy: 0, color: "#ec4899", frightened: 0 },
      { x: 1 * ts + ts/2, y: 9 * ts + ts/2, vx: pSpeed, vy: 0, color: "#06b6d4", frightened: 0 },
    ];

    let score = 0;
    let lives = 3;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "s", "a", "d"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      const key = e.key.toLowerCase();
      if (key === "arrowleft" || key === "a") pNextDir = { x: -pSpeed, y: 0 };
      if (key === "arrowright" || key === "d") pNextDir = { x: pSpeed, y: 0 };
      if (key === "arrowup" || key === "w") pNextDir = { x: 0, y: -pSpeed };
      if (key === "arrowdown" || key === "s") pNextDir = { x: 0, y: pSpeed };
    };

    window.addEventListener("keydown", handleKeyDown);

    const checkWall = (x: number, y: number) => {
      // Find grid tile center coords
      const r = Math.floor(y / ts);
      const c = Math.floor(x / ts);
      if (r < 0 || r >= rows || c < 0 || c >= cols) return true;
      return MAP[r][c] === 1;
    };

    const update = () => {
      // Check if we can change direction (align to grid centers)
      const curTileX = Math.floor(px / ts) * ts + ts / 2;
      const curTileY = Math.floor(py / ts) * ts + ts / 2;
      const isCenteredX = Math.abs(px - curTileX) < pSpeed;
      const isCenteredY = Math.abs(py - curTileY) < pSpeed;

      if (isCenteredX && isCenteredY) {
        // apply next direction if wall free
        if (pNextDir.x !== 0 || pNextDir.y !== 0) {
          if (!checkWall(curTileX + Math.sign(pNextDir.x) * ts, curTileY + Math.sign(pNextDir.y) * ts)) {
            pDir = pNextDir;
            px = curTileX; // snap
            py = curTileY;
          }
        }
      }

      // Move player if wall free
      if (!checkWall(px + Math.sign(pDir.x) * (ts / 2 + 1), py + Math.sign(pDir.y) * (ts / 2 + 1))) {
        px += pDir.x;
        py += pDir.y;
      }

      // Eat dots
      const pr = Math.floor(py / ts);
      const pc = Math.floor(px / ts);
      const activePellet = dots.find(d => d.r === pr && d.c === pc && d.active);
      if (activePellet) {
        activePellet.active = false;
        score += activePellet.power ? 100 : 10;
        
        if (activePellet.power) {
          // Trigger ghost scare
          ghosts.forEach(g => { g.frightened = 350; });
        }
      }

      // Update Ghosts
      ghosts.forEach(g => {
        if (g.frightened > 0) g.frightened--;

        // Move ghost
        const gxCenter = Math.floor(g.x / ts) * ts + ts / 2;
        const gyCenter = Math.floor(g.y / ts) * ts + ts / 2;
        
        if (Math.abs(g.x - gxCenter) < pSpeed && Math.abs(g.y - gyCenter) < pSpeed) {
          g.x = gxCenter; g.y = gyCenter; // snap
          
          // Random pathfinding when centered
          const dirs = [
            { x: pSpeed, y: 0 },
            { x: -pSpeed, y: 0 },
            { x: 0, y: pSpeed },
            { x: 0, y: -pSpeed },
          ];
          
          // remove backwards dir
          const backDir = { x: -g.vx, y: -g.vy };
          const validDirs = dirs.filter(d => {
            if (d.x === backDir.x && d.y === backDir.y) return false;
            return !checkWall(g.x + Math.sign(d.x) * ts, g.y + Math.sign(d.y) * ts);
          });

          const chosen = validDirs.length > 0 
            ? validDirs[Math.floor(Math.random() * validDirs.length)] 
            : backDir;
          g.vx = chosen.x;
          g.vy = chosen.y;
        }

        g.x += g.vx;
        g.y += g.vy;

        // Collision check Pacman <-> Ghost
        const dist = Math.hypot(px - g.x, py - g.y);
        if (dist < playerRadius + 10) {
          if (g.frightened > 0) {
            // Eat ghost
            score += 200;
            // Send back to spawn
            g.x = 7 * ts + ts/2;
            g.y = 5 * ts + ts/2;
            g.frightened = 0;
          } else {
            // Lose Life
            lives--;
            if (lives <= 0) {
              cancelAnimationFrame(animId);
              isGameOver = true; onGameOver(score);
              return;
            }
            // Reset position
            px = 7 * ts + ts/2;
            py = 5 * ts + ts/2;
            pDir = { x: 0, y: 0 };
            pNextDir = { x: 0, y: 0 };
          }
        }
      });

      // Win Condition
      if (dots.filter(d => d.active).length === 0) {
        cancelAnimationFrame(animId);
        isGameOver = true; onGameOver(score + 1500); // clear win bonus
        return;
      }

      // Render
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, w, h);

      // HUD
      ctx.font = "semibold 12px sans-serif";
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText(`SCORE: ${score}`, 25, 25);
      ctx.fillText(`LIVES: ${"❤".repeat(lives)}`, w - 100, 25);

      // Draw Map Walls (Neon Blue Blocks)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (MAP[r][c] === 1) {
            ctx.save();
            ctx.strokeStyle = "rgba(59,130,246,0.3)";
            ctx.lineWidth = 1;
            ctx.strokeRect(offsetX + c * ts, offsetY + r * ts, ts, ts);

            ctx.fillStyle = "rgba(37,99,235,0.08)";
            ctx.fillRect(offsetX + c * ts + 2, offsetY + r * ts + 2, ts - 4, ts - 4);
            ctx.restore();
          }
        }
      }

      // Draw Dots
      dots.forEach(d => {
        if (d.active) {
          ctx.save();
          if (d.power) {
            
            
            ctx.fillStyle = "#facc15";
            ctx.beginPath();
            ctx.arc(offsetX + d.c * ts + ts / 2, offsetY + d.r * ts + ts / 2, 7, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = "#facc15";
            ctx.fillRect(offsetX + d.c * ts + ts / 2 - 2, offsetY + d.r * ts + ts / 2 - 2, 4, 4);
          }
          ctx.restore();
        }
      });

      // Draw Ghosts
      ghosts.forEach(g => {
        ctx.save();
        const drawColor = g.frightened > 0 ? "#3b82f6" : g.color;
        ctx.shadowColor = drawColor;
        
        ctx.fillStyle = drawColor;

        const gx = offsetX + g.x;
        const gy = offsetY + g.y;

        ctx.beginPath();
        ctx.arc(gx, gy - 2, playerRadius, Math.PI, 0, false);
        // ghost skirt
        ctx.lineTo(gx + playerRadius, gy + playerRadius);
        ctx.lineTo(gx + playerRadius / 2, gy + playerRadius / 1.5);
        ctx.lineTo(gx, gy + playerRadius);
        ctx.lineTo(gx - playerRadius / 2, gy + playerRadius / 1.5);
        ctx.lineTo(gx - playerRadius, gy + playerRadius);
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(gx - 5, gy - 2, 3.5, 0, Math.PI * 2);
        ctx.arc(gx + 5, gy - 2, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(gx - 4.5, gy - 2, 1.5, 0, Math.PI * 2);
        ctx.arc(gx + 5.5, gy - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Draw Pacman (Yellow Chomp Circle)
      ctx.save();
      
      
      ctx.fillStyle = "#facc15";

      const pacX = offsetX + px;
      const pacY = offsetY + py;

      // animate mouth chomp
      const chompAngle = Math.abs(Math.sin(Date.now() * 0.012)) * 0.22;
      let startAngle = chompAngle;
      let endAngle = Math.PI * 2 - chompAngle;
      
      // align mouth direction
      const angleOffset = pDir.x > 0 ? 0 : pDir.x < 0 ? Math.PI : pDir.y > 0 ? Math.PI / 2 : pDir.y < 0 ? -Math.PI / 2 : 0;

      ctx.beginPath();
      ctx.moveTo(pacX, pacY);
      ctx.arc(pacX, pacY, playerRadius, startAngle + angleOffset, endAngle + angleOffset);
      ctx.lineTo(pacX, pacY);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      if (!isGameOver) animId = requestAnimationFrame(update);
    };

    if (!isGameOver) animId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(animId);
    };
  }, [onGameOver]);

  return <canvas ref={canvasRef} width={800} height={600} className="w-full h-full block bg-zinc-950" />;
};
