/**
 * Pen Fight physics.
 *
 * Every pen is a rigid capsule sliding on the desk plane. The simulation is
 * two-dimensional (x across the desk, z toward the player) with a scalar spin
 * about the vertical axis; the third dimension only appears once a pen's
 * centre of mass passes the edge and it tips off into free fall.
 *
 * Collisions use sequential impulses with rotational terms, so an off-centre
 * hit sends the struck pen spinning exactly the way a real one does, and a
 * heavy pen shoves a light one instead of the other way round. Units are
 * centimetres and seconds; the desk is a real 90 × 60 cm school desk.
 */

import { getPenType, type PenType, type PenTypeId } from "./pens";

export const TABLE_W = 90;
export const TABLE_D = 60;
export const TABLE_HALF_W = TABLE_W / 2;
export const TABLE_HALF_D = TABLE_D / 2;

/** Gravity, cm/s². Sliding friction is mu × G. */
const G = 981;
/** Pen-on-pen friction; separate from desk friction. */
const CONTACT_MU = 0.32;
/** Sub-steps per simulation tick so thin fast pens cannot tunnel through each other. */
const SUBSTEPS = 4;
const SOLVER_ITERATIONS = 4;
/** Below these a pen is asleep; the desk's static friction has won. */
const SLEEP_SPEED = 1.5;
const SLEEP_SPIN = 0.04;
/** Hard cap so a chain of impacts can never launch a pen across the room. */
const MAX_SPEED = 420;
/** Free-fall gravity is slowed for readability — a real fall is over in a blink. */
const FALL_G = 700;
const FALL_REMOVE_Y = -80;

export type Side = 0 | 1;

export interface PenBody {
  id: number;
  side: Side;
  type: PenType;
  x: number;
  z: number;
  angle: number;
  /** Previous tick, for render interpolation. */
  px: number;
  pz: number;
  pangle: number;
  vx: number;
  vz: number;
  /** Spin, radians per second. */
  w: number;
  /** Still in play (on the desk or mid-fall). */
  alive: boolean;
  falling: boolean;
  /** Height below the desk once falling. */
  fallY: number;
  fallVy: number;
  /** Visual tumble while falling. */
  tumble: number;
  tumbleRate: number;
  invMass: number;
  invInertia: number;
}

export interface WorldEvents {
  /** A pen's centre crossed the edge; it is now falling. */
  onFall?: (body: PenBody) => void;
  /** Two pens collided with the given impulse at (x, z). */
  onHit?: (x: number, z: number, impulse: number, a: PenBody, b: PenBody) => void;
  /** A falling pen dropped out of view and is gone. */
  onRemove?: (body: PenBody) => void;
}

export function createPen(id: number, side: Side, typeId: PenTypeId, x: number, z: number, angle: number): PenBody {
  const type = getPenType(typeId);
  // Solid cylinder about a perpendicular axis through its centre.
  const inertia = type.mass * (type.radius * type.radius / 4 + (type.halfLen * type.halfLen) / 3);
  return {
    id,
    side,
    type,
    x,
    z,
    angle,
    px: x,
    pz: z,
    pangle: angle,
    vx: 0,
    vz: 0,
    w: 0,
    alive: true,
    falling: false,
    fallY: 0,
    fallVy: 0,
    tumble: 0,
    tumbleRate: 0,
    invMass: 1 / type.mass,
    invInertia: 1 / inertia,
  };
}

/** The two end points of the pen's axis. */
export function penEnds(b: PenBody) {
  const c = Math.cos(b.angle) * b.type.halfLen;
  const s = Math.sin(b.angle) * b.type.halfLen;
  return { ax: b.x - c, az: b.z - s, bx: b.x + c, bz: b.z + s };
}

/** Closest point on the pen's axis to (x, z), and the distance to the barrel surface. */
export function closestPointOnPen(b: PenBody, x: number, z: number) {
  const { ax, az, bx, bz } = penEnds(b);
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  let t = len2 > 0 ? ((x - ax) * dx + (z - az) * dz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + dx * t;
  const cz = az + dz * t;
  const dist = Math.hypot(x - cx, z - cz) - b.type.radius;
  return { x: cx, z: cz, dist };
}

/**
 * Apply an impulse at a world point. An impulse away from the centre of mass
 * adds spin — this is what makes flicking the end of a pen send it wheeling.
 */
export function applyImpulse(b: PenBody, jx: number, jz: number, atX: number, atZ: number) {
  b.vx += jx * b.invMass;
  b.vz += jz * b.invMass;
  const rx = atX - b.x;
  const rz = atZ - b.z;
  b.w += (rx * jz - rz * jx) * b.invInertia;
}

/** A flick: full power launches the pen at its type's `maxSpeed`. */
export function flick(b: PenBody, dirX: number, dirZ: number, power: number, atX: number, atZ: number) {
  const len = Math.hypot(dirX, dirZ) || 1;
  const j = b.type.mass * b.type.maxSpeed * Math.max(0, Math.min(1, power));
  applyImpulse(b, (dirX / len) * j, (dirZ / len) * j, atX, atZ);
}

/** Every pen on the desk is asleep and nothing is mid-fall. */
export function isSettled(bodies: PenBody[]): boolean {
  for (const b of bodies) {
    if (!b.alive) continue;
    if (b.falling) return false;
    if (b.vx !== 0 || b.vz !== 0 || b.w !== 0) return false;
  }
  return true;
}

/** Force everything to rest — used when a simulation runs long. */
export function freezeAll(bodies: PenBody[]) {
  for (const b of bodies) {
    if (b.falling) continue;
    b.vx = 0;
    b.vz = 0;
    b.w = 0;
  }
}

/**
 * Closest points between two segments (Ericson, Real-Time Collision
 * Detection §5.1.9), specialised to the desk plane.
 */
function closestSegSeg(
  p1x: number, p1z: number, q1x: number, q1z: number,
  p2x: number, p2z: number, q2x: number, q2z: number,
  out: { c1x: number; c1z: number; c2x: number; c2z: number }
) {
  const d1x = q1x - p1x, d1z = q1z - p1z;
  const d2x = q2x - p2x, d2z = q2z - p2z;
  const rx = p1x - p2x, rz = p1z - p2z;
  const a = d1x * d1x + d1z * d1z;
  const e = d2x * d2x + d2z * d2z;
  const f = d2x * rx + d2z * rz;
  let s: number;
  let t: number;
  const EPS = 1e-9;

  if (a <= EPS && e <= EPS) {
    s = 0;
    t = 0;
  } else if (a <= EPS) {
    s = 0;
    t = Math.max(0, Math.min(1, f / e));
  } else {
    const c = d1x * rx + d1z * rz;
    if (e <= EPS) {
      t = 0;
      s = Math.max(0, Math.min(1, -c / a));
    } else {
      const b = d1x * d2x + d1z * d2z;
      const denom = a * e - b * b;
      s = denom !== 0 ? Math.max(0, Math.min(1, (b * f - c * e) / denom)) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = Math.max(0, Math.min(1, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.max(0, Math.min(1, (b - c) / a));
      }
    }
  }
  out.c1x = p1x + d1x * s;
  out.c1z = p1z + d1z * s;
  out.c2x = p2x + d2x * t;
  out.c2z = p2z + d2z * t;
}

const cp = { c1x: 0, c1z: 0, c2x: 0, c2z: 0 };

function solveContacts(bodies: PenBody[], events: WorldEvents) {
  const n = bodies.length;
  for (let iter = 0; iter < SOLVER_ITERATIONS; iter++) {
    for (let i = 0; i < n; i++) {
      const A = bodies[i];
      if (!A.alive || A.falling) continue;
      for (let k = i + 1; k < n; k++) {
        const B = bodies[k];
        if (!B.alive || B.falling) continue;

        // Broad phase: bounding circles.
        const reach = A.type.halfLen + A.type.radius + B.type.halfLen + B.type.radius;
        const ddx = A.x - B.x;
        const ddz = A.z - B.z;
        if (ddx * ddx + ddz * ddz > reach * reach) continue;

        const ea = penEnds(A);
        const eb = penEnds(B);
        closestSegSeg(ea.ax, ea.az, ea.bx, ea.bz, eb.ax, eb.az, eb.bx, eb.bz, cp);
        let nx = cp.c1x - cp.c2x;
        let nz = cp.c1z - cp.c2z;
        const dist = Math.hypot(nx, nz);
        const minDist = A.type.radius + B.type.radius;
        if (dist >= minDist) continue;

        if (dist > 1e-6) {
          nx /= dist;
          nz /= dist;
        } else {
          // Axes cross exactly: push apart along the line between centres.
          const l = Math.hypot(ddx, ddz) || 1;
          nx = ddx / l;
          nz = ddz / l;
        }

        // Positional correction so resting pens never sink into each other.
        const penetration = minDist - dist;
        const totalInv = A.invMass + B.invMass;
        const corr = (Math.max(penetration - 0.01, 0) * 0.5) / totalInv;
        A.x += nx * corr * A.invMass;
        A.z += nz * corr * A.invMass;
        B.x -= nx * corr * B.invMass;
        B.z -= nz * corr * B.invMass;

        // Contact point: midway between the two barrel surfaces.
        const cx = (cp.c1x - nx * A.type.radius + cp.c2x + nx * B.type.radius) / 2;
        const cz = (cp.c1z - nz * A.type.radius + cp.c2z + nz * B.type.radius) / 2;
        const rax = cx - A.x, raz = cz - A.z;
        const rbx = cx - B.x, rbz = cz - B.z;

        // Velocity of each contact point: v + ω × r, with ω about the vertical.
        let vax = A.vx - A.w * raz, vaz = A.vz + A.w * rax;
        let vbx = B.vx - B.w * rbz, vbz = B.vz + B.w * rbx;
        let rvx = vax - vbx, rvz = vaz - vbz;
        const vn = rvx * nx + rvz * nz;
        if (vn > 0) continue; // already separating

        const ran = rax * nz - raz * nx;
        const rbn = rbx * nz - rbz * nx;
        const kn = totalInv + ran * ran * A.invInertia + rbn * rbn * B.invInertia;
        const e = Math.min(A.type.restitution, B.type.restitution);
        const j = (-(1 + e) * vn) / kn;

        A.vx += nx * j * A.invMass;
        A.vz += nz * j * A.invMass;
        A.w += ran * j * A.invInertia;
        B.vx -= nx * j * B.invMass;
        B.vz -= nz * j * B.invMass;
        B.w -= rbn * j * B.invInertia;

        // Friction along the tangent, clamped to the Coulomb cone.
        vax = A.vx - A.w * raz; vaz = A.vz + A.w * rax;
        vbx = B.vx - B.w * rbz; vbz = B.vz + B.w * rbx;
        rvx = vax - vbx; rvz = vaz - vbz;
        let tx = rvx - nx * (rvx * nx + rvz * nz);
        let tz = rvz - nz * (rvx * nx + rvz * nz);
        const tl = Math.hypot(tx, tz);
        if (tl > 1e-6) {
          tx /= tl;
          tz /= tl;
          const rat = rax * tz - raz * tx;
          const rbt = rbx * tz - rbz * tx;
          const kt = totalInv + rat * rat * A.invInertia + rbt * rbt * B.invInertia;
          let jt = -(rvx * tx + rvz * tz) / kt;
          const maxF = CONTACT_MU * j;
          jt = Math.max(-maxF, Math.min(maxF, jt));
          A.vx += tx * jt * A.invMass;
          A.vz += tz * jt * A.invMass;
          A.w += rat * jt * A.invInertia;
          B.vx -= tx * jt * B.invMass;
          B.vz -= tz * jt * B.invMass;
          B.w -= rbt * jt * B.invInertia;
        }

        if (iter === 0 && j > 8) events.onHit?.(cx, cz, j, A, B);
      }
    }
  }
}

/** Advance the world by one tick of `dt` seconds. */
export function stepWorld(bodies: PenBody[], dt: number, events: WorldEvents = {}) {
  for (const b of bodies) {
    b.px = b.x;
    b.pz = b.z;
    b.pangle = b.angle;
  }

  const h = dt / SUBSTEPS;
  for (let sub = 0; sub < SUBSTEPS; sub++) {
    for (const b of bodies) {
      if (!b.alive) continue;

      if (b.falling) {
        b.x += b.vx * h;
        b.z += b.vz * h;
        b.fallVy -= FALL_G * h;
        b.fallY += b.fallVy * h;
        b.tumble += b.tumbleRate * h;
        b.angle += b.w * h;
        if (b.fallY < FALL_REMOVE_Y) {
          b.alive = false;
          events.onRemove?.(b);
        }
        continue;
      }

      const speed = Math.hypot(b.vx, b.vz);
      if (speed > MAX_SPEED) {
        b.vx *= MAX_SPEED / speed;
        b.vz *= MAX_SPEED / speed;
      }

      b.x += b.vx * h;
      b.z += b.vz * h;
      b.angle += b.w * h;

      // Desk friction: a constant deceleration opposing motion, plus a little
      // viscous drag on the spin so a pen does not pirouette forever.
      const decel = b.type.mu * G * h;
      if (speed <= decel || speed < SLEEP_SPEED) {
        b.vx = 0;
        b.vz = 0;
      } else {
        const f = (speed - decel) / speed;
        b.vx *= f;
        b.vz *= f;
      }
      const spinDecel = ((0.75 * b.type.mu * G) / (b.type.halfLen * 2)) * h;
      const absW = Math.abs(b.w);
      if (absW <= spinDecel || absW < SLEEP_SPIN) {
        b.w = 0;
      } else {
        b.w -= Math.sign(b.w) * spinDecel;
        b.w *= Math.exp(-b.type.spinDamp * h);
      }
      // A pen that has stopped translating but is still barely turning is
      // asleep for all practical purposes; snap it so the turn can end.
      if (b.vx === 0 && b.vz === 0 && Math.abs(b.w) < 0.3) b.w = 0;
    }

    solveContacts(bodies, events);

    // Tip over the edge once the centre of mass is past it.
    for (const b of bodies) {
      if (!b.alive || b.falling) continue;
      if (Math.abs(b.x) > TABLE_HALF_W || Math.abs(b.z) > TABLE_HALF_D) {
        b.falling = true;
        b.fallY = 0;
        b.fallVy = 0;
        // Carry the sliding speed over the edge, with a minimum so a pen that
        // was nudged off still visibly tumbles instead of hovering.
        const sp = Math.hypot(b.vx, b.vz);
        if (sp < 20) {
          const ox = Math.abs(b.x) > TABLE_HALF_W ? Math.sign(b.x) : 0;
          const oz = Math.abs(b.z) > TABLE_HALF_D ? Math.sign(b.z) : 0;
          b.vx = ox * 25;
          b.vz = oz * 25;
        }
        b.tumbleRate = 4 + Math.min(6, sp / 40);
        events.onFall?.(b);
      }
    }
  }
}

/** Serialisable rest state, for the online snapshot after a settle. */
export interface PenSnapshot {
  id: number;
  x: number;
  z: number;
  angle: number;
  alive: boolean;
}

export function snapshot(bodies: PenBody[]): PenSnapshot[] {
  return bodies.map((b) => ({ id: b.id, x: b.x, z: b.z, angle: b.angle, alive: b.alive && !b.falling }));
}

export function applySnapshot(bodies: PenBody[], snap: PenSnapshot[]) {
  const byId = new Map(bodies.map((b) => [b.id, b]));
  for (const s of snap) {
    const b = byId.get(s.id);
    if (!b) continue;
    b.x = b.px = s.x;
    b.z = b.pz = s.z;
    b.angle = b.pangle = s.angle;
    b.vx = 0;
    b.vz = 0;
    b.w = 0;
    if (!s.alive && b.alive && !b.falling) {
      // The host saw this pen fall; we did not. Drop it now.
      b.falling = true;
      b.fallY = 0;
      b.fallVy = 0;
      b.tumbleRate = 5;
    } else if (s.alive && (!b.alive || b.falling)) {
      // We saw it fall; the host did not. The host is right.
      b.alive = true;
      b.falling = false;
      b.fallY = 0;
      b.fallVy = 0;
      b.tumble = 0;
    }
  }
}
