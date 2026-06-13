"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { GamepadIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { GameEngine } from "@/game/core/GameEngine";
import ScoreSubmit from "./ScoreSubmit";
import AudioSettings from "@/components/AudioSettings";
import * as Phaser from "phaser";

// Import scenes
import SnakeScene from "@/game/scenes/SnakeScene";
import SpaceDefenderScene from "@/game/scenes/SpaceDefenderScene";
import MemoryMatrixScene from "@/game/scenes/MemoryMatrixScene";

interface GameConsoleProps {
  gameId: number;
  gameSlug: string;
}

export default function GameConsoleImpl({ gameId, gameSlug }: GameConsoleProps) {
  const router = useRouter();
  const gameContainerId = `phaser-game-container-${gameSlug}`;
  
  // Game states
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [hudMsg, setHudMsg] = useState("");
  const [showScoreModal, setShowScoreModal] = useState(false);

  // Telemetry session states
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionStartRef = useRef<number>(0);
  const playDurationRef = useRef<number>(0);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize and mount Phaser game instance
  useEffect(() => {
    let activeGame: Phaser.Game | null = null;

    // We do client-side rendering check
    const initPhaser = async () => {
      setLoading(true);
      try {
        // Map slug to scene definition
        let sceneToLoad: typeof Phaser.Scene | null = null;
        if (gameSlug === "neon-snake") {
          sceneToLoad = SnakeScene;
        } else if (gameSlug === "space-defender") {
          sceneToLoad = SpaceDefenderScene;
        } else if (gameSlug === "memory-matrix") {
          sceneToLoad = MemoryMatrixScene;
        }

        if (sceneToLoad) {
          // Mount the canvas engine
          activeGame = GameEngine.start(gameContainerId, sceneToLoad);

          // Bind Phaser Event Listeners to React States
          activeGame.events.on("score-changed", (newScore: number) => {
            setScore(newScore);
          });

          activeGame.events.on("lives-changed", (newLives: number) => {
            setLives(newLives);
          });

          activeGame.events.on("hud-message", (msg: string) => {
            setHudMsg(msg);
          });

          activeGame.events.on("game-paused", () => {
            setIsPaused(true);
          });

          activeGame.events.on("game-resumed", () => {
            setIsPaused(false);
          });

          activeGame.events.on("game-over", (finalScore: number) => {
            setScore(finalScore);
            triggerGameOver();
          });

          setLoading(false);

          // Start telemetry session
          startPlaySession();
        }
      } catch (err) {
        console.error("Could not mount Phaser game canvas:", err);
        setLoading(false);
      }
    };

    initPhaser();

    // Clean up Phaser engine on unmount
    return () => {
      GameEngine.destroy();
      stopPlaySession(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameSlug]);

  // Telemetry: Start Play Session
  const startPlaySession = async () => {
    sessionStartRef.current = Date.now();
    try {
      const res = await fetch("/api/games/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId })
      });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.sessionId);

        // Set up session duration heartbeat update (every 10 seconds)
        updateIntervalRef.current = setInterval(() => {
          if (data.sessionId && !isPaused && !showScoreModal) {
            const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
            playDurationRef.current = elapsed;
            updatePlaySession(data.sessionId, elapsed, false);
          }
        }, 10000);
      }
    } catch (e) {
      console.warn("Telemetry session could not start, continuing offline:", e);
    }
  };

  // Telemetry: Update session duration
  const updatePlaySession = async (sId: string, elapsed: number, completed: boolean) => {
    try {
      await fetch("/api/games/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sId,
          durationSeconds: elapsed,
          completed
        })
      });
    } catch {}
  };

  // Telemetry: Stop Play Session
  const stopPlaySession = (completed: boolean) => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000) || playDurationRef.current;
    if (sessionId) {
      updatePlaySession(sessionId, elapsed, completed);
    }
  };

  // Trigger game over, stop session
  const triggerGameOver = () => {
    stopPlaySession(true);
    setShowScoreModal(true);
  };

  // Pause menu triggers
  const handlePauseToggle = () => {
    if (isPaused) {
      GameEngine.resume();
      setIsPaused(false);
    } else {
      GameEngine.pause();
      setIsPaused(true);
    }
  };

  const handleRestart = () => {
    setIsPaused(false);
    setShowScoreModal(false);
    setScore(0);
    setLives(3);
    setHudMsg("");
    
    // Stop active session, destroy & restart Phaser instance
    stopPlaySession(false);
    
    // Reload scene
    let sceneToLoad: typeof Phaser.Scene | null = null;
    if (gameSlug === "neon-snake") {
      sceneToLoad = SnakeScene;
    } else if (gameSlug === "space-defender") {
      sceneToLoad = SpaceDefenderScene;
    } else if (gameSlug === "memory-matrix") {
      sceneToLoad = MemoryMatrixScene;
    }

    if (sceneToLoad) {
      GameEngine.start(gameContainerId, sceneToLoad);
      startPlaySession();
    }
  };

  const handleExit = () => {
    stopPlaySession(false);
    GameEngine.destroy();
    router.push("/");
  };

  const getAccentColor = () => {
    switch (gameSlug) {
      case "neon-snake":
        return "text-neon-green text-glow-green";
      case "space-defender":
        return "text-neon-cyan text-glow-cyan";
      case "memory-matrix":
        return "text-neon-violet text-glow-violet";
      default:
        return "text-amber-400";
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* HUD Bar (Outside Canvas for high accessibility) */}
      <GlassCard glowColor="none" className="h-16 px-6 border-white/5 bg-zinc-900/10! flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Score Counter */}
          <div className="text-left">
            <span className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Score</span>
            <span className={`text-lg font-black font-mono leading-none ${getAccentColor()}`}>
              {score.toLocaleString()}
            </span>
          </div>

          {/* Lives Indicator (Only for Space Defender) */}
          {gameSlug === "space-defender" && (
            <div className="text-left border-l border-white/5 pl-6">
              <span className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold font-sans">Shield Hull</span>
              <span className="text-lg font-black font-mono leading-none text-rose-500">
                {"❤".repeat(Math.max(0, lives))}
              </span>
            </div>
          )}

          {/* Dynamic Feed HUD notifications */}
          {hudMsg && (
            <div className="hidden sm:block border-l border-white/5 pl-6 text-xs text-zinc-400 font-bold animate-pulse-glow uppercase tracking-wider">
              {hudMsg}
            </div>
          )}
        </div>

        {/* Console Controls */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handlePauseToggle}
            variant="outline"
            size="sm"
            className="rounded-full border-white/10 text-xs font-bold uppercase tracking-wider px-4 h-9 cursor-pointer"
            disabled={loading || showScoreModal}
          >
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button
            onClick={handleRestart}
            variant="outline"
            size="sm"
            className="rounded-full border-white/10 text-xs font-bold uppercase tracking-wider px-4 h-9 cursor-pointer"
            disabled={loading}
          >
            Restart
          </Button>
        </div>
      </GlassCard>

      {/* Phaser Canvas Parent Wrapper */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/5 bg-zinc-950">
        
        {/* Attachment element for Phaser Canvas */}
        <div id={gameContainerId} className="absolute inset-0" />

        {/* 1. Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950 gap-4 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold uppercase tracking-wider text-white">Loading Engine Context</h4>
              <p className="text-[10px] text-zinc-500">Initializing procedural WebGL scene graph...</p>
            </div>
          </div>
        )}

        {/* 2. Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-20 flex flex-col md:flex-row items-center justify-center bg-zinc-950/90 backdrop-blur-sm gap-8 p-6 overflow-y-auto">
            {/* Left Column: Game controls */}
            <div className="flex flex-col items-center md:items-start gap-5 text-center md:text-left max-w-xs">
              <div className="space-y-2">
                <HugeiconsIcon icon={GamepadIcon} className={`h-10 w-10 mx-auto md:mx-0 animate-pulse ${getAccentColor()}`} />
                <h3 className="text-2xl font-black uppercase tracking-tight text-white">Session Paused</h3>
                <p className="text-xs text-zinc-400">
                  Active play telemetry is temporarily frozen. Controls and stats are preserved.
                </p>
              </div>
              <div className="flex flex-col gap-3 w-48">
                <Button
                  onClick={handlePauseToggle}
                  className="w-full h-9 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:bg-neon-cyan transition-all"
                >
                  Resume Run
                </Button>
                <Button
                  onClick={handleRestart}
                  variant="outline"
                  className="w-full h-9 rounded-full border-white/15 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/5"
                >
                  Restart
                </Button>
                <Button
                  onClick={handleExit}
                  variant="ghost"
                  className="w-full h-9 text-rose-400 hover:text-rose-300 font-bold text-xs uppercase tracking-wider"
                >
                  Quit Game
                </Button>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="hidden md:block w-px h-48 bg-white/10" />

            {/* Right Column: Audio settings */}
            <div className="w-full max-w-xs">
              <AudioSettings />
            </div>
          </div>
        )}
      </div>

      {/* Score Submit Modal */}
      {showScoreModal && (
        <ScoreSubmit
          gameId={gameId}
          gameSlug={gameSlug}
          score={score}
          sessionId={sessionId}
          onClose={() => {
            setShowScoreModal(false);
            handleRestart();
          }}
          onSubmitSuccess={() => {
            // scores reloaded via local-scores-updated event
          }}
        />
      )}
    </div>
  );
}
