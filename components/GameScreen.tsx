"use client";

import React, { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon, GamepadIcon, TimerIcon } from "@hugeicons/core-free-icons";
import { startGameSession, endAndTrackSession } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface GameScreenProps {
  gameId: number;
  gameTitle: string;
  gameSlug: string;
}

export default function GameScreen({ gameId, gameTitle }: GameScreenProps) {
  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Session cleanup on unmount
    return () => {
      if (sessionId) {
        endAndTrackSession(sessionId, false).catch(err =>
          console.warn("Telemetry session cleanup failed:", err)
        );
      }
    };
  }, [sessionId]);

  // Keep track of active timer since start of game
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePlay = () => {
    const sId = startGameSession(gameId);
    setSessionId(sId);
    setIsPlaying(true);
  };

  const handleEndGame = async () => {
    if (sessionId) {
      await endAndTrackSession(sessionId, true, Math.floor(Math.random() * 500) + 100); // mock score
      setSessionId(null);
    }
    setIsPlaying(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (!mounted) {
    return <Skeleton className="aspect-video w-full rounded-xl" />;
  }

  if (!isPlaying) {
    return (
      <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/5 bg-zinc-950 flex flex-col items-center justify-center p-8 text-center">
        {/* Abstract Background Design */}
        <div className="absolute inset-0 bg-radial from-neon-violet/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

        <div className="relative z-10 max-w-sm space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-white/8 text-neon-violet text-glow-violet animate-pulse-glow">
            <HugeiconsIcon icon={GamepadIcon} className="h-8 w-8 text-neon-violet" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-white">
              Ready Player One
            </h3>
            <p className="text-sm text-zinc-400 mt-2">
              Launch {gameTitle} instantly in-browser. Control layout and gameplay parameters are loaded on startup.
            </p>
          </div>
          <Button
            onClick={handlePlay}
            className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold uppercase tracking-wide hover:bg-neon-violet shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] active:scale-98 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <HugeiconsIcon icon={PlayIcon} className="h-5 w-5 fill-current" />
            Play Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/5 bg-zinc-950 flex flex-col">
      {/* HUD Header */}
      <div className="h-10 border-b border-white/5 bg-black/60 px-4 flex items-center justify-between text-xs text-zinc-400 relative z-20">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-semibold text-zinc-300">Live Session: {gameTitle}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <HugeiconsIcon icon={TimerIcon} className="h-3.5 w-3.5 text-zinc-500" />
            <span>Time: {formatTime(timer)}</span>
          </div>
          <button
            onClick={handleEndGame}
            className="text-[10px] uppercase font-bold text-rose-400 hover:text-rose-300 transition-colors border border-rose-500/20 bg-rose-500/5 px-2 py-0.5 rounded-full hover:bg-rose-500/10 cursor-pointer"
          >
            End Game
          </button>
        </div>
      </div>

      {/* Frame placeholder */}
      <div className="flex-1 bg-zinc-950 flex flex-col items-center justify-center relative">
        {/* We use a sandboxed dummy page/iframe placeholder for now */}
        <iframe
          src="about:blank"
          title={`${gameTitle} Play Area`}
          className="w-full h-full border-0 absolute inset-0 z-10 bg-zinc-950"
        />
        {/* Loading Overlay behind iframe */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-violet border-t-transparent" />
          <p className="text-xs text-zinc-500">Initializing Phaser Engine Context...</p>
        </div>
      </div>
    </div>
  );
}
