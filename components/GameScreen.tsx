"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon, GamepadIcon, TimerIcon, FullScreenIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { createPlaySession, type PlaySession } from "@/lib/session";
import GameRenderer, { gameAspect } from "./GameRenderer";
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
    return <Skeleton className="aspect-video w-full rounded-3xl" />;
  }

  if (!playing) {
    return (
      <div className="glass relative flex w-full flex-col items-center justify-center overflow-hidden rounded-3xl px-6 py-10 text-center sm:aspect-video sm:p-8">
        <div className="relative z-10 w-full max-w-sm space-y-5">
          <div className="glass mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-brand">
            <HugeiconsIcon icon={GamepadIcon} className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-[26px] font-black tracking-[-0.03em] text-ink">{gameTitle}</h3>
            <p className="mt-2 text-[14px] text-ink-2">Loads instantly. P or Esc pauses; tap to resume on touch.</p>
          </div>
          <button
            type="button"
            onClick={start}
            className="btn-glow flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-[15px] font-semibold"
          >
            <HugeiconsIcon icon={PlayIcon} className="h-5 w-5 fill-current" />
            Play now
          </button>
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
          : "relative flex w-full flex-col overflow-hidden rounded-3xl border border-line bg-[#0a0a0d] shadow-[var(--shadow-lift)] max-h-[78vh]"
      }
      // Take the running game's own shape rather than a fixed 4:3 / 16:9, so
      // the board fills the frame instead of sitting inside letterbox bars.
      style={fullscreen ? undefined : { aspectRatio: String(gameAspect(gameSlug)) }}
    >
      <div className="relative z-20 flex h-10 shrink-0 items-center justify-between border-b border-white/10 bg-black/60 px-3 text-xs text-zinc-400 backdrop-blur-md sm:px-4">
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
            className="pressable flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/10 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
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
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[#0a0a0d]">
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
