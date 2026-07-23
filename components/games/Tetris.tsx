"use client";

import React, { useEffect, useRef } from "react";
import { GameProps } from "./types";

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
