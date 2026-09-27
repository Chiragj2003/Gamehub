/**
 * The wolf sprite sheet, shared by Dino and Flappy Bird.
 *
 * One hand-drawn sheet (public/games/wolf.webp, already alpha-cut so the
 * background is transparent) holds several animation cycles as silhouette
 * frames. The rects below were measured from the sheet by connected-component
 * detection on the opaque pixels, not eyeballed — each entry is the exact
 * bounding box of one frame.
 *
 * The wolf faces left in the source art; every draw call mirrors it to face
 * right, which is the direction both games run.
 */

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SHEET_SRC = "/games/wolf.webp";

/** Standing, teeth bared — used for the "not started yet" pose. */
export const WOLF_IDLE: Rect = { x: 11, y: 17, w: 145, h: 135 };

/** The bounding gait cycle: the run-cycle for both games' forward motion. */
export const WOLF_RUN: Rect[] = [
  { x: 19, y: 326, w: 144, h: 126 },
  { x: 186, y: 326, w: 144, h: 126 },
  { x: 352, y: 325, w: 144, h: 126 },
  { x: 519, y: 325, w: 144, h: 126 },
  { x: 687, y: 325, w: 144, h: 126 },
  { x: 855, y: 326, w: 144, h: 126 },
  { x: 1022, y: 326, w: 145, h: 126 },
];

/**
 * Curled into a near-round ball. Doubles as two poses: a tumbling jump/duck
 * shape (round and compact, natural to rotate mid-air) and — held on one
 * frame — a crouch, since a curled silhouette reads as "low" on the ground
 * too.
 */
export const WOLF_BALL: Rect[] = [
  { x: 38, y: 974, w: 87, h: 85 },
  { x: 208, y: 975, w: 82, h: 82 },
  { x: 374, y: 974, w: 84, h: 82 },
  { x: 540, y: 971, w: 86, h: 85 },
  { x: 709, y: 973, w: 82, h: 82 },
  { x: 876, y: 975, w: 84, h: 82 },
  { x: 1042, y: 974, w: 86, h: 86 },
];

/** Head thrown back, mouth wide — the upward flap pose for Flappy Bird. */
export const WOLF_HOWL: Rect[] = [
  { x: 11, y: 1397, w: 129, h: 124 },
  { x: 173, y: 1393, w: 145, h: 128 },
  { x: 340, y: 1391, w: 153, h: 130 },
  { x: 511, y: 1392, w: 155, h: 129 },
];

/**
 * The sheet loads once and is shared by every mount of every game that uses
 * it — a module-level singleton outlives a single component, so replaying a
 * game, or opening a second wolf game later, never re-fetches it.
 */
let sheet: HTMLImageElement | null = null;

export function getWolfSheet(): HTMLImageElement {
  if (!sheet) {
    sheet = new Image();
    sheet.src = SHEET_SRC;
  }
  return sheet;
}

/** True once the sheet has decoded enough to be drawn without throwing. */
export function wolfSheetReady(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0;
}

/**
 * Draw one frame, mirrored to face right, fit to `height` at the frame's own
 * aspect ratio (frames are not all quite the same shape) and centred at
 * (cx, cy).
 *
 * A single centred primitive covers every case here: a grounded pose passes
 * cy = footY - height / 2 so the feet sit on the ground line; an airborne
 * or floating pose passes its own centre directly. `rotate` turns the sprite
 * about that same centre, which is what makes the curled-ball jump tumble
 * convincingly instead of swinging like a pendulum.
 */
export function drawWolfFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frame: Rect,
  cx: number,
  cy: number,
  height: number,
  rotate = 0
) {
  const width = height * (frame.w / frame.h);
  ctx.save();
  ctx.translate(cx, cy);
  if (rotate) ctx.rotate(rotate);
  ctx.scale(-1, 1); // mirror: the source faces left, both games run right
  ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h, -width / 2, -height / 2, width, height);
  ctx.restore();
}
