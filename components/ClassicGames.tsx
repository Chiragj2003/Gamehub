"use client";

import React, { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon, GamepadIcon, RefreshIcon } from "@hugeicons/core-free-icons";

interface GameProps {
  onGameOver: (score: number) => void;
}

// ----------------------------------------------------
// 1. SNAKE GAME
// ----------------------------------------------------
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

// ----------------------------------------------------
// 2. PONG GAME
// ----------------------------------------------------
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

// ----------------------------------------------------
// 3. TETRIS GAME
// ----------------------------------------------------
export const ClassicTetris: React.FC<GameProps> = ({ onGameOver }) => {
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

    // Tetris Grid dimensions (10 columns, 20 rows)
    const cols = 10;
    const rows = 20;
    const block = 28; // block size in px
    const gridOffsetX = (w - cols * block) / 2;
    const gridOffsetY = (h - rows * block) / 2;

    const SHAPES = [
      [],
      [[1, 1, 1, 1]], // I
      [[1, 1, 1], [0, 1, 0]], // T
      [[1, 1, 1], [1, 0, 0]], // L
      [[1, 1, 1], [0, 0, 1]], // J
      [[1, 1], [1, 1]], // O
      [[1, 1, 0], [0, 1, 1]], // Z
      [[0, 1, 1], [1, 1, 0]], // S
    ];

    const COLORS = [
      "",
      "#06b6d4", // Cyan
      "#a855f7", // Violet
      "#f97316", // Orange
      "#3b82f6", // Blue
      "#eab308", // Yellow
      "#ef4444", // Red
      "#10b981", // Green
    ];

    let grid: number[][] = Array(rows).fill(0).map(() => Array(cols).fill(0));
    let score = 0;
    let linesClearedTotal = 0;

    // Piece state
    let curMatrix: number[][] = [];
    let curX = 0;
    let curY = 0;
    let curType = 0;

    const triggerGameOver = () => {
      isGameOver = true;
      cancelAnimationFrame(animId);
      ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
      ctx.fillRect(0, 0, w, h);
      setTimeout(() => onGameOver(score), 1500);
    };

    const spawnPiece = () => {
      curType = Math.floor(Math.random() * 7) + 1;
      curMatrix = SHAPES[curType];
      curX = Math.floor((cols - curMatrix[0].length) / 2);
      curY = 0;

      // Check collision on spawn
      if (checkCollision(curMatrix, curX, curY)) {
        triggerGameOver();
      }
    };

    const checkCollision = (matrix: number[][], offsetCol: number, offsetRow: number) => {
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c] !== 0) {
            const gridCol = offsetCol + c;
            const gridRow = offsetRow + r;
            if (
              gridCol < 0 ||
              gridCol >= cols ||
              gridRow >= rows
            ) {
              return true;
            }
            if (gridRow >= 0 && grid[gridRow][gridCol] !== 0) {
              return true;
            }
          }
        }
      }
      return false;
    };

    const mergePiece = () => {
      for (let r = 0; r < curMatrix.length; r++) {
        for (let c = 0; c < curMatrix[r].length; c++) {
          if (curMatrix[r][c] !== 0) {
            if (curY + r >= 0) {
              grid[curY + r][curX + c] = curType;
            }
          }
        }
      }
    };

    const rotatePiece = () => {
      const rotated: number[][] = Array(curMatrix[0].length).fill(0).map(() => Array(curMatrix.length).fill(0));
      for (let r = 0; r < curMatrix.length; r++) {
        for (let c = 0; c < curMatrix[r].length; c++) {
          rotated[c][curMatrix.length - 1 - r] = curMatrix[r][c];
        }
      }
      if (!checkCollision(rotated, curX, curY)) {
        curMatrix = rotated;
      }
    };

    const clearLines = () => {
      let linesClearedThisTurn = 0;
      for (let r = rows - 1; r >= 0; r--) {
        if (grid[r].every(val => val !== 0)) {
          grid.splice(r, 1);
          grid.unshift(Array(cols).fill(0));
          linesClearedThisTurn++;
          r++; // check same row index again since we shifted down
        }
      }
      if (linesClearedThisTurn > 0) {
        linesClearedTotal += linesClearedThisTurn;
        const pts = [0, 100, 300, 500, 800];
        score += pts[Math.min(linesClearedThisTurn, 4)];
      }
    };

    const drop = () => {
      curY++;
      if (checkCollision(curMatrix, curX, curY)) {
        curY--;
        mergePiece();
        clearLines();
        spawnPiece();
      }
    };

    let dropTimer = 0;
    let dropInterval = 800; // start interval 800ms
    let lastTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      
      const key = e.key;
      if (key === "ArrowLeft") {
        if (!checkCollision(curMatrix, curX - 1, curY)) curX--;
      } else if (key === "ArrowRight") {
        if (!checkCollision(curMatrix, curX + 1, curY)) curX++;
      } else if (key === "ArrowDown") {
        drop();
      } else if (key === "ArrowUp") {
        rotatePiece();
      } else if (key === " ") {
        // hard drop
        while (!checkCollision(curMatrix, curX, curY + 1)) {
          curY++;
        }
        mergePiece();
        clearLines();
        spawnPiece();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    spawnPiece();

    const update = (time: number) => {
      if (!isGameOver) animId = requestAnimationFrame(update);
      const dt = time - lastTime;
      lastTime = time;

      dropTimer += dt;
      // adjust dropInterval speed based on lines cleared
      const dynamicInterval = Math.max(150, dropInterval - Math.floor(linesClearedTotal / 4) * 80);
      if (dropTimer >= dynamicInterval) {
        dropTimer = 0;
        drop();
      }

      // Draw
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, w, h);

      // Draw HUD (Score)
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("SCORE", gridOffsetX + cols * block + 30, gridOffsetY + 40);
      ctx.font = "bold 24px monospace";
      ctx.fillText(score.toString(), gridOffsetX + cols * block + 30, gridOffsetY + 70);

      ctx.fillStyle = "#a855f7";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("CONTROLS:", gridOffsetX + cols * block + 30, gridOffsetY + 130);
      ctx.fillStyle = "#71717a";
      ctx.font = "11px monospace";
      ctx.fillText("←/→ : Move", gridOffsetX + cols * block + 30, gridOffsetY + 155);
      ctx.fillText("↑   : Rotate", gridOffsetX + cols * block + 30, gridOffsetY + 175);
      ctx.fillText("↓   : Soft Drop", gridOffsetX + cols * block + 30, gridOffsetY + 195);
      ctx.fillText("Space : Hard Drop", gridOffsetX + cols * block + 30, gridOffsetY + 215);

      // Draw Play Area Boundary
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 4;
      ctx.strokeRect(gridOffsetX - 2, gridOffsetY - 2, cols * block + 4, rows * block + 4);

      // Draw Grid Matrix Blocks
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const blockType = grid[r][c];
          if (blockType !== 0) {
            ctx.save();
            ctx.shadowColor = COLORS[blockType];
            
            ctx.fillStyle = COLORS[blockType];
            ctx.fillRect(gridOffsetX + c * block + 1, gridOffsetY + r * block + 1, block - 2, block - 2);
            ctx.restore();
          }
        }
      }

      // Calculate ghost piece Y
      let ghostY = curY;
      while (!checkCollision(curMatrix, curX, ghostY + 1)) {
        ghostY++;
      }

      // Draw ghost piece
      for (let r = 0; r < curMatrix.length; r++) {
        for (let c = 0; c < curMatrix[r].length; c++) {
          if (curMatrix[r][c] !== 0) {
            ctx.save();
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
            ctx.fillRect(
              gridOffsetX + (curX + c) * block + 1,
              gridOffsetY + (ghostY + r) * block + 1,
              block - 2,
              block - 2
            );
            ctx.strokeRect(
              gridOffsetX + (curX + c) * block + 1,
              gridOffsetY + (ghostY + r) * block + 1,
              block - 2,
              block - 2
            );
            ctx.restore();
          }
        }
      }

      // Draw current falling piece
      for (let r = 0; r < curMatrix.length; r++) {
        for (let c = 0; c < curMatrix[r].length; c++) {
          if (curMatrix[r][c] !== 0) {
            ctx.save();
            ctx.shadowColor = COLORS[curType];
            
            ctx.fillStyle = COLORS[curType];
            ctx.fillRect(
              gridOffsetX + (curX + c) * block + 1,
              gridOffsetY + (curY + r) * block + 1,
              block - 2,
              block - 2
            );
            ctx.restore();
          }
        }
      }
    };

    if (!isGameOver) animId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(animId);
    };
  }, [onGameOver]);

  return <canvas ref={canvasRef} width={800} height={600} className="w-full h-full block bg-zinc-950" />;
};

// ----------------------------------------------------
// 4. FLAPPY BIRD GAME
// ----------------------------------------------------
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

// ----------------------------------------------------
// 5. BREAKOUT GAME
// ----------------------------------------------------
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
    let bricks: Brick[][] = [];

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
    let keysPressed: Record<string, boolean> = {};

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

// ----------------------------------------------------
// 6. ASTEROIDS GAME
// ----------------------------------------------------
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
    let asteroids: Asteroid[] = [];

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
    let keysPressed: Record<string, boolean> = {};

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

// ----------------------------------------------------
// 7. SPACE INVADERS GAME
// ----------------------------------------------------
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
    let keysPressed: Record<string, boolean> = {};

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

// ----------------------------------------------------
// 8. PACMAN STYLE GAME
// ----------------------------------------------------
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

// ----------------------------------------------------
// 9. MEMORY MATCH GAME
// ----------------------------------------------------
export const ClassicMemoryMatch: React.FC<GameProps> = ({ onGameOver }) => {
  const [cards, setCards] = useState<{ id: number; symbol: string; flipped: boolean; matched: boolean }[]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);

  const cardSymbols = ["⚡", "⭐", "🔥", "🔮", "👽", "💊", "❤", "👑"];

  const initializeGame = () => {
    // Duplicate symbols to create pairs
    const doubleSymbols = [...cardSymbols, ...cardSymbols];
    // Shuffle
    const shuffled = doubleSymbols
      .map((sym, idx) => ({ id: idx, symbol: sym, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5);

    setCards(shuffled);
    setScore(0);
    setMoves(0);
    setSelected([]);
  };

  useEffect(() => {
    initializeGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCardClick = (idx: number) => {
    // limit flipped cards to 2 max at once
    if (selected.length >= 2 || cards[idx].flipped || cards[idx].matched) return;

    const newCards = [...cards];
    newCards[idx].flipped = true;
    setCards(newCards);

    const newSelected = [...selected, idx];
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setMoves(prev => prev + 1);
      const [first, second] = newSelected;
      if (cards[first].symbol === cards[second].symbol) {
        // match
        setTimeout(() => {
          newCards[first].matched = true;
          newCards[second].matched = true;
          setCards(newCards);
          setSelected([]);
          setScore(prev => prev + 100);

          // Check Win Condition
          if (newCards.every(c => c.matched)) {
            // Victory
            onGameOver(score + 1000 - moves * 20);
          }
        }, 600);
      } else {
        // mismatch flip back
        setTimeout(() => {
          newCards[first].flipped = false;
          newCards[second].flipped = false;
          setCards(newCards);
          setSelected([]);
        }, 1200);
      }
    }
  };

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-6 select-none font-sans">
      {/* HUD Panel */}
      <div className="flex items-center justify-between w-full max-w-md mb-6 text-sm text-zinc-400 font-bold uppercase tracking-wider">
        <div>Moves: <span className="font-mono text-white text-base">{moves}</span></div>
        <div>Score: <span className="font-mono text-neon-violet text-glow-violet text-base">{score}</span></div>
        <button
          onClick={initializeGame}
          className="h-8 w-8 flex items-center justify-center border border-white/5 bg-zinc-900/40 rounded-full hover:bg-white/5 transition-all text-white cursor-pointer"
        >
          <HugeiconsIcon icon={RefreshIcon} className="h-4 w-4" />
        </button>
      </div>

      {/* 4x4 Cards Grid */}
      <div className="grid grid-cols-4 gap-4 w-full max-w-md aspect-square">
        {cards.map((card, idx) => {
          const isFlipped = card.flipped || card.matched;
          const bgStyle = card.matched 
            ? "bg-neon-violet/10 border-neon-violet/30 text-neon-violet text-glow-violet shadow-[0_0_15px_rgba(139,92,246,0.15)]"
            : isFlipped
            ? "bg-zinc-900 border-white/15 text-white"
            : "bg-zinc-950 border-white/5 hover:border-white/20 hover:bg-zinc-900/30";

          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(idx)}
              className={`rounded-xl border flex items-center justify-center text-3xl transition-all duration-300 transform cursor-pointer active:scale-95 ${bgStyle}`}
            >
              {isFlipped ? card.symbol : "❓"}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 10. CONNECT FOUR GAME
// ----------------------------------------------------
export const ClassicConnectFour: React.FC<GameProps> = ({ onGameOver }) => {
  const [board, setBoard] = useState<number[][]>(Array(6).fill(0).map(() => Array(7).fill(0)));
  const [playerTurn, setPlayerTurn] = useState(1); // 1 = Red (player), 2 = Yellow (AI)
  const [score, setScore] = useState(0);

  const resetBoard = () => {
    setBoard(Array(6).fill(0).map(() => Array(7).fill(0)));
    setPlayerTurn(1);
    setScore(0);
  };

  const checkWin = (b: number[][], p: number) => {
    // horizontal
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        if (b[r][c] === p && b[r][c+1] === p && b[r][c+2] === p && b[r][c+3] === p) return true;
      }
    }
    // vertical
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 7; c++) {
        if (b[r][c] === p && b[r+1][c] === p && b[r+2][c] === p && b[r+3][c] === p) return true;
      }
    }
    // diagonal down-right
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        if (b[r][c] === p && b[r+1][c+1] === p && b[r+2][c+2] === p && b[r+3][c+3] === p) return true;
      }
    }
    // diagonal up-right
    for (let r = 3; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        if (b[r][c] === p && b[r-1][c+1] === p && b[r-2][c+2] === p && b[r-3][c+3] === p) return true;
      }
    }
    return false;
  };

  const handleColumnClick = (colIdx: number) => {
    if (playerTurn !== 1) return;

    // Find lowest empty slot
    let rowIdx = -1;
    for (let r = 5; r >= 0; r--) {
      if (board[r][colIdx] === 0) {
        rowIdx = r;
        break;
      }
    }

    if (rowIdx === -1) return; // Column full

    const newBoard = board.map(row => [...row]);
    newBoard[rowIdx][colIdx] = 1;
    setBoard(newBoard);

    if (checkWin(newBoard, 1)) {
      onGameOver(500); // victory
      return;
    }

    // Pass turn to AI
    setPlayerTurn(2);
  };

  useEffect(() => {
    if (playerTurn === 2) {
      // Simple AI drop
      setTimeout(() => {
        const validCols = [];
        for (let c = 0; c < 7; c++) {
          if (board[0][c] === 0) validCols.push(c);
        }

        if (validCols.length === 0) {
          // Draw
          onGameOver(100);
          return;
        }

        // Pick column that blocks player, wins, or random
        let pickedCol = validCols[Math.floor(Math.random() * validCols.length)];

        // Simple win/block check
        for (const c of validCols) {
          let row = -1;
          for (let r = 5; r >= 0; r--) {
            if (board[r][c] === 0) { row = r; break; }
          }
          // check if AI wins here
          const tempBoard = board.map(row => [...row]);
          tempBoard[row][c] = 2;
          if (checkWin(tempBoard, 2)) {
            pickedCol = c;
            break;
          }
          // check if Player would win here (block it)
          const tempBoard2 = board.map(row => [...row]);
          tempBoard2[row][c] = 1;
          if (checkWin(tempBoard2, 1)) {
            pickedCol = c;
          }
        }

        // drop AI piece
        let aiRow = -1;
        for (let r = 5; r >= 0; r--) {
          if (board[r][pickedCol] === 0) {
            aiRow = r;
            break;
          }
        }

        const newBoard = board.map(row => [...row]);
        newBoard[aiRow][pickedCol] = 2;
        setBoard(newBoard);

        if (checkWin(newBoard, 2)) {
          onGameOver(50); // Loss
          return;
        }

        setPlayerTurn(1);
      }, 700);
    }
  }, [playerTurn, board, onGameOver]);

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans">
      <div className="flex items-center justify-between w-full max-w-sm mb-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">
        <div>Turn: <span className={playerTurn === 1 ? "text-neon-green" : "text-amber-400"}>{playerTurn === 1 ? "PLAYER (RED)" : "AI (YELLOW)"}</span></div>
        <button
          onClick={resetBoard}
          className="h-7 w-7 flex items-center justify-center border border-white/5 bg-zinc-900/40 rounded-full hover:bg-white/5 transition-all text-white cursor-pointer"
        >
          <HugeiconsIcon icon={RefreshIcon} className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Board Layout */}
      <div className="bg-blue-950/20 border border-blue-900/40 p-4 rounded-2xl grid grid-cols-7 gap-3 w-full max-w-sm aspect-video h-auto">
        {board.map((row, rIdx) => 
          row.map((val, cIdx) => {
            const pieceBg = val === 1
              ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]"
              : val === 2
              ? "bg-amber-400 shadow-[0_0_12px_rgba(250,204,21,0.5)]"
              : "bg-zinc-950 border border-white/5";

            return (
              <div
                key={`${rIdx}-${cIdx}`}
                onClick={() => handleColumnClick(cIdx)}
                className={`rounded-full aspect-square w-full cursor-pointer hover:bg-white/3 active:scale-95 transition-all ${pieceBg}`}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 11. TIC TAC TOE GAME
// ----------------------------------------------------
export const ClassicTicTacToe: React.FC<GameProps> = ({ onGameOver }) => {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
  };

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6]            // diags
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const handleCellClick = (idx: number) => {
    if (board[idx] || checkWinner(board) || !isXNext) return;

    const newBoard = [...board];
    newBoard[idx] = "X";
    setBoard(newBoard);

    const winner = checkWinner(newBoard);
    if (winner) {
      onGameOver(300); // Win!
      return;
    }

    if (newBoard.every(sq => sq !== null)) {
      onGameOver(100); // Draw
      return;
    }

    setIsXNext(false);
  };

  useEffect(() => {
    if (!isXNext) {
      // Simple AI move (O)
      setTimeout(() => {
        const emptyCells = board
          .map((val, idx) => (val === null ? idx : null))
          .filter((val): val is number => val !== null);

        if (emptyCells.length === 0) return;

        // Check if AI can win or block
        let targetCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        
        for (const c of emptyCells) {
          const testBoard = [...board];
          testBoard[c] = "O";
          if (checkWinner(testBoard) === "O") {
            targetCell = c;
            break;
          }
        }
        // block player win
        for (const c of emptyCells) {
          const testBoard = [...board];
          testBoard[c] = "X";
          if (checkWinner(testBoard) === "X") {
            targetCell = c;
          }
        }

        const newBoard = [...board];
        newBoard[targetCell] = "O";
        setBoard(newBoard);

        const winner = checkWinner(newBoard);
        if (winner === "O") {
          onGameOver(50); // Loss
          return;
        }

        if (newBoard.every(sq => sq !== null)) {
          onGameOver(100); // Draw
          return;
        }

        setIsXNext(true);
      }, 500);
    }
  }, [isXNext, board, onGameOver]);

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans">
      <div className="flex items-center justify-between w-full max-w-xs mb-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">
        <div>Turn: <span className={isXNext ? "text-neon-cyan text-glow-cyan" : "text-neon-violet"}>{isXNext ? "PLAYER (X)" : "AI (O)"}</span></div>
        <button
          onClick={resetGame}
          className="h-7 w-7 flex items-center justify-center border border-white/5 bg-zinc-900/40 rounded-full hover:bg-white/5 transition-all text-white cursor-pointer"
        >
          <HugeiconsIcon icon={RefreshIcon} className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3.5 w-full max-w-xs aspect-square">
        {board.map((cell, idx) => {
          const cellColor = cell === "X"
            ? "text-neon-cyan text-glow-cyan border-neon-cyan/25 bg-neon-cyan/5"
            : cell === "O"
            ? "text-neon-violet text-glow-violet border-neon-violet/25 bg-neon-violet/5"
            : "border-white/5 bg-zinc-900/25 hover:bg-zinc-900/40 hover:border-white/10";

          return (
            <div
              key={idx}
              onClick={() => handleCellClick(idx)}
              className={`rounded-xl border flex items-center justify-center text-4xl font-black font-mono transition-all duration-200 transform cursor-pointer active:scale-95 ${cellColor}`}
            >
              {cell}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 12. 2048 GAME
// ----------------------------------------------------
export const Classic2048: React.FC<GameProps> = ({ onGameOver }) => {
  const [grid, setGrid] = useState<number[][]>(Array(4).fill(0).map(() => Array(4).fill(0)));
  const [score, setScore] = useState(0);

  const initGame = () => {
    let newGrid = Array(4).fill(0).map(() => Array(4).fill(0));
    newGrid = addRandomTile(newGrid);
    newGrid = addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
  };

  const addRandomTile = (g: number[][]) => {
    const emptyCells = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (g[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return g;
    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newG = g.map(row => [...row]);
    newG[r][c] = Math.random() < 0.9 ? 2 : 4;
    return newG;
  };

  useEffect(() => {
    initGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotateGrid = (g: number[][]) => {
    const rotated = Array(4).fill(0).map(() => Array(4).fill(0));
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        rotated[c][3 - r] = g[r][c];
      }
    }
    return rotated;
  };

  const slideLeft = (g: number[][]) => {
    let addedScore = 0;
    const shifted = g.map(row => {
      // Filter non-zero
      let filtered = row.filter(val => val !== 0);
      // Merge
      for (let i = 0; i < filtered.length - 1; i++) {
        if (filtered[i] === filtered[i + 1]) {
          filtered[i] *= 2;
          addedScore += filtered[i];
          filtered.splice(i + 1, 1);
        }
      }
      // Pad zeroes
      while (filtered.length < 4) {
        filtered.push(0);
      }
      return filtered;
    });
    return { shifted, addedScore };
  };

  const checkGameOver = (g: number[][]) => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (g[r][c] === 0) return false;
        if (r < 3 && g[r][c] === g[r + 1][c]) return false;
        if (c < 3 && g[r][c] === g[r][c + 1]) return false;
      }
    }
    return true;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "s", "a", "d"].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
    
    let key = e.key.toLowerCase();
    let rotated = grid.map(row => [...row]);
    let moves = 0;

    // We align moves to rotating and shifting left
    if (key === "arrowleft" || key === "a") {
      const res = slideLeft(rotated);
      rotated = res.shifted;
      setScore(prev => prev + res.addedScore);
      moves++;
    } else if (key === "arrowright" || key === "d") {
      // rotate 2 times, slide, rotate 2 times
      rotated = rotateGrid(rotateGrid(rotated));
      const res = slideLeft(rotated);
      rotated = res.shifted;
      rotated = rotateGrid(rotateGrid(rotated));
      setScore(prev => prev + res.addedScore);
      moves++;
    } else if (key === "arrowup" || key === "w") {
      // rotate clockwise 3 times (counter-clockwise 1 time), slide left, rotate 1 time
      rotated = rotateGrid(rotateGrid(rotateGrid(rotated)));
      const res = slideLeft(rotated);
      rotated = res.shifted;
      rotated = rotateGrid(rotated);
      setScore(prev => prev + res.addedScore);
      moves++;
    } else if (key === "arrowdown" || key === "s") {
      // rotate 1 time, slide left, rotate 3 times
      rotated = rotateGrid(rotated);
      const res = slideLeft(rotated);
      rotated = res.shifted;
      rotated = rotateGrid(rotateGrid(rotateGrid(rotated)));
      setScore(prev => prev + res.addedScore);
      moves++;
    }

    if (moves > 0) {
      // Only spawn tile if grid state actually changed
      const stateChanged = JSON.stringify(grid) !== JSON.stringify(rotated);
      if (stateChanged) {
        const nextGrid = addRandomTile(rotated);
        setGrid(nextGrid);
        if (checkGameOver(nextGrid)) {
          onGameOver(score);
        }
      }
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, score]);

  const getTileColors = (val: number) => {
    const colors: Record<number, string> = {
      2: "bg-zinc-800 text-zinc-300 border-white/5",
      4: "bg-zinc-700 text-zinc-200 border-white/10",
      8: "bg-neon-green/10 text-neon-green border-neon-green/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]",
      16: "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]",
      32: "bg-neon-violet/10 text-neon-violet border-neon-violet/20 shadow-[0_0_10px_rgba(139,92,246,0.1)]",
      64: "bg-pink-500/10 text-pink-400 border-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.1)]",
      128: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.15)]",
      256: "bg-amber-400/10 text-amber-300 border-amber-400/20 shadow-[0_0_12px_rgba(250,204,21,0.2)]",
      512: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.25)]",
      1024: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25 shadow-[0_0_18px_rgba(6,182,212,0.3)]",
      2048: "bg-primary/10 text-primary border-primary/30 shadow-[0_0_24px_rgba(139,92,246,0.45)]",
    };
    return colors[val] || "bg-zinc-950 text-white border-white/5";
  };

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans">
      <div className="flex items-center justify-between w-full max-w-xs mb-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">
        <div>Score: <span className="font-mono text-neon-cyan text-glow-cyan text-base">{score}</span></div>
        <button
          onClick={initGame}
          className="h-7 w-7 flex items-center justify-center border border-white/5 bg-zinc-900/40 rounded-full hover:bg-white/5 transition-all text-white cursor-pointer"
        >
          <HugeiconsIcon icon={RefreshIcon} className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="bg-zinc-900/40 border border-white/5 p-3.5 rounded-2xl grid grid-cols-4 gap-3 w-full max-w-xs aspect-square">
        {grid.map((row, r) =>
          row.map((val, c) => {
            const tileStyle = getTileColors(val);
            const valStr = val === 0 ? "" : val.toString();
            const textSz = val >= 1024 ? "text-lg" : val >= 128 ? "text-xl" : "text-2xl";

            return (
              <div
                key={`${r}-${c}`}
                className={`rounded-xl border flex items-center justify-center font-black ${textSz} transition-all duration-300 ${tileStyle}`}
              >
                {valStr}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
