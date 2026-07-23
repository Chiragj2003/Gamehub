"use client";
import React, { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon } from "@hugeicons/core-free-icons";
import { GameProps } from "./types";

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
      <div className="flex items-center justify-between w-full max-w-[min(90vw,90vh,400px)] mb-4 sm:mb-6 text-sm text-zinc-400 font-bold uppercase tracking-wider">
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
      <div className="grid grid-cols-4 gap-2 sm:gap-4 w-[min(90vw,60vh,400px)] h-[min(90vw,60vh,400px)]">
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
