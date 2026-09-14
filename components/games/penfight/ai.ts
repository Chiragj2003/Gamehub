/**
 * The CPU opponent.
 *
 * It looks at every shot from one of its pens to one of yours and scores it on
 * how well the impact would push your pen toward its nearest edge, how close
 * that edge already is, and whether one of its own pens is in the way. It then
 * aims at the best one with a little noise that shrinks every round, so
 * round one is beatable and round eight is not forgiving.
 */

import {
  closestPointOnPen,
  TABLE_HALF_D,
  TABLE_HALF_W,
  type PenBody,
  type Side,
} from "./physics";

export interface Flick {
  penId: number;
  dirX: number;
  dirZ: number;
  power: number;
  /** World point the flick is applied at. */
  atX: number;
  atZ: number;
}

/** Direction and distance from a point to the closest desk edge. */
function nearestEdge(x: number, z: number) {
  const candidates = [
    { dx: 1, dz: 0, d: TABLE_HALF_W - x },
    { dx: -1, dz: 0, d: TABLE_HALF_W + x },
    { dx: 0, dz: 1, d: TABLE_HALF_D - z },
    { dx: 0, dz: -1, d: TABLE_HALF_D + z },
  ];
  let best = candidates[0];
  for (const c of candidates) if (c.d < best.d) best = c;
  return best;
}

/** True when another pen sits on the straight line between shooter and target. */
function pathBlocked(shooter: PenBody, target: PenBody, bodies: PenBody[]) {
  const dx = target.x - shooter.x;
  const dz = target.z - shooter.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1) return false;
  const ux = dx / dist;
  const uz = dz / dist;
  const clearance = shooter.type.radius + 0.6;
  for (let d = shooter.type.halfLen + 1; d < dist - target.type.halfLen; d += 2) {
    const sx = shooter.x + ux * d;
    const sz = shooter.z + uz * d;
    for (const o of bodies) {
      if (o === shooter || o === target || !o.alive || o.falling) continue;
      if (closestPointOnPen(o, sx, sz).dist < clearance) return true;
    }
  }
  return false;
}

function gaussian(rng: () => number) {
  // Box–Muller; two uniforms in, one normal out.
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Choose the CPU's flick. `skill` is 0..1: aim noise, power judgement and
 * willingness to take a risky shot all improve with it.
 */
export function chooseFlick(bodies: PenBody[], side: Side, skill: number, rng: () => number): Flick | null {
  const mine = bodies.filter((b) => b.side === side && b.alive && !b.falling);
  const theirs = bodies.filter((b) => b.side !== side && b.alive && !b.falling);
  if (mine.length === 0 || theirs.length === 0) return null;

  let best: { score: number; shooter: PenBody; target: PenBody } | null = null;

  for (const shooter of mine) {
    for (const target of theirs) {
      const dx = target.x - shooter.x;
      const dz = target.z - shooter.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1) continue;
      const ux = dx / dist;
      const uz = dz / dist;

      const edge = nearestEdge(target.x, target.z);
      // How much of the impact goes toward the edge, and how near the edge is.
      const alignment = ux * edge.dx + uz * edge.dz;
      const edgeBonus = Math.max(0, 1 - edge.d / 25);
      // Light targets move further per hit; heavy shooters shove harder.
      const massEdge = shooter.type.mass / target.type.mass;

      let score = alignment * 1.2 + edgeBonus * 1.5 + Math.min(massEdge, 2) * 0.25 - dist * 0.01;
      if (pathBlocked(shooter, target, bodies)) score -= 2;
      // The shooter's own edge: a shot that carries it off the desk is only
      // worth it when the CPU is confident, and never on a weak alignment.
      const shooterEdge = nearestEdge(shooter.x, shooter.z);
      if (shooterEdge.d < 10 && ux * shooterEdge.dx + uz * shooterEdge.dz > 0.5) score -= 1.5 * (1 - skill);
      // A little randomness in shot selection keeps it from being scripted.
      score += (rng() - 0.5) * 0.4 * (1 - skill);

      if (!best || score > best.score) best = { score, shooter, target };
    }
  }
  if (!best) return null;

  const { shooter, target } = best;
  const dx = target.x - shooter.x;
  const dz = target.z - shooter.z;
  const dist = Math.hypot(dx, dz);

  // Aim: at the target's centre, nudged so the push lines up with the edge.
  const edge = nearestEdge(target.x, target.z);
  const aimX = target.x - edge.dx * target.type.radius * 1.5;
  const aimZ = target.z - edge.dz * target.type.radius * 1.5;
  let ang = Math.atan2(aimZ - shooter.z, aimX - shooter.x);
  const noise = 0.16 - 0.13 * skill;
  ang += gaussian(rng) * noise;

  // Power: enough to reach the target with speed to spare, judged from the
  // shooter's own desk friction, then scaled to a heavy target.
  const mu = shooter.type.mu * 981;
  const overshoot = 20 + 22 * (target.type.mass / shooter.type.mass) + 20 * skill;
  const needed = Math.sqrt(2 * mu * (dist + overshoot));
  let power = needed / shooter.type.maxSpeed;
  power *= 1 + gaussian(rng) * (0.14 - 0.1 * skill);
  power = Math.max(0.35, Math.min(1, power));

  // A slightly off-centre strike adds a natural wobble to the shot.
  const off = (rng() - 0.5) * shooter.type.halfLen * 0.4 * (1 - skill * 0.6);
  const atX = shooter.x + Math.cos(shooter.angle) * off;
  const atZ = shooter.z + Math.sin(shooter.angle) * off;

  return { penId: shooter.id, dirX: Math.cos(ang), dirZ: Math.sin(ang), power, atX, atZ };
}
