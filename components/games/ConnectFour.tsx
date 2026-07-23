"use client";
import React, { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon } from "@hugeicons/core-free-icons";
import { GameProps } from "./types";

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
