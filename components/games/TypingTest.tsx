"use client";

import React, { useState } from "react";
import { GameProps } from "./types";

export const ClassicTypingTest: React.FC<GameProps> = ({ onGameOver }) => {
  const quote = "The quick brown fox jumps over the lazy dog. A journey of a thousand miles begins with a single step. To be or not to be, that is the question.";
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDone) return;
    const val = e.target.value;
    if (!startTime && val.length > 0) {
      setStartTime(Date.now());
    }
    setInput(val);

    if (val === quote) {
      // Done
      setIsDone(true);
      const timeSec = (Date.now() - (startTime || Date.now())) / 1000;
      const words = quote.split(" ").length;
      const finalWpm = Math.round((words / timeSec) * 60);
      setWpm(finalWpm);
      setTimeout(() => onGameOver(finalWpm * 10), 3000); // Score = WPM * 10
    }
  };

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full">
        <div className="mb-8 flex justify-between items-end">
          <h2 className="text-2xl font-black text-white tracking-tight">Speed Test</h2>
          {isDone && <div className="text-neon-green font-mono text-2xl text-glow-green animate-pulse">{wpm} WPM</div>}
        </div>
        
        <div className="relative text-2xl leading-relaxed font-mono text-zinc-600 mb-8 select-none tracking-tight">
          {quote.split("").map((char, i) => {
            let color = "text-zinc-600";
            if (i < input.length) {
              color = input[i] === char ? "text-white" : "text-rose-500 bg-rose-500/20 rounded-sm";
            }
            return <span key={i} className={color}>{char}</span>;
          })}
        </div>

        <input
          type="text"
          value={input}
          onChange={handleChange}
          disabled={isDone}
          autoFocus
          className="w-full bg-zinc-900 border border-white/10 rounded-xl p-4 text-white font-mono text-lg focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all"
          placeholder="Start typing..."
        />
      </div>
    </div>
  );
};
