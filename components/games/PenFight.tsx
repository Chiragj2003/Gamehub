"use client";

import React, { useEffect, useRef, useState } from "react";
import { GameProps } from "./types";
import { useGameLoop, useGameInput, useLatest, createRng } from "@/lib/game-engine";
import { joinRoom, makeRoomCode, normalizeRoomCode, type Role, type Room } from "@/lib/realtime";
import { PEN_TYPES, getPenType, penStats, type PenType, type PenTypeId } from "./penfight/pens";
import {
  applySnapshot,
  closestPointOnPen,
  createPen,
  flick,
  freezeAll,
  isSettled,
  snapshot,
  stepWorld,
  type PenBody,
  type PenSnapshot,
  type Side,
} from "./penfight/physics";
import { chooseFlick, type Flick } from "./penfight/ai";
import { PenScene, SIDE_COLORS, type AimGizmo } from "./penfight/scene";

/**
 * Pen Fight — the school-desk game. Flick your pens into the other side's and
 * knock them off the edge. Physics and rendering live in ./penfight; this
 * file is the game: turns, modes, scoring, input and the overlays.
 */

/** Pull-back distance (cm on the desk) that reaches full power. */
const MAX_PULL = 28;
/** Below this a pointer press is a tap, not a flick. */
const PULL_DEADZONE = 1.5;
/** Keyboard aim: radians per second, power per second. */
const AIM_TURN_RATE = 2.4;
const POWER_RATE = 0.8;
/** A simulation that runs longer than this is frozen so a turn always ends. */
const SIM_TIMEOUT = 10;
const CPU_THINK = 1.0;
const ROUND_PAUSE = 2.2;

type Mode = "cpu" | "local" | "online";
type Phase = "menu" | "lobby" | "pens" | "play";
type Sub = "aim" | "cpu" | "sim" | "between" | "waiting" | "over";
type NetPhase = "idle" | "connecting" | "waiting" | "joined" | "ended";

interface SetupPen {
  id: number;
  side: Side;
  type: PenTypeId;
  x: number;
  z: number;
  angle: number;
}

/**
 * Online protocol. Both players run the same simulation; a flick is sent as
 * the impulse that caused it so the other side plays it out locally, and once
 * the host's desk has settled it sends a snapshot the guest snaps to. That
 * keeps the two desks identical without needing bit-identical physics.
 */
type NetMsg =
  | { t: "pen"; pen: PenTypeId }
  | { t: "setup"; pens: SetupPen[]; turn: Side }
  | { t: "flick"; side: Side; flick: Flick }
  | { t: "settle"; snap: PenSnapshot[]; turn: Side; points: [number, number]; winner: Side | null; round: number };

interface Drag {
  penId: number;
  pointerId: number;
  anchorX: number;
  anchorZ: number;
  curX: number;
  curZ: number;
}

interface Banner {
  text: string;
  sub?: string;
  until: number;
}

interface GameState {
  mode: Mode;
  phase: Phase;
  sub: Sub;
  bodies: PenBody[];
  turn: Side;
  /** The side this device controls online; 0 otherwise. */
  mySide: Side;
  round: number;
  points: [number, number];
  /** Pens knocked off so far in the current flick. */
  combo: number;
  flickSide: Side;
  selectedId: number | null;
  aimAngle: number;
  aimPower: number;
  /** Show the keyboard aim arrow only once the keys have been used. */
  keyboardAim: boolean;
  drag: Drag | null;
  simTime: number;
  timer: number;
  time: number;
  paused: boolean;
  over: boolean;
  winner: Side | null;
  reported: boolean;
  cameraSide: Side;
  penChoice: [PenTypeId, PenTypeId];
  rng: () => number;
  netQueue: NetMsg[];
  myPen: PenTypeId | null;
  peerPen: PenTypeId | null;
  banner: Banner | null;
  hudDirty: boolean;
}

interface Hud {
  mode: Mode;
  phase: Phase;
  sub: Sub;
  round: number;
  points: [number, number];
  alive: [number, number];
  turn: Side;
  mySide: Side;
  paused: boolean;
  over: boolean;
  winner: Side | null;
  banner: Banner | null;
  penNames: [string, string];
  peerPicked: boolean;
  myPicked: boolean;
}

function initialState(): GameState {
  return {
    mode: "cpu",
    phase: "menu",
    sub: "aim",
    bodies: [],
    turn: 0,
    mySide: 0,
    round: 1,
    points: [0, 0],
    combo: 0,
    flickSide: 0,
    selectedId: null,
    aimAngle: -Math.PI / 2,
    aimPower: 0.65,
    keyboardAim: false,
    drag: null,
    simTime: 0,
    timer: 0,
    time: 0,
    paused: false,
    over: false,
    winner: null,
    reported: false,
    cameraSide: 0,
    penChoice: ["ballpoint", "ballpoint"],
    rng: createRng(Date.now() & 0x7fffffff),
    netQueue: [],
    myPen: null,
    peerPen: null,
    banner: null,
    hudDirty: true,
  };
}

/** Lay one side's pens out in a row (or a 3 + 2 formation) near its edge. */
function layoutSide(side: Side, type: PenTypeId, count: number, rng: () => number, idStart: number): PenBody[] {
  const rows = count <= 4 ? [count] : [3, count - 3];
  const out: PenBody[] = [];
  let id = idStart;
  rows.forEach((n, r) => {
    const z = (side === 0 ? 1 : -1) * (19 - r * 10);
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 22 + (rng() - 0.5) * 2;
      const angle = (rng() - 0.5) * 0.3 + (side === 1 ? Math.PI : 0);
      out.push(createPen(id++, side, type, x, z + (rng() - 0.5) * 2, angle));
    }
  });
  return out;
}

function cpuPenCount(round: number) {
  return Math.min(5, 3 + Math.floor((round - 1) / 2));
}

function cpuSkill(round: number) {
  return Math.min(1, 0.22 + (round - 1) * 0.12);
}

function cpuPenFor(round: number, rng: () => number): PenTypeId {
  const heavy: PenTypeId[] = ["jotter", "fountain", "gel", "marker"];
  if (round >= 3 && rng() < 0.6) return heavy[Math.floor(rng() * heavy.length)];
  return PEN_TYPES[Math.floor(rng() * PEN_TYPES.length)].id;
}

function aliveCount(bodies: PenBody[], side: Side) {
  let n = 0;
  for (const b of bodies) if (b.side === side && b.alive && !b.falling) n++;
  return n;
}

function firstAlive(bodies: PenBody[], side: Side): PenBody | undefined {
  return bodies.find((b) => b.side === side && b.alive && !b.falling);
}

function toSetup(bodies: PenBody[]): SetupPen[] {
  return bodies.map((b) => ({ id: b.id, side: b.side, type: b.type.id, x: b.x, z: b.z, angle: b.angle }));
}

function fromSetup(pens: SetupPen[]): PenBody[] {
  return pens.map((p) => createPen(p.id, p.side, p.type, p.x, p.z, p.angle));
}

export const ClassicPenFight: React.FC<GameProps> = ({ onGameOver }) => {
  const onGameOverRef = useLatest(onGameOver);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<PenScene | null>(null);
  const powerRef = useRef<HTMLDivElement>(null);
  const G = useRef(initialState());
  const lastFrame = useRef(0);

  const [hud, setHud] = useState<Hud | null>(null);
  const [pickFor, setPickFor] = useState<Side>(0);
  const [coarse, setCoarse] = useState(false);

  const [netPhase, setNetPhase] = useState<NetPhase>("idle");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [netError, setNetError] = useState<string | null>(null);
  const roomRef = useRef<Room<NetMsg, NetMsg> | null>(null);
  const roleRef = useRef<Role>("host");
  const netPhaseRef = useLatest(netPhase);

  // ---- Helpers that touch both the state and the scene -----------------

  const pushHud = () => {
    const s = G.current;
    setHud({
      mode: s.mode,
      phase: s.phase,
      sub: s.sub,
      round: s.round,
      points: [s.points[0], s.points[1]],
      alive: [aliveCount(s.bodies, 0), aliveCount(s.bodies, 1)],
      turn: s.turn,
      mySide: s.mySide,
      paused: s.paused,
      over: s.over,
      winner: s.winner,
      banner: s.banner,
      penNames: [getPenType(s.penChoice[0]).name, getPenType(s.penChoice[1]).name],
      peerPicked: s.peerPen !== null,
      myPicked: s.myPen !== null,
    });
  };

  // ---- Scene lifecycle -------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    setCoarse(isCoarse);
    const low = isCoarse || (window.devicePixelRatio || 1) > 2;
    const scene = new PenScene(canvas, low);
    sceneRef.current = scene;
    const fit = () => scene.resize(container.clientWidth, container.clientHeight);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    pushHud();
    return () => {
      ro.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => () => roomRef.current?.leave(), []);

  const showBanner = (text: string, sub?: string, seconds = 1.8) => {
    const s = G.current;
    s.banner = { text, sub, until: s.time + seconds };
    s.hudDirty = true;
  };

  const setPhase = (phase: Phase) => {
    G.current.phase = phase;
    G.current.hudDirty = true;
  };

  const sideLabel = (side: Side) => {
    const s = G.current;
    if (s.mode === "cpu") return side === 0 ? "You" : "CPU";
    if (s.mode === "local") return side === 0 ? "Player 1" : "Player 2";
    return side === s.mySide ? "You" : "Opponent";
  };

  const isHumanTurn = () => {
    const s = G.current;
    if (s.mode === "cpu") return s.turn === 0;
    if (s.mode === "online") return s.turn === s.mySide;
    return true;
  };

  const send = (msg: NetMsg) => {
    const room = roomRef.current;
    if (!room) return;
    if (roleRef.current === "host") room.sendState(msg);
    else room.sendInput(msg);
  };

  const beginTurn = () => {
    const s = G.current;
    const first = firstAlive(s.bodies, s.turn);
    s.selectedId = first ? first.id : null;
    s.aimAngle = s.turn === 0 ? -Math.PI / 2 : Math.PI / 2;
    s.aimPower = 0.65;
    s.drag = null;
    s.timer = CPU_THINK;
    if (s.mode === "cpu" && s.turn === 1) s.sub = "cpu";
    else if (s.mode === "online" && s.turn !== s.mySide) s.sub = "waiting";
    else s.sub = "aim";
    s.cameraSide = s.mode === "local" ? s.turn : s.mySide;
    s.hudDirty = true;
  };

  const startRound = (round: number, setup?: SetupPen[]) => {
    const s = G.current;
    s.round = round;
    if (setup) {
      s.bodies = fromSetup(setup);
    } else {
      if (s.mode === "cpu") s.penChoice[1] = cpuPenFor(round, s.rng);
      const mine = s.mode === "cpu" ? 3 : 4;
      const theirs = s.mode === "cpu" ? cpuPenCount(round) : 4;
      s.bodies = [
        ...layoutSide(0, s.penChoice[0], mine, s.rng, 1),
        ...layoutSide(1, s.penChoice[1], theirs, s.rng, 100),
      ];
    }
    sceneRef.current?.setPens(s.bodies);
    // The player opens odd rounds, the CPU even ones; the host opens online.
    s.turn = s.mode === "cpu" ? ((round % 2 === 1 ? 0 : 1) as Side) : 0;
    s.combo = 0;
    beginTurn();
    if (s.mode === "cpu") showBanner(`Round ${round}`, `${sideLabel(s.turn)} to flick`);
    else showBanner("Fight!", `${sideLabel(s.turn)} to flick`);
  };

  const gameOver = (winner: Side) => {
    const s = G.current;
    s.over = true;
    s.winner = winner;
    s.sub = "over";
    s.drag = null;
    s.banner = null;
    s.hudDirty = true;
  };

  const resolveOutcome = () => {
    const s = G.current;
    const a0 = aliveCount(s.bodies, 0);
    const a1 = aliveCount(s.bodies, 1);
    let winner: Side | null = null;
    if (a0 === 0 && a1 === 0) winner = (1 - s.flickSide) as Side; // wiped both: the flicker loses
    else if (a1 === 0) winner = 0;
    else if (a0 === 0) winner = 1;

    if (winner === null) {
      s.turn = (1 - s.turn) as Side;
      beginTurn();
    } else if (s.mode === "cpu" && winner === 0) {
      const bonus = 250 * s.round + 100 * a0;
      s.points[0] += bonus;
      s.sub = "between";
      s.timer = ROUND_PAUSE;
      s.selectedId = null;
      showBanner("Round clear!", `+${bonus} bonus`, ROUND_PAUSE);
    } else {
      gameOver(winner);
    }

    if (s.mode === "online" && roleRef.current === "host") {
      send({ t: "settle", snap: snapshot(s.bodies), turn: s.turn, points: [s.points[0], s.points[1]], winner, round: s.round });
    }
  };

  const finishFlick = () => {
    const s = G.current;
    freezeAll(s.bodies);
    if (s.mode === "online" && roleRef.current === "guest") {
      // The host's settle snapshot decides what happened; hold here for it.
      s.sub = "waiting";
      s.hudDirty = true;
      return;
    }
    resolveOutcome();
  };

  const doFlick = (f: Flick, side: Side, fromNet = false) => {
    const s = G.current;
    const body = s.bodies.find((b) => b.id === f.penId);
    if (!body || !body.alive || body.falling) return;
    flick(body, f.dirX, f.dirZ, f.power, f.atX, f.atZ);
    s.sub = "sim";
    s.simTime = 0;
    s.combo = 0;
    s.flickSide = side;
    s.selectedId = null;
    s.drag = null;
    s.hudDirty = true;
    if (s.mode === "online" && !fromNet) send({ t: "flick", side, flick: f });
  };

  const worldEvents = {
    onFall: (b: PenBody) => {
      const s = G.current;
      const scene = sceneRef.current;
      scene?.spawnDust(b.x, b.z);
      scene?.addShake(0.5);
      if (b.side !== s.flickSide) {
        s.combo++;
        const pts = 100 + 50 * (s.combo - 1);
        s.points[s.flickSide] += pts;
        showBanner(s.combo > 1 ? `Combo ×${s.combo}!` : "Knocked off!", `+${pts}`, 1.3);
      } else {
        showBanner("Own pen lost", undefined, 1.1);
      }
      s.hudDirty = true;
    },
    onHit: (x: number, z: number, j: number, a: PenBody) => {
      const scene = sceneRef.current;
      if (!scene || j < 45) return;
      scene.spawnSparks(x, z, j, SIDE_COLORS[a.side]);
      scene.addShake(Math.min(0.9, j / 400));
    },
  };

  /** Everything the network delivered since the last tick, applied in order. */
  const drainNet = () => {
    const s = G.current;
    while (s.netQueue.length) {
      const m = s.netQueue.shift()!;
      switch (m.t) {
        case "pen":
          s.peerPen = m.pen;
          s.hudDirty = true;
          if (roleRef.current === "host" && s.myPen) startOnlineMatch();
          break;
        case "setup":
          if (roleRef.current !== "guest") break;
          s.penChoice = [m.pens.find((p) => p.side === 0)?.type ?? "ballpoint", m.pens.find((p) => p.side === 1)?.type ?? "ballpoint"];
          setPhase("play");
          startRound(1, m.pens);
          s.turn = m.turn;
          beginTurn();
          break;
        case "flick":
          doFlick(m.flick, m.side, true);
          break;
        case "settle":
          if (roleRef.current !== "guest") break;
          freezeAll(s.bodies);
          applySnapshot(s.bodies, m.snap);
          s.points = [m.points[0], m.points[1]];
          s.round = m.round;
          if (m.winner !== null) {
            gameOver(m.winner);
          } else {
            s.turn = m.turn;
            beginTurn();
          }
          break;
      }
    }
  };

  const startOnlineMatch = () => {
    const s = G.current;
    if (!s.myPen || !s.peerPen) return;
    s.penChoice = [s.myPen, s.peerPen];
    setPhase("play");
    startRound(1);
    send({ t: "setup", pens: toSetup(s.bodies), turn: s.turn });
  };

  const choosePen = (id: PenTypeId) => {
    const s = G.current;
    if (s.mode === "cpu") {
      s.penChoice[0] = id;
      setPhase("play");
      startRound(1);
    } else if (s.mode === "local") {
      s.penChoice[pickFor] = id;
      if (pickFor === 0) {
        setPickFor(1);
      } else {
        setPhase("play");
        startRound(1);
      }
    } else {
      s.myPen = id;
      s.hudDirty = true;
      send({ t: "pen", pen: id });
      if (roleRef.current === "host") startOnlineMatch();
    }
  };

  const chooseMode = (mode: Mode) => {
    const s = G.current;
    s.mode = mode;
    s.mySide = 0;
    setPickFor(0);
    if (mode === "online") setPhase("lobby");
    else setPhase("pens");
    pushHud();
  };

  const backToMenu = () => {
    roomRef.current?.leave();
    roomRef.current = null;
    setNetPhase("idle");
    setRoomCode("");
    setNetError(null);
    G.current = initialState();
    sceneRef.current?.setPens([]);
    pushHud();
  };

  const connect = async (role: Role, code: string) => {
    setNetError(null);
    setNetPhase("connecting");
    roleRef.current = role;
    G.current.mySide = role === "host" ? 0 : 1;
    G.current.cameraSide = G.current.mySide;
    try {
      const room = await joinRoom<NetMsg, NetMsg>("pen-fight", code, role, {
        onPeerJoin: () => {
          setNetPhase("joined");
          setPhase("pens");
          G.current.hudDirty = true;
        },
        onPeerLeave: () => {
          if (netPhaseRef.current === "joined") {
            setNetError("Your opponent left the match.");
            setNetPhase("ended");
          }
        },
        onState: (m) => G.current.netQueue.push(m),
        onInput: (m) => G.current.netQueue.push(m),
        onError: (message) => setNetError(message),
      });
      roomRef.current = room;
      setRoomCode(code);
      // The peer may already be here (a guest joining a waiting host).
      setNetPhase((p) => (p === "joined" ? p : "waiting"));
    } catch (e) {
      setNetError(e instanceof Error ? e.message : "Could not connect");
      setNetPhase("idle");
    }
  };

  // ---- Input ------------------------------------------------------------

  const input = useGameInput({
    target: canvasRef,
    queueDirections: false,
    enableSwipe: false,
    touchAsPrimary: false,
    onPause: () => {
      const s = G.current;
      if (s.phase === "play" && !s.over) {
        s.paused = !s.paused;
        s.drag = null;
        pushHud();
      }
    },
  });

  const canAct = () => {
    const s = G.current;
    return s.phase === "play" && !s.paused && !s.over && s.sub === "aim" && isHumanTurn();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = G.current;
    if (s.paused && s.phase === "play" && !s.over) {
      s.paused = false;
      pushHud();
      return;
    }
    if (!canAct()) return;
    const scene = sceneRef.current;
    const p = scene?.pointerToTable(e.clientX, e.clientY);
    if (!p) return;

    // Grab the nearest of our pens under the pointer; otherwise flick the
    // selected one from wherever the finger landed.
    let best: { b: PenBody; x: number; z: number; dist: number } | null = null;
    for (const b of s.bodies) {
      if (b.side !== s.turn || !b.alive || b.falling) continue;
      const c = closestPointOnPen(b, p.x, p.z);
      if (c.dist < 3.5 && (!best || c.dist < best.dist)) best = { b, x: c.x, z: c.z, dist: c.dist };
    }
    let penId: number;
    let anchorX: number;
    let anchorZ: number;
    if (best) {
      penId = best.b.id;
      anchorX = best.x;
      anchorZ = best.z;
      s.selectedId = penId;
    } else if (s.selectedId !== null) {
      const sel = s.bodies.find((b) => b.id === s.selectedId);
      if (!sel || !sel.alive || sel.falling) return;
      penId = sel.id;
      anchorX = sel.x;
      anchorZ = sel.z;
    } else {
      return;
    }
    s.drag = { penId, pointerId: e.pointerId, anchorX, anchorZ, curX: p.x, curZ: p.z };
    s.keyboardAim = false;
    // Keep receiving moves when the finger leaves the canvas mid-pull.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not every pointer can be captured; the drag still works inside the canvas */
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = G.current;
    if (!s.drag || s.drag.pointerId !== e.pointerId) return;
    const p = sceneRef.current?.pointerToTable(e.clientX, e.clientY);
    if (!p) return;
    s.drag.curX = p.x;
    s.drag.curZ = p.z;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = G.current;
    const d = s.drag;
    if (!d || d.pointerId !== e.pointerId) return;
    s.drag = null;
    if (!canAct()) return;
    const vx = d.anchorX - d.curX;
    const vz = d.anchorZ - d.curZ;
    const dist = Math.hypot(vx, vz);
    if (dist < PULL_DEADZONE) return; // a tap: selection only
    const power = Math.min(1, dist / MAX_PULL);
    doFlick({ penId: d.penId, dirX: vx / dist, dirZ: vz / dist, power, atX: d.anchorX, atZ: d.anchorZ }, s.turn);
  };

  const cycleSelection = () => {
    const s = G.current;
    const mine = s.bodies.filter((b) => b.side === s.turn && b.alive && !b.falling);
    if (mine.length === 0) return;
    const idx = mine.findIndex((b) => b.id === s.selectedId);
    s.selectedId = mine[(idx + 1) % mine.length].id;
  };

  // ---- Loop ---------------------------------------------------------------

  useGameLoop({
    step: 1000 / 120,
    onPauseChange: (paused) => {
      const s = G.current;
      if (paused && s.phase === "play" && !s.over) {
        s.paused = true;
        s.drag = null;
        s.hudDirty = true;
      }
    },
    update: (dt) => {
      const s = G.current;
      s.time += dt;
      drainNet();

      if (s.over && !s.reported) {
        s.reported = true;
        const me = s.mode === "online" ? s.mySide : 0;
        const final = s.points[me] + (s.mode !== "cpu" && s.winner === me ? 500 : 0);
        setTimeout(() => onGameOverRef.current(final), 1400);
      }

      if (s.banner && s.time > s.banner.until) {
        s.banner = null;
        s.hudDirty = true;
      }

      const io = input.current;
      if (io && s.paused && !s.over && io.consumePress("primary")) {
        s.paused = false;
        s.hudDirty = true;
      }

      if (io && s.phase === "play" && !s.paused && !s.over) {
        switch (s.sub) {
          case "aim": {
            if (isHumanTurn()) {
              if (io.consumePress("secondary")) cycleSelection();
              let sel = s.bodies.find((b) => b.id === s.selectedId);
              if (!sel || !sel.alive || sel.falling) {
                sel = firstAlive(s.bodies, s.turn);
                s.selectedId = sel ? sel.id : null;
              }
              if (sel && !s.drag) {
                // Each press nudges; holding the key keeps turning. The nudge
                // means a quick tap always does something visible.
                let used = false;
                if (io.consumePress("left")) { s.aimAngle -= 0.06; used = true; }
                if (io.consumePress("right")) { s.aimAngle += 0.06; used = true; }
                if (io.consumePress("up")) { s.aimPower = Math.min(1, s.aimPower + 0.05); used = true; }
                if (io.consumePress("down")) { s.aimPower = Math.max(0.1, s.aimPower - 0.05); used = true; }
                if (io.isDown("left")) { s.aimAngle -= AIM_TURN_RATE * dt; used = true; }
                if (io.isDown("right")) { s.aimAngle += AIM_TURN_RATE * dt; used = true; }
                if (io.isDown("up")) { s.aimPower = Math.min(1, s.aimPower + POWER_RATE * dt); used = true; }
                if (io.isDown("down")) { s.aimPower = Math.max(0.1, s.aimPower - POWER_RATE * dt); used = true; }
                if (used) s.keyboardAim = true;
                if (io.consumePress("primary")) {
                  doFlick(
                    { penId: sel.id, dirX: Math.cos(s.aimAngle), dirZ: Math.sin(s.aimAngle), power: s.aimPower, atX: sel.x, atZ: sel.z },
                    s.turn
                  );
                }
              }
            }
            break;
          }
          case "cpu": {
            s.timer -= dt;
            if (s.timer <= 0) {
              const f = chooseFlick(s.bodies, 1, cpuSkill(s.round), s.rng);
              if (f) doFlick(f, 1);
              else resolveOutcome();
            }
            break;
          }
          case "sim": {
            s.simTime += dt;
            stepWorld(s.bodies, dt, worldEvents);
            if (isSettled(s.bodies) || s.simTime > SIM_TIMEOUT) finishFlick();
            break;
          }
          case "between": {
            s.timer -= dt;
            if (s.timer <= 0) startRound(s.round + 1);
            break;
          }
          case "waiting":
            break;
        }
        // A pen still tumbling off the edge keeps falling whatever the turn state.
        if (s.sub !== "sim" && s.bodies.some((b) => b.alive && b.falling)) stepWorld(s.bodies, dt, worldEvents);
      }

      if (s.hudDirty) {
        s.hudDirty = false;
        pushHud();
      }
    },
    render: (alpha) => {
      const scene = sceneRef.current;
      if (!scene) return;
      const s = G.current;
      const now = performance.now();
      const dt = lastFrame.current ? Math.min(0.05, (now - lastFrame.current) / 1000) : 0;
      lastFrame.current = now;

      let aim: AimGizmo | null = null;
      if (canAct()) {
        if (s.drag) {
          const vx = s.drag.anchorX - s.drag.curX;
          const vz = s.drag.anchorZ - s.drag.curZ;
          const dist = Math.hypot(vx, vz);
          if (dist > PULL_DEADZONE) {
            aim = { x: s.drag.anchorX, z: s.drag.anchorZ, dirX: vx / dist, dirZ: vz / dist, power: Math.min(1, dist / MAX_PULL), side: s.turn };
          }
        } else if (s.keyboardAim) {
          const sel = s.bodies.find((b) => b.id === s.selectedId);
          if (sel) aim = { x: sel.x, z: sel.z, dirX: Math.cos(s.aimAngle), dirZ: Math.sin(s.aimAngle), power: s.aimPower, side: s.turn };
        }
      }
      if (powerRef.current) {
        powerRef.current.style.width = `${Math.round((aim?.power ?? 0) * 100)}%`;
        powerRef.current.style.background = SIDE_COLORS[s.turn];
      }

      scene.render({
        bodies: s.bodies,
        alpha: s.paused ? 1 : alpha,
        dt: s.paused ? 0 : dt,
        selectedId: s.sub === "aim" ? s.selectedId : null,
        aim,
        cameraSide: s.cameraSide,
      });
    },
  });

  // ---- Overlays -----------------------------------------------------------

  const h = hud;
  const turnLabel = (() => {
    if (!h || h.phase !== "play") return "";
    if (h.over) return "";
    const who = h.mode === "cpu" ? (h.turn === 0 ? "Your" : "CPU's") : h.mode === "local" ? `Player ${h.turn + 1}'s` : h.turn === h.mySide ? "Your" : "Opponent's";
    if (h.sub === "cpu") return "CPU is thinking…";
    if (h.sub === "sim") return "…";
    if (h.sub === "between") return "Next round";
    if (h.sub === "waiting" && h.turn === h.mySide) return "Syncing…";
    return `${who} turn`;
  })();
  const hint = h && h.phase === "play" && h.sub === "aim" && !h.over && !h.paused
    ? coarse
      ? "Drag back from your pen and release to flick"
      : "Drag back from a pen and release  ·  ← → aim  ·  ↑ ↓ power  ·  Space flick  ·  Shift switch pen"
    : "";
  const label = (side: Side) => (h ? (h.mode === "cpu" ? (side === 0 ? "You" : "CPU") : h.mode === "local" ? `P${side + 1}` : side === h.mySide ? "You" : "Rival") : "");
  return (
    <div ref={containerRef} className="relative h-full w-full select-none overflow-hidden bg-[#0b0a10]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        style={{ WebkitTouchCallout: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Pen Fight game"
      />

      {/* Lens vignette. The renderer has no post-processing pass; one CSS
          gradient buys most of what a cinematic grade would, for nothing. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 42%, transparent 38%, rgba(6,5,12,0.42) 82%, rgba(6,5,12,0.72) 100%)",
        }}
      />

      {/* In-game HUD */}
      {h && h.phase === "play" && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5 text-white sm:p-4">
            <div className="pf-panel px-3 py-2 sm:px-3.5">
              {h.mode === "cpu" ? (
                <>
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/45 sm:text-[10px]">
                    Round {h.round}
                  </div>
                  <div className="font-mono text-[17px] font-black leading-tight tabular-nums sm:text-xl">
                    {h.points[0].toLocaleString()}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2.5 font-mono text-[13px] font-black tabular-nums sm:text-sm">
                  <span style={{ color: SIDE_COLORS[0] }}>
                    {label(0)} {h.points[0]}
                  </span>
                  <span className="text-white/25">·</span>
                  <span style={{ color: SIDE_COLORS[1] }}>
                    {label(1)} {h.points[1]}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-1.5 sm:gap-2">
              <div className="pf-panel flex items-center gap-2.5 px-3 py-2 sm:gap-3.5">
                {([0, 1] as Side[]).map((side) => (
                  <div key={side} className="flex items-center gap-1.5" title={h.penNames[side]}>
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/45 sm:text-[10px]">
                      {label(side)}
                    </span>
                    <span className="flex items-center gap-[3px]">
                      {Array.from({ length: Math.max(h.alive[side], 0) }).map((_, i) => (
                        <span
                          key={i}
                          className="block h-3.5 w-[5px] rounded-[2px]"
                          style={{
                            background: `linear-gradient(180deg, ${SIDE_COLORS[side]}, color-mix(in srgb, ${SIDE_COLORS[side]} 55%, #000))`,
                            boxShadow: `0 0 7px color-mix(in srgb, ${SIDE_COLORS[side]} 60%, transparent)`,
                          }}
                        />
                      ))}
                      {h.alive[side] === 0 && <span className="text-[10px] font-semibold text-white/30">out</span>}
                    </span>
                  </div>
                ))}
              </div>
              {!h.over && (
                <button
                  type="button"
                  onClick={() => {
                    const s = G.current;
                    s.paused = !s.paused;
                    s.drag = null;
                    pushHud();
                  }}
                  className="pf-panel pointer-events-auto cursor-pointer px-3 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/65 transition-colors hover:text-white sm:text-[10px]"
                >
                  {h.paused ? "Resume" : "Pause"}
                </button>
              )}
            </div>
          </div>

          {turnLabel && !h.paused && (
            <div className="pointer-events-none absolute left-1/2 top-2.5 -translate-x-1/2 sm:top-4">
              <div className="pf-panel flex items-center gap-2 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white sm:text-[11px]">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: SIDE_COLORS[h.turn], boxShadow: `0 0 10px ${SIDE_COLORS[h.turn]}` }}
                />
                {turnLabel}
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3 sm:p-4">
            <div className="h-[5px] w-40 overflow-hidden rounded-full border border-white/10 bg-black/45 sm:w-48">
              <div ref={powerRef} className="h-full rounded-full transition-none" style={{ width: 0 }} />
            </div>
            {hint && (
              <p className="max-w-[92%] text-center text-[10.5px] font-medium leading-snug text-white/60 sm:text-xs">
                {hint}
              </p>
            )}
          </div>

          {h.banner && !h.paused && !h.over && (
            <div
              key={h.banner.text + h.banner.until}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="animate-in fade-in zoom-in-95 text-center duration-300">
                <div
                  className="text-[34px] font-black uppercase leading-none tracking-[-0.03em] text-white sm:text-[50px]"
                  style={{ textShadow: "0 2px 30px rgba(0,0,0,0.85), 0 0 14px rgba(255,255,255,0.18)" }}
                >
                  {h.banner.text}
                </div>
                {h.banner.sub && (
                  <div className="mt-1.5 text-[13px] font-bold uppercase tracking-[0.14em] text-white/75 drop-shadow">
                    {h.banner.sub}
                  </div>
                )}
              </div>
            </div>
          )}

          {h.paused && !h.over && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-zinc-950/80 backdrop-blur-[2px]">
              <div className="text-[40px] font-black tracking-[-0.02em] text-white sm:text-[48px]">PAUSED</div>
              <div className="text-[12px] font-medium text-white/50 sm:text-sm">
                Press P, Esc, Space, or tap to resume
              </div>
            </div>
          )}

          {h.over && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-rose-500/10 via-zinc-950/55 to-zinc-950/75">
              <div
                className="text-[38px] font-black uppercase leading-none tracking-[-0.03em] text-white sm:text-[52px]"
                style={{ textShadow: "0 2px 30px rgba(0,0,0,0.85)" }}
              >
                {h.mode === "cpu"
                  ? "Game over"
                  : h.mode === "local"
                    ? `Player ${(h.winner ?? 0) + 1} wins`
                    : h.winner === h.mySide
                      ? "You win"
                      : "You lose"}
              </div>
              <div className="pf-panel px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-white/80">
                {h.mode === "cpu"
                  ? `Round ${h.round} · ${h.points[0].toLocaleString()} points`
                  : `${h.points[0]} – ${h.points[1]}`}
              </div>
            </div>
          )}
        </>
      )}

      {/* Mode select */}
      {h && h.phase === "menu" && (
        <div className="pf-sheet absolute inset-0 z-10 flex items-center justify-center overflow-y-auto p-4">
          <div className="w-full max-w-sm">
            <div className="mb-5 text-center">
              <div className="mb-2 flex items-center justify-center gap-1.5">
                <PenGlyph pen={PEN_TYPES[0]} className="h-3.5 w-16 -rotate-12" />
                <PenGlyph pen={PEN_TYPES[2]} className="h-3.5 w-16 rotate-12" />
              </div>
              <h3
                className="text-[30px] font-black uppercase leading-none tracking-[-0.035em] sm:text-[38px]"
                style={{
                  background: "linear-gradient(135deg, #fff 10%, #ffd9a0 55%, #ff9f1c 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Pen Fight
              </h3>
              <p className="mx-auto mt-2 max-w-[19rem] text-[12px] leading-relaxed text-white/55 sm:text-[13px]">
                Flick your pens. Knock theirs off the desk. Last side standing wins.
              </p>
            </div>
            <div className="grid gap-2">
              {(
                [
                  ["cpu", "Play with AI", "You against the computer. It gets sharper every round, and your score goes to the leaderboard.", "AI"],
                  ["local", "2 friends, 1 phone", "Pass the device back and forth. The camera swings round to whoever's turn it is.", "2P"],
                  ["online", "Friend far away", "Create a room and send them the 4-letter code. You play on your own phones.", "NET"],
                ] as [Mode, string, string, string][]
              ).map(([m, title, desc, tag]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => chooseMode(m)}
                  className="pf-option group flex cursor-pointer items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="pf-option-tag">{tag}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-black uppercase tracking-[0.06em] text-white">{title}</span>
                    <span className="block text-[11px] leading-snug text-white/50">{desc}</span>
                  </span>
                  <span className="text-white/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white/70">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Online lobby */}
      {h && h.phase === "lobby" && (
        <div className="pf-sheet absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="pf-card w-full max-w-xs space-y-4 p-6 text-center">
            {netPhase === "idle" && (
              <>
                <h3 className="text-[17px] font-black uppercase tracking-[-0.01em] text-white">Play a friend far away</h3>
                <p className="text-[11.5px] leading-relaxed text-white/55">
                  Create a room and send them the code, or enter a code they sent you.
                </p>
                <button
                  type="button"
                  onClick={() => connect("host", makeRoomCode())}
                  className="pf-cta h-10 w-full cursor-pointer text-[11px] font-black uppercase tracking-[0.12em]"
                >
                  Create room
                </button>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (joinCode.length === 4) connect("guest", joinCode);
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(normalizeRoomCode(e.target.value))}
                    placeholder="CODE"
                    maxLength={4}
                    aria-label="Room code"
                    className="h-10 min-w-0 flex-1 rounded-full border border-white/12 bg-black/50 px-4 text-center font-mono text-sm font-bold uppercase tracking-[0.3em] text-white placeholder:text-white/25 focus:border-white/35 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={joinCode.length !== 4}
                    className="h-10 cursor-pointer rounded-full border border-white/15 px-4 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Join
                  </button>
                </form>
                {netError && (
                  <p role="alert" className="text-[11px] font-semibold text-rose-300">
                    {netError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={backToMenu}
                  className="cursor-pointer text-[11px] font-semibold text-white/40 transition-colors hover:text-white"
                >
                  Back
                </button>
              </>
            )}
            {netPhase === "connecting" && <p className="text-[13px] font-semibold text-white/70">Connecting…</p>}
            {netPhase === "waiting" && (
              <>
                <p className="text-[9.5px] font-black uppercase tracking-[0.18em] text-white/40">Room code</p>
                <p className="font-mono text-[40px] font-black leading-none tracking-[0.22em] text-white">{roomCode}</p>
                <p className="text-[11.5px] leading-relaxed text-white/55">
                  Share this code. You both pick pens once they join.
                </p>
                <button
                  type="button"
                  onClick={backToMenu}
                  className="cursor-pointer text-[11px] font-semibold text-white/40 transition-colors hover:text-white"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Opponent left */}
      {netPhase === "ended" && h && h.phase !== "menu" && (
        <div className="pf-sheet absolute inset-0 z-20 flex items-center justify-center p-6">
          <div className="pf-card w-full max-w-xs space-y-4 p-6 text-center">
            <p className="text-[13px] font-semibold text-white/75">{netError ?? "Match over"}</p>
            <button
              type="button"
              onClick={backToMenu}
              className="pf-cta h-10 w-full cursor-pointer text-[11px] font-black uppercase tracking-[0.12em]"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Pen select */}
      {h && h.phase === "pens" && (
        <div className="pf-sheet absolute inset-0 z-10 overflow-y-auto p-3 sm:p-5">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[17px] font-black uppercase leading-tight tracking-[-0.015em] text-white sm:text-[24px]">
                  {h.mode === "local" ? (
                    <>
                      <span style={{ color: SIDE_COLORS[pickFor] }}>Player {pickFor + 1}</span>, pick your pen
                    </>
                  ) : (
                    "Pick your pen"
                  )}
                </h3>
                <p className="text-[11px] leading-snug text-white/50 sm:text-xs">
                  {h.mode === "online"
                    ? h.peerPicked
                      ? "Your opponent has picked. Choose yours to start."
                      : "Waiting for your opponent to pick too."
                    : "Weight shoves, speed carries, grip stops. Every pen plays differently."}
                </p>
              </div>
              <button
                type="button"
                onClick={backToMenu}
                className="shrink-0 cursor-pointer text-[11px] font-semibold text-white/40 transition-colors hover:text-white"
              >
                {h.mode === "online" ? "Leave" : "Back"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-4">
              {PEN_TYPES.map((p) => (
                <PenCard
                  key={p.id}
                  pen={p}
                  side={h.mode === "local" ? pickFor : h.mySide}
                  onPick={() => choosePen(p.id)}
                />
              ))}
            </div>
            {h.mode === "online" && (
              <p className="mt-3 text-center text-[11px] text-white/40">
                {h.myPicked ? "Pen locked in. The match starts once both sides have picked." : `Room ${roomCode}`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Overlay chrome. Scoped here so the game owns its own dark surface
          treatment — the canvas is deliberately dark in both site themes. */}
      <style>{`
        .pf-panel {
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(10,9,14,0.55);
          -webkit-backdrop-filter: blur(14px) saturate(160%);
          backdrop-filter: blur(14px) saturate(160%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 6px 22px -10px rgba(0,0,0,0.8);
        }
        .pf-sheet {
          background: radial-gradient(90% 70% at 50% 35%, rgba(18,15,26,0.82), rgba(7,6,12,0.93));
          -webkit-backdrop-filter: blur(7px);
          backdrop-filter: blur(7px);
        }
        .pf-card {
          border-radius: 1.25rem;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(20,18,26,0.85);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 60px -20px rgba(0,0,0,0.9);
        }
        .pf-option {
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.09);
          background: linear-gradient(135deg, rgba(32,28,42,0.8), rgba(18,16,24,0.8));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
          transition: border-color 200ms ease, background-color 200ms ease, transform 220ms cubic-bezier(0.34,1.56,0.64,1);
        }
        .pf-option:hover {
          border-color: rgba(255,159,28,0.45);
          transform: translateY(-2px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 14px 34px -16px rgba(255,159,28,0.65);
        }
        .pf-option:active { transform: translateY(0) scale(0.99); }
        .pf-option-tag {
          display: inline-flex;
          height: 1.9rem;
          width: 1.9rem;
          flex: none;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: rgba(255,255,255,0.65);
        }
        .pf-option:hover .pf-option-tag { color: #ff9f1c; border-color: rgba(255,159,28,0.5); }
        .pf-cta {
          border-radius: 999px;
          color: #fff;
          background: linear-gradient(135deg, #ff9f1c 0%, #ff4d6d 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 24px -10px rgba(255,159,28,0.7);
          transition: filter 180ms ease, transform 180ms cubic-bezier(0.34,1.56,0.64,1);
        }
        .pf-cta:hover { filter: brightness(1.07); }
        .pf-cta:active { transform: scale(0.97); }
        .pf-pen {
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.09);
          background: linear-gradient(160deg, rgba(30,27,39,0.85), rgba(16,14,22,0.85));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
          transition: border-color 200ms ease, transform 220ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 220ms ease;
        }
        .pf-pen:hover {
          transform: translateY(-3px);
          border-color: color-mix(in srgb, var(--pen) 55%, transparent);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 18px 40px -20px var(--pen);
        }
        .pf-pen:active { transform: translateY(-1px) scale(0.99); }
        @media (prefers-reduced-motion: reduce) {
          .pf-option, .pf-option:hover, .pf-pen, .pf-pen:hover, .pf-cta, .pf-cta:active { transform: none; transition-duration: 1ms; }
        }
      `}</style>
    </div>
  );
};

/**
 * A pen drawn side-on, from the same numbers the 3D build and the physics use.
 *
 * The vertical gradient is what sells the cylinder: dark at both edges, bright
 * just above the middle where the lamp would catch it. Each silhouette matches
 * its 3D counterpart so the card is a preview, not a generic icon.
 */
function PenGlyph({ pen, className }: { pen: PenType; className?: string }) {
  const W = 100;
  const H = 20;
  const cy = H / 2;
  // Barrel thickness, scaled from the real radius so a marker reads as fat.
  const r = Math.min(7.5, 2.6 + pen.radius * 4.6);
  const id = `pf-${pen.id}`;
  const { body, accent, tip } = pen.colors;
  const metal = pen.finish.metalness > 0.6;

  const tipLen = pen.shape === "marker" || pen.shape === "highlighter" ? 7 : 10;
  const tipX = W - tipLen;
  // Cap band near the back, in the pen's accent colour.
  const capW = pen.shape === "pencil" ? 13 : 20;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity={metal ? 0.55 : 0.4} />
          <stop offset="26%" stopColor="#fff" stopOpacity={metal ? 0.75 : 0.42} />
          <stop offset="48%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity={metal ? 0.6 : 0.48} />
        </linearGradient>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity="0.35" />
          <stop offset="30%" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      {/* Barrel */}
      <rect x="2" y={cy - r} width={tipX - 2} height={r * 2} rx={pen.shape === "pencil" ? 0 : r} fill={body} />
      <rect
        x="2"
        y={cy - r}
        width={tipX - 2}
        height={r * 2}
        rx={pen.shape === "pencil" ? 0 : r}
        fill={`url(#${id}-b)`}
      />

      {/* Cap / grip band */}
      <rect x="2" y={cy - r} width={capW} height={r * 2} rx={pen.shape === "pencil" ? 0 : r} fill={accent} />
      <rect x="2" y={cy - r} width={capW} height={r * 2} rx={pen.shape === "pencil" ? 0 : r} fill={`url(#${id}-a)`} />

      {/* Tip: a cone for writing pens, a chisel for markers */}
      {pen.shape === "marker" || pen.shape === "highlighter" ? (
        <>
          <rect x={tipX} y={cy - r * 0.55} width={tipLen} height={r * 1.1} rx="1.5" fill={tip} />
          <rect x={tipX} y={cy - r * 0.55} width={tipLen} height={r * 1.1} rx="1.5" fill={`url(#${id}-a)`} />
        </>
      ) : (
        <>
          <path d={`M${tipX} ${cy - r} L${W - 1} ${cy} L${tipX} ${cy + r} Z`} fill={tip} />
          <path d={`M${tipX} ${cy - r} L${W - 1} ${cy} L${tipX} ${cy + r} Z`} fill={`url(#${id}-a)`} />
        </>
      )}

      {/* The pencil's graphite point reads wrong without a dark nib. */}
      {pen.shape === "pencil" && <path d={`M${W - 4} ${cy - 1.3} L${W - 1} ${cy} L${W - 4} ${cy + 1.3} Z`} fill="#2b2b2b" />}

      {/* Pocket clip, on the pens that have one in 3D. */}
      {(pen.shape === "ballpoint" || pen.shape === "gel" || pen.shape === "jotter" || pen.shape === "fountain") && (
        <rect x="8" y={cy - r - 1.6} width="15" height="1.9" rx="0.9" fill={metal ? "#e5e7eb" : accent} opacity="0.95" />
      )}
    </svg>
  );
}

function PenCard({ pen, side, onPick }: { pen: PenType; side: Side; onPick: () => void }) {
  const st = penStats(pen);
  const rows: [string, number][] = [
    ["Weight", st.weight],
    ["Speed", st.speed],
    ["Grip", st.grip],
    ["Bounce", st.bounce],
    ["Reach", st.reach],
  ];
  return (
    <button
      type="button"
      onClick={onPick}
      className="pf-pen group cursor-pointer p-3 text-left focus-visible:outline-2"
      style={{ "--pen": SIDE_COLORS[side] } as React.CSSProperties}
    >
      <div className="mb-2 flex h-7 items-center rounded-lg bg-black/25 px-1.5">
        <PenGlyph pen={pen} className="h-5 w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
      </div>
      <div className="text-[12px] font-black uppercase leading-tight tracking-[0.02em] text-white sm:text-[12.5px]">
        {pen.name}
      </div>
      <div className="mb-2 mt-0.5 line-clamp-2 text-[10px] leading-snug text-white/45 sm:text-[10.5px]">
        {pen.tagline}
      </div>
      <dl className="space-y-[3px]">
        {rows.map(([name, v]) => (
          <div key={name} className="flex items-center justify-between gap-2">
            <dt className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-white/35">{name}</dt>
            <dd className="flex gap-[2px]">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-2.5 rounded-[1px]"
                  style={{
                    background: i <= v ? "var(--pen)" : "rgba(255,255,255,0.08)",
                    boxShadow: i <= v ? "0 0 5px color-mix(in srgb, var(--pen) 45%, transparent)" : undefined,
                  }}
                />
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-2.5 rounded-full border border-white/15 py-1 text-center text-[9.5px] font-black uppercase tracking-[0.12em] text-white/70 transition-colors group-hover:bg-white group-hover:text-black">
        Choose
      </div>
    </button>
  );
}
