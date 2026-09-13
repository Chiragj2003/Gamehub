/**
 * Canvas helpers shared by the arcade games.
 */

/**
 * Scale the canvas backing store to the device pixel ratio.
 *
 * A canvas with width=800 shown at 800 CSS px on a 2x display is upscaled by
 * the browser and looks soft. Sizing the backing store to 1600 and scaling the
 * context back down renders at native resolution — the single biggest visual
 * win on phones and retina laptops.
 *
 * Returns the logical (CSS-pixel) dimensions the game should draw against.
 */
export function setupCanvas(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number
): { ctx: CanvasRenderingContext2D; width: number; height: number } | null {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;

  const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap: 3x costs fill rate for no visible gain

  canvas.width = Math.round(logicalWidth * dpr);
  canvas.height = Math.round(logicalHeight * dpr);
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false; // crisp edges for pixel-style art

  return { ctx, width: logicalWidth, height: logicalHeight };
}

/** Linear interpolation for render-time smoothing between simulation ticks. */
export function lerp(previous: number, current: number, alpha: number): number {
  return previous + (current - previous) * alpha;
}

/** Draw the shared pause overlay so every game looks consistent when paused. */
export function drawPauseOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.save();
  ctx.fillStyle = "rgba(9, 9, 11, 0.82)";
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px system-ui, sans-serif";
  ctx.fillText("PAUSED", width / 2, height / 2 - 8);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "500 16px system-ui, sans-serif";
  ctx.fillText("Press P or Esc to resume", width / 2, height / 2 + 28);
  ctx.restore();
}

/** Red flash drawn on death, before the score is reported. */
export function drawGameOverFlash(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.save();
  ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Deterministic pseudo-random generator (mulberry32).
 *
 * Seeding the RNG makes a run reproducible, which is what daily challenges and
 * replay verification need: the same seed yields the same food placement or
 * piece sequence for every player.
 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
