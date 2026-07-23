"use client";
import React, { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon } from "@hugeicons/core-free-icons";
import { GameProps } from "./types";

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
