"use client";

import React, { useState, useEffect } from "react";
import { GameProps } from "./types";

export const ClassicHangman: React.FC<GameProps> = ({ onGameOver }) => {
  const words = ["REACT", "TYPESCRIPT", "SUPABASE", "NEXTJS", "TAILWIND", "VERCEL", "JAVASCRIPT", "FRONTEND", "DEVELOPER", "GAMES"];
  const [word, setWord] = useState("");
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const maxMistakes = 6;
  
  useEffect(() => {
    setWord(words[Math.floor(Math.random() * words.length)]);
  }, []);

  const handleGuess = (letter: string) => {
    if (guessed.has(letter) || mistakes >= maxMistakes) return;
    const newGuessed = new Set(guessed).add(letter);
    setGuessed(newGuessed);
    
    if (!word.includes(letter)) {
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      if (newMistakes >= maxMistakes) {
        setTimeout(() => onGameOver(0), 1500); // 0 score for loss
      }
    } else {
      // Check win
      const isWin = word.split("").every(char => newGuessed.has(char));
      if (isWin) {
        setTimeout(() => onGameOver(word.length * 100), 1000);
      }
    }
  };

  const keyboard = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans">
      <div className="text-zinc-500 font-bold mb-4 text-xs tracking-widest uppercase">Mistakes: {mistakes} / {maxMistakes}</div>
      {/* Hangman drawing placeholder - purely visual text art for now */}
      <div className="font-mono text-white whitespace-pre mb-8 bg-zinc-900/50 p-6 rounded-2xl border border-white/5 shadow-xl">
        {`  +---+\n  |   |\n  ${mistakes > 0 ? "O" : " "}   |\n ${mistakes > 2 ? "/" : " "}${mistakes > 1 ? "|" : " "}${mistakes > 3 ? "\\" : " "}  |\n ${mistakes > 4 ? "/" : " "} ${mistakes > 5 ? "\\" : " "}  |\n      |\n=========`}
      </div>
      
      <div className="flex gap-3 mb-10">
        {word.split("").map((char, i) => (
          <div key={i} className="w-10 h-12 border-b-2 border-white/20 flex items-center justify-center text-2xl font-black text-white">
            {guessed.has(char) || mistakes >= maxMistakes ? char : ""}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 max-w-lg w-full">
        {keyboard.map(key => {
          const isGuessed = guessed.has(key);
          const isCorrect = isGuessed && word.includes(key);
          const isWrong = isGuessed && !word.includes(key);
          
          return (
            <button
              key={key}
              onClick={() => handleGuess(key)}
              disabled={isGuessed}
              className={`h-10 rounded-lg font-bold text-xs transition-all ${
                isCorrect ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" :
                isWrong ? "bg-rose-500/10 text-rose-500/50 border border-rose-500/20" :
                "bg-zinc-900 text-white border border-white/5 hover:bg-zinc-800"
              }`}
            >
              {key}
            </button>
          )
        })}
      </div>
    </div>
  );
};
