/**
 * The pen roster.
 *
 * Every number here is physical and feeds the simulation directly: mass and
 * length set the inertia, `mu` is the sliding friction against the desk,
 * `restitution` how hard a pen bounces off another, and `maxSpeed` the speed
 * a full-power flick launches it at. The 1–5 "stats" shown on the pick screen
 * are derived from these so the card can never disagree with the physics.
 *
 * Lengths are centimetres, masses are relative (1.0 ≈ a 6 g ballpoint).
 */

export type PenTypeId =
  | "ballpoint"
  | "gel"
  | "jotter"
  | "fountain"
  | "marker"
  | "pencil"
  | "highlighter";

/** Which mesh recipe the scene builds for the pen. */
export type PenShape = "ballpoint" | "gel" | "jotter" | "fountain" | "marker" | "pencil" | "highlighter";

export interface PenType {
  id: PenTypeId;
  name: string;
  tagline: string;
  shape: PenShape;
  /** Half of the pen's length, tip to cap. */
  halfLen: number;
  /** Barrel radius. */
  radius: number;
  mass: number;
  /** Sliding friction on the desk (higher stops sooner). */
  mu: number;
  /** Bounciness on impact, 0..1. */
  restitution: number;
  /** Launch speed at full power, cm/s. */
  maxSpeed: number;
  /** How fast spin dies out (per second). */
  spinDamp: number;
  /** Colours for the 3D build. */
  colors: {
    body: string;
    accent: string;
    tip: string;
  };
  /** Surface finish for the barrel. */
  finish: { metalness: number; roughness: number };
}

export const PEN_TYPES: PenType[] = [
  {
    id: "ballpoint",
    name: "Classic Ballpoint",
    tagline: "The school-desk original. Balanced in every way.",
    shape: "ballpoint",
    halfLen: 7.4,
    radius: 0.42,
    mass: 1.0,
    mu: 0.28,
    restitution: 0.35,
    maxSpeed: 240,
    spinDamp: 1.3,
    colors: { body: "#dbe7f5", accent: "#2563eb", tip: "#c7ccd6" },
    finish: { metalness: 0.05, roughness: 0.25 },
  },
  {
    id: "gel",
    name: "Gel Roller",
    tagline: "Rubber grip bites the desk. Stops on a dime.",
    shape: "gel",
    halfLen: 7.2,
    radius: 0.5,
    mass: 1.3,
    mu: 0.37,
    restitution: 0.3,
    maxSpeed: 225,
    spinDamp: 1.8,
    colors: { body: "#1e293b", accent: "#38bdf8", tip: "#94a3b8" },
    finish: { metalness: 0.1, roughness: 0.35 },
  },
  {
    id: "jotter",
    name: "Steel Jotter",
    tagline: "Heavy brushed steel. Slides far, shoves hard.",
    shape: "jotter",
    halfLen: 6.6,
    radius: 0.45,
    mass: 2.2,
    mu: 0.18,
    restitution: 0.5,
    maxSpeed: 195,
    spinDamp: 1.0,
    colors: { body: "#cbd5e1", accent: "#111827", tip: "#e5e7eb" },
    finish: { metalness: 0.9, roughness: 0.3 },
  },
  {
    id: "fountain",
    name: "Fountain Classic",
    tagline: "Thick resin barrel, brass nib. Hard to budge.",
    shape: "fountain",
    halfLen: 7.0,
    radius: 0.62,
    mass: 1.9,
    mu: 0.26,
    restitution: 0.28,
    maxSpeed: 205,
    spinDamp: 1.4,
    colors: { body: "#7f1d1d", accent: "#d4a017", tip: "#e8c547" },
    finish: { metalness: 0.2, roughness: 0.15 },
  },
  {
    id: "marker",
    name: "Permanent Marker",
    tagline: "Fat and grippy. A big target that refuses to move.",
    shape: "marker",
    halfLen: 6.8,
    radius: 0.8,
    mass: 1.25,
    mu: 0.42,
    restitution: 0.25,
    maxSpeed: 185,
    spinDamp: 2.0,
    colors: { body: "#18181b", accent: "#3f3f46", tip: "#0a0a0a" },
    finish: { metalness: 0.0, roughness: 0.5 },
  },
  {
    id: "pencil",
    name: "HB Pencil",
    tagline: "Featherweight wood. Flies fastest, gets bullied.",
    shape: "pencil",
    halfLen: 8.5,
    radius: 0.36,
    mass: 0.7,
    mu: 0.22,
    restitution: 0.4,
    maxSpeed: 270,
    spinDamp: 1.1,
    colors: { body: "#f5b300", accent: "#f9a8d4", tip: "#e2b07a" },
    finish: { metalness: 0.0, roughness: 0.6 },
  },
  {
    id: "highlighter",
    name: "Highlighter",
    tagline: "Chunky and light. Wide body, short reach.",
    shape: "highlighter",
    halfLen: 6.0,
    radius: 0.9,
    mass: 1.0,
    mu: 0.4,
    restitution: 0.2,
    maxSpeed: 180,
    spinDamp: 2.2,
    colors: { body: "#d9f99d", accent: "#65a30d", tip: "#bef264" },
    finish: { metalness: 0.0, roughness: 0.45 },
  },
];

export const PEN_BY_ID = new Map(PEN_TYPES.map((p) => [p.id, p]));

export function getPenType(id: PenTypeId): PenType {
  return PEN_BY_ID.get(id) ?? PEN_TYPES[0];
}

/** Map a physical value onto the 1–5 scale the pick screen shows. */
function scale(value: number, min: number, max: number): number {
  const t = (value - min) / (max - min);
  return Math.max(1, Math.min(5, Math.round(1 + t * 4)));
}

export interface PenStats {
  weight: number;
  speed: number;
  grip: number;
  bounce: number;
  reach: number;
}

export function penStats(p: PenType): PenStats {
  return {
    weight: scale(p.mass, 0.7, 2.2),
    speed: scale(p.maxSpeed, 180, 270),
    grip: scale(p.mu, 0.18, 0.42),
    bounce: scale(p.restitution, 0.2, 0.5),
    reach: scale(p.halfLen, 6, 8.5),
  };
}
