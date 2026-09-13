"use client";

import { useEffect, useRef } from "react";
import { setupCanvas } from "./canvas";

/**
 * Attach a canvas at a fixed logical resolution, with the backing store scaled
 * to the device pixel ratio and re-scaled when the ratio changes (moving the
 * window between a laptop screen and an external monitor).
 */
export function useGameCanvas(logicalWidth: number, logicalHeight: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const apply = () => {
      const setup = setupCanvas(canvas, logicalWidth, logicalHeight);
      ctxRef.current = setup?.ctx ?? null;
    };

    apply();

    // devicePixelRatio changes on zoom or when moving between displays.
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mq.addEventListener("change", apply);

    return () => {
      mq.removeEventListener("change", apply);
      ctxRef.current = null;
    };
  }, [logicalWidth, logicalHeight]);

  return { canvasRef, ctxRef };
}
