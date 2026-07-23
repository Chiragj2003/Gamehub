"use client";

import React, { useState } from "react";
import { GameProps } from "./types";

export const ClassicRockPaperScissors: React.FC<GameProps> = ({ onGameOver }) => {
  const choices = ["✊", "✋", "✌️"];
  const names = ["Rock", "Paper", "Scissors"];
  const [playerChoice, setPlayerChoice] = useState<number | null>(null);
  const [cpuChoice, setCpuChoice] = useState<number | null>(null);
  const [result, setResult] = useState<string>("");
  const [score, setScore] = useState(0);

  const play = (choice: number) => {
    if (result !== "") return;
    setPlayerChoice(choice);
    
    // Animate cpu choice briefly
    let ticks = 0;
    const interval = setInterval(() => {
      setCpuChoice(Math.floor(Math.random() * 3));
      ticks++;
      if (ticks > 10) {
        clearInterval(interval);
        const finalCpu = Math.floor(Math.random() * 3);
        setCpuChoice(finalCpu);
        
        // Determine winner
        if (choice === finalCpu) {
          setResult("DRAW");
          setTimeout(() => { resetRound() }, 1500);
        } else if (
          (choice === 0 && finalCpu === 2) ||
          (choice === 1 && finalCpu === 0) ||
          (choice === 2 && finalCpu === 1)
        ) {
          setResult("YOU WIN");
          setScore(s => s + 100);
          setTimeout(() => { resetRound() }, 1500);
        } else {
          setResult("CPU WINS");
          setTimeout(() => onGameOver(score), 2000);
        }
      }
    }, 50);
  };

  const resetRound = () => {
    setPlayerChoice(null);
    setCpuChoice(null);
    setResult("");
  };

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans">
      <div className="text-neon-pink font-mono text-xl mb-12 text-glow-pink">SCORE: {score}</div>
      
      <div className="flex w-full max-w-lg justify-between items-center mb-16">
        <div className="flex flex-col items-center gap-4">
          <div className="text-zinc-500 font-bold text-xs uppercase tracking-widest">You</div>
          <div className="w-32 h-32 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-center text-6xl shadow-2xl">
            {playerChoice !== null ? choices[playerChoice] : "?"}
          </div>
        </div>
        
        <div className="text-3xl font-black text-zinc-700 italic">VS</div>
        
        <div className="flex flex-col items-center gap-4">
          <div className="text-zinc-500 font-bold text-xs uppercase tracking-widest">CPU</div>
          <div className="w-32 h-32 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-center text-6xl shadow-2xl">
            {cpuChoice !== null ? choices[cpuChoice] : "?"}
          </div>
        </div>
      </div>

      <div className="h-8 mb-8 text-2xl font-black text-white tracking-widest">{result}</div>

      <div className="flex gap-4">
        {choices.map((c, i) => (
          <button
            key={i}
            onClick={() => play(i)}
            disabled={result !== ""}
            className="group relative flex flex-col items-center gap-2 p-4 bg-zinc-900 border border-white/10 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-4xl group-hover:scale-110 transition-transform">{c}</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{names[i]}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
