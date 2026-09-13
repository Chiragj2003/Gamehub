"use client";

import { useEffect, useRef } from "react";
import { useLatest } from "./useLatest";

/**
 * Fixed-timestep game loop.
 *
 * Every game previously advanced its state once per animation frame, which meant
 * a 144Hz monitor ran the simulation 2.4x faster than a 60Hz one. This loop
 * decouples simulation from rendering: `update` is called a whole number of
 * times per frame at exactly `step` milliseconds of simulated time, so a run
 * plays identically on every display.
 */

export interface GameLoopHandle {
  /** Simulated milliseconds since the run started (excludes paused time). */
  readonly elapsed: number;
  /** True while the loop is paused, either manually or by tab/window blur. */
  readonly paused: boolean;
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  stop: () => void;
}

export interface GameLoopOptions {
  /** Simulated milliseconds advanced per `update` call. Default 1000/60. */
  step?: number;
  /**
   * Largest real-time gap fed into the accumulator in one frame. Prevents the
   * "spiral of death" where a long stall (tab restore, GC pause, breakpoint)
   * queues hundreds of catch-up updates. Default 250ms.
   */
  maxFrameTime?: number;
  /** Pause automatically when the tab is hidden or the window loses focus. */
  pauseOnBlur?: boolean;
  /** Called once per simulation tick with the fixed step in seconds. */
  update: (deltaSeconds: number, handle: GameLoopHandle) => void;
  /**
   * Called once per animation frame.
   * `alpha` is 0..1 — how far between the previous and current simulation tick
   * this frame falls. Interpolating positions by `alpha` removes visible
   * stutter when the display refresh and the tick rate do not divide evenly.
   */
  render?: (alpha: number, handle: GameLoopHandle) => void;
  /** Called when pause state changes, for drawing overlays. */
  onPauseChange?: (paused: boolean) => void;
}

export function useGameLoop(options: GameLoopOptions, deps: unknown[] = []) {
  // Callbacks live in refs so changing them never restarts the loop.
  const updateRef = useLatest(options.update);
  const renderRef = useLatest(options.render);
  const pauseChangeRef = useLatest(options.onPauseChange);

  const handleRef = useRef<GameLoopHandle | null>(null);

  const step = options.step ?? 1000 / 60;
  const maxFrameTime = options.maxFrameTime ?? 250;
  const pauseOnBlur = options.pauseOnBlur ?? true;

  useEffect(() => {
    let frameId = 0;
    let previous = performance.now();
    let accumulator = 0;
    let elapsed = 0;
    let paused = false;
    let stopped = false;

    const setPaused = (next: boolean) => {
      if (paused === next || stopped) return;
      paused = next;
      // Discard the wall-clock time spent paused so resuming does not trigger
      // a burst of catch-up ticks.
      if (!paused) previous = performance.now();
      pauseChangeRef.current?.(paused);
    };

    const handle: GameLoopHandle = {
      get elapsed() {
        return elapsed;
      },
      get paused() {
        return paused;
      },
      pause: () => setPaused(true),
      resume: () => setPaused(false),
      togglePause: () => setPaused(!paused),
      stop: () => {
        stopped = true;
        cancelAnimationFrame(frameId);
      },
    };
    handleRef.current = handle;

    const stepSeconds = step / 1000;

    const frame = (now: number) => {
      frameId = requestAnimationFrame(frame);

      const frameTime = Math.min(now - previous, maxFrameTime);
      previous = now;

      if (!paused) {
        accumulator += frameTime;
        while (accumulator >= step) {
          updateRef.current(stepSeconds, handle);
          if (stopped) return;
          elapsed += step;
          accumulator -= step;
        }
      }

      renderRef.current?.(paused ? 1 : accumulator / step, handle);
    };

    frameId = requestAnimationFrame(frame);

    const onVisibility = () => {
      if (document.hidden) setPaused(true);
    };
    const onBlur = () => setPaused(true);

    if (pauseOnBlur) {
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("blur", onBlur);
    }

    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      if (pauseOnBlur) {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("blur", onBlur);
      }
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, maxFrameTime, pauseOnBlur, ...deps]);

  return handleRef;
}
