"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon, GamepadIcon, TimerIcon, FullScreenIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createPlaySession, type PlaySession } from "@/lib/session";
import GameRenderer from "./GameRenderer";
import GameErrorBoundary from "./GameErrorBoundary";
import ScoreSubmit from "./ScoreSubmit";

interface GameScreenProps {
  gameId: number;
  gameTitle: string;
  gameSlug: string;
}

export default function GameScreen({ gameId, gameTitle, gameSlug }: GameScreenProps) {
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [session, setSession] = useState<PlaySession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  /** Bumped to remount the game after a crash or a replay. */
  const [runKey, setRunKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  /**
   * Fullscreen is the only way a landscape game is playable on a phone. The
   * shell goes position:fixed over the whole viewport (works everywhere,
   * including iOS Safari, which has no element fullscreen), and where the
   * Fullscreen API exists it is also requested so the browser chrome hides.
   */
  const enterFullscreen = useCallback(() => {
    setFullscreen(true);
    const el = shellRef.current;
    if (el?.requestFullscreen) {
      el.requestFullscreen().then(
        () => {
          // Landscape lock only works inside real fullscreen and only on some
          // browsers; it is a nicety, never a requirement.
          const o = screen.orientation as ScreenOrientation & { lock?: (t: string) => Promise<void> };
          o.lock?.("landscape").catch(() => {});
        },
        () => {}
      );
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    setFullscreen(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  // Esc or the system back gesture leaves real fullscreen without telling us.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Lock page scroll and track orientation while the shell covers the viewport.
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const update = () => setPortrait(window.innerHeight > window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("resize", update);
    };
  }, [fullscreen]);

  const isTouchDevice = () =>
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  useEffect(() => {
    if (!playing || !session) return;
    const tick = () => setElapsed(Math.floor((Date.now() - session.startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [playing, session]);

  const start = async () => {
    setScore(null);
    setElapsed(0);
    setPlaying(true);
    setRunKey((k) => k + 1);
    // On a phone the embedded box is too small to play in; go straight to
    // fullscreen. This runs inside the tap handler, which is what the
    // Fullscreen API requires.
    if (isTouchDevice()) enterFullscreen();
    // The session is created in parallel with the game loading, so the play
    // button feels instant; the score modal waits on it if it is still pending.
    setSession(await createPlaySession(gameId));
  };

  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
  }, []);

  const stop = () => {
    exitFullscreen();
    setPlaying(false);
    setSession(null);
    setScore(null);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (!mounted) {
    return <Skeleton className="aspect-video w-full rounded-xl" />;
  }

  if (!playing) {
    return (
      <div className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-zinc-950 p-8 text-center">
        <div className="pointer-events-none absolute inset-0 bg-radial from-neon-violet/10 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-10" />

        <div className="relative z-10 max-w-sm space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/8 bg-zinc-900 text-neon-violet">
            <HugeiconsIcon icon={GamepadIcon} className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-white">{gameTitle}</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Loads instantly in the page. Press P or Esc to pause at any time.
            </p>
          </div>
          <Button
            onClick={start}
            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-200 hover:bg-neon-violet hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] active:scale-98"
          >
            <HugeiconsIcon icon={PlayIcon} className="h-5 w-5 fill-current" />
            Play Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={shellRef}
      className={
        fullscreen
          ? "fixed inset-0 z-[60] flex flex-col bg-black"
          : "relative flex w-full flex-col overflow-hidden rounded-xl border border-white/5 bg-zinc-950 aspect-[4/3] max-h-[78vh] md:aspect-video"
      }
    >
      <div className="relative z-20 flex h-10 shrink-0 items-center justify-between border-b border-white/5 bg-black/60 px-3 text-xs text-zinc-400 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          <span className="truncate font-semibold text-zinc-300">{gameTitle}</span>
          {fullscreen && portrait && (
            <span className="ml-2 hidden truncate text-[10px] text-amber-400/80 min-[340px]:inline">
              Rotate for a bigger view
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1">
            <HugeiconsIcon icon={TimerIcon} className="h-3.5 w-3.5 text-zinc-500" />
            <span className="tabular-nums">{formatTime(elapsed)}</span>
          </div>
          <button
            onClick={fullscreen ? exitFullscreen : enterFullscreen}
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/10 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <HugeiconsIcon icon={fullscreen ? Cancel01Icon : FullScreenIcon} className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={stop}
            className="cursor-pointer rounded-full border border-rose-500/20 bg-rose-500/5 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
          >
            End
          </button>
        </div>
      </div>

      {/* min-h-0 lets the flex item shrink so the canvas's max-height resolves;
          without it the canvas keeps its intrinsic size and overflows. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-zinc-950">
        <GameErrorBoundary key={runKey} onReset={() => setRunKey((k) => k + 1)}>
          <GameRenderer key={runKey} slug={gameSlug} onGameOver={handleGameOver} />
        </GameErrorBoundary>
      </div>

      {score !== null && (
        <ScoreSubmit
          gameId={gameId}
          gameSlug={gameSlug}
          gameTitle={gameTitle}
          score={score}
          sessionId={session?.sessionId ?? null}
          onClose={stop}
          onPlayAgain={start}
        />
      )}
    </div>
  );
}
