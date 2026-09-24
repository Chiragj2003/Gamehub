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
    <div ref={containerRef} className="pf-root relative h-full w-full select-none overflow-hidden bg-[#0b0a10]">
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
          gradient buys most of what a grade would, for nothing. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 42%, transparent 38%, rgba(6,5,12,0.42) 82%, rgba(6,5,12,0.72) 100%)",
        }}
      />

      {/* In-game HUD. Stays dark and small: the desk is the thing to look at. */}
      {h && h.phase === "play" && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5 sm:p-4">
            <div className="pf-chip">
              {h.mode === "cpu" ? (
                <>
                  <span className="pf-chip-label">Round {h.round}</span>
                  <span className="pf-chip-value">{h.points[0].toLocaleString()}</span>
                </>
              ) : (
                <span className="pf-chip-value flex items-center gap-2">
                  <span style={{ color: SIDE_COLORS[0] }}>{h.points[0]}</span>
                  <span className="text-white/25">/</span>
                  <span style={{ color: SIDE_COLORS[1] }}>{h.points[1]}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col items-end gap-1.5 sm:gap-2">
              <div className="pf-chip flex-row items-center gap-3 sm:gap-4">
                {([0, 1] as Side[]).map((side) => (
                  <span key={side} className="flex items-center gap-1.5" title={h.penNames[side]}>
                    <span className="pf-chip-label !mb-0">{label(side)}</span>
                    <span className="flex items-center gap-[3px]">
                      {Array.from({ length: Math.max(h.alive[side], 0) }).map((_, i) => (
                        <span
                          key={i}
                          className="block h-3.5 w-[5px] rounded-[1px]"
                          style={{
                            background: SIDE_COLORS[side],
                            boxShadow: `0 0 8px color-mix(in srgb, ${SIDE_COLORS[side]} 70%, transparent)`,
                          }}
                        />
                      ))}
                      {h.alive[side] === 0 && <span className="pf-chip-label !mb-0 opacity-60">out</span>}
                    </span>
                  </span>
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
                  className="pf-chip pointer-events-auto cursor-pointer !py-1 transition-colors hover:text-white"
                >
                  <span className="pf-chip-label !mb-0">{h.paused ? "Resume" : "Pause"}</span>
                </button>
              )}
            </div>
          </div>

          {turnLabel && !h.paused && (
            <div className="pointer-events-none absolute left-1/2 top-2.5 -translate-x-1/2 sm:top-4">
              <div className="pf-chip flex-row items-center gap-2 !py-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: SIDE_COLORS[h.turn], boxShadow: `0 0 10px ${SIDE_COLORS[h.turn]}` }}
                />
                <span className="pf-chip-label !mb-0 !text-white/85">{turnLabel}</span>
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3 sm:p-4">
            <div className="h-[5px] w-40 overflow-hidden rounded-full border border-white/10 bg-black/45 sm:w-48">
              <div ref={powerRef} className="h-full rounded-full transition-none" style={{ width: 0 }} />
            </div>
            {hint && <p className="pf-hint">{hint}</p>}
          </div>

          {h.banner && !h.paused && !h.over && (
            <div
              key={h.banner.text + h.banner.until}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="animate-in fade-in zoom-in-95 text-center duration-300">
                <div className="pf-banner">{h.banner.text}</div>
                {h.banner.sub && <div className="pf-banner-sub">{h.banner.sub}</div>}
              </div>
            </div>
          )}

          {h.paused && !h.over && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-zinc-950/80 backdrop-blur-[2px]">
              <div className="pf-banner">Paused</div>
              <div className="pf-banner-sub">Press P, Esc, Space, or tap to resume</div>
            </div>
          )}

          {h.over && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/55">
              <div className="pf-banner">
                {h.mode === "cpu"
                  ? "Game over"
                  : h.mode === "local"
                    ? `Player ${(h.winner ?? 0) + 1} wins`
                    : h.winner === h.mySide
                      ? "You win"
                      : "You lose"}
              </div>
              <div className="pf-chip !flex-row items-center gap-2">
                <span className="pf-chip-value">
                  {h.mode === "cpu" ? h.points[0].toLocaleString() : `${h.points[0]} – ${h.points[1]}`}
                </span>
                {h.mode === "cpu" && <span className="pf-chip-label !mb-0">points · round {h.round}</span>}
              </div>
            </div>
          )}
        </>
      )}

      {/* ---- The notebook. Everything you choose happens on paper. ---- */}

      {h && h.phase === "menu" && (
        <div className="pf-desk">
          <div className="pf-page pf-page--narrow">
            <div className="pf-page-inner">
              <h3 className="pf-title">Pen Fight</h3>
              <p className="pf-standfirst">
                Flick your pens. Knock theirs off the desk. Last side standing wins.
              </p>

              <ul className="pf-modes">
                {(
                  [
                    ["cpu", "Play with AI", "The computer gets sharper every round. Your score goes to the leaderboard."],
                    ["local", "2 friends, 1 phone", "Pass the phone back and forth. The desk turns round to face whoever is up."],
                    ["online", "Friend far away", "Start a room, send them the code, and play from your own phones."],
                  ] as [Mode, string, string][]
                ).map(([m, title, desc]) => (
                  <li key={m}>
                    <button type="button" onClick={() => chooseMode(m)} className="pf-mode">
                      <WhoDiagram mode={m} />
                      <span className="min-w-0 flex-1">
                        <span className="pf-mode-title">{title}</span>
                        <span className="pf-mode-desc">{desc}</span>
                      </span>
                      <span className="pf-mode-go" aria-hidden>
                        →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {h && h.phase === "lobby" && (
        <div className="pf-desk">
          <div className="pf-page pf-page--narrow">
            <div className="pf-page-inner text-center">
              {netPhase === "idle" && (
                <>
                  <h3 className="pf-title pf-title--sm">Friend far away</h3>
                  <p className="pf-standfirst">
                    Start a room and send them the code, or type in the code they sent you.
                  </p>
                  <button type="button" onClick={() => connect("host", makeRoomCode())} className="pf-btn mt-1 w-full">
                    Start a room
                  </button>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (joinCode.length === 4) connect("guest", joinCode);
                    }}
                    className="mt-3 flex gap-2"
                  >
                    <input
                      value={joinCode}
                      onChange={(e) => setJoinCode(normalizeRoomCode(e.target.value))}
                      placeholder="CODE"
                      maxLength={4}
                      aria-label="Room code"
                      className="pf-input"
                    />
                    <button type="submit" disabled={joinCode.length !== 4} className="pf-btn pf-btn--quiet">
                      Join
                    </button>
                  </form>
                  {netError && (
                    <p role="alert" className="pf-error">
                      {netError}
                    </p>
                  )}
                  <button type="button" onClick={backToMenu} className="pf-back">
                    Back
                  </button>
                </>
              )}
              {netPhase === "connecting" && <p className="pf-standfirst !mb-0">Connecting…</p>}
              {netPhase === "waiting" && (
                <>
                  <span className="pf-eyebrow">Your room code</span>
                  <p className="pf-code">{roomCode}</p>
                  <p className="pf-standfirst">Send them this code. You both pick pens once they arrive.</p>
                  <button type="button" onClick={backToMenu} className="pf-back">
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {netPhase === "ended" && h && h.phase !== "menu" && (
        <div className="pf-desk z-20">
          <div className="pf-page pf-page--narrow">
            <div className="pf-page-inner text-center">
              <h3 className="pf-title pf-title--sm">Match over</h3>
              <p className="pf-standfirst">{netError ?? "The match ended."}</p>
              <button type="button" onClick={backToMenu} className="pf-btn w-full">
                Back to modes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* The catalogue. Every pen is drawn to the same scale, so the page
          itself tells you the pencil is longest and the highlighter fattest. */}
      {h && h.phase === "pens" && (
        <div className="pf-desk">
          <div className="pf-page">
            <div className="pf-page-inner">
              <div className="mb-3 flex items-baseline justify-between gap-3 sm:mb-4">
                <div className="min-w-0">
                  <span className="pf-eyebrow">
                    {h.mode === "local" ? `Player ${pickFor + 1}` : "The pencil box"}
                  </span>
                  <h3 className="pf-title pf-title--sm">Pick your pen</h3>
                </div>
                <button type="button" onClick={backToMenu} className="pf-back !mt-0 shrink-0">
                  {h.mode === "online" ? "Leave" : "Back"}
                </button>
              </div>
              <p className="pf-note">
                {h.mode === "online"
                  ? h.peerPicked
                    ? "Your opponent has picked. Choose yours to start."
                    : "Waiting for your opponent to pick too."
                  : "Drawn to scale. Heavy pens shove, light pens fly, grippy pens stop short."}
              </p>

              <ul className="pf-catalogue">
                {PEN_TYPES.map((p) => (
                  <li key={p.id}>
                    <PenEntry
                      pen={p}
                      side={h.mode === "local" ? pickFor : h.mySide}
                      onPick={() => choosePen(p.id)}
                    />
                  </li>
                ))}
              </ul>

              {h.mode === "online" && (
                <p className="pf-note !mt-4 text-center">
                  {h.myPicked ? "Pen locked in. The match starts once you have both picked." : `Room ${roomCode}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Art direction for this game only. The site is glass and dark; Pen
          Fight is ink on paper, because that is what the game was played on. */}
      <style>{`
        .pf-root {
          --pf-paper: #e4e0cf;
          --pf-paper-edge: #cdc8b3;
          --pf-rule: #7f97ab;
          --pf-margin: #be3a2b;
          --pf-ink: #16233f;
          --pf-ink-2: #5a6678;
          --pf-blue: ${SIDE_COLORS[0]};
          --pf-red: ${SIDE_COLORS[1]};
          --pf-display: var(--font-display), ui-sans-serif, system-ui, sans-serif;
          --pf-mono: var(--font-geist-mono), ui-monospace, monospace;
        }

        /* ---- In-play chrome: dark, small, out of the way ---- */
        .pf-chip {
          display: flex;
          flex-direction: column;
          gap: 1px;
          border-radius: 0.6rem;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(10,9,14,0.6);
          padding: 0.4rem 0.7rem;
          color: #fff;
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
        }
        .pf-chip-label {
          display: block;
          margin-bottom: 1px;
          font-family: var(--pf-mono);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
          white-space: nowrap;
        }
        .pf-chip-value {
          font-family: var(--pf-mono);
          font-size: 16px;
          font-weight: 700;
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }
        .pf-hint {
          max-width: 92%;
          text-align: center;
          font-family: var(--pf-mono);
          font-size: 10px;
          letter-spacing: 0.02em;
          line-height: 1.5;
          color: rgba(255,255,255,0.55);
        }
        .pf-banner {
          font-family: var(--pf-display);
          font-size: clamp(30px, 8vw, 54px);
          font-weight: 800;
          letter-spacing: -0.035em;
          line-height: 1;
          color: #fff;
          text-shadow: 0 2px 30px rgba(0,0,0,0.9);
        }
        .pf-banner-sub {
          margin-top: 0.4rem;
          font-family: var(--pf-mono);
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.7);
        }

        /* ---- The notebook lying on the desk ---- */
        .pf-desk {
          position: absolute;
          inset: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow-y: auto;
          padding: clamp(0.5rem, 3vw, 2rem);
          background: radial-gradient(85% 70% at 50% 42%, rgba(8,6,14,0.3), rgba(6,5,12,0.66));
        }

        .pf-page {
          position: relative;
          margin: auto;
          width: 100%;
          max-width: 44rem;
          border-radius: 3px;
          background: var(--pf-paper);
          color: var(--pf-ink);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.5) inset,
            0 24px 60px -18px rgba(0,0,0,0.85),
            0 2px 0 var(--pf-paper-edge);
          /* Ruled feint, and the red margin printed down the left. */
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E"),
            repeating-linear-gradient(
              to bottom,
              transparent 0 27px,
              color-mix(in srgb, var(--pf-rule) 58%, transparent) 27px 28px
            ),
            linear-gradient(to right, transparent 0 34px, color-mix(in srgb, var(--pf-margin) 62%, transparent) 34px 35px, transparent 35px 37px, color-mix(in srgb, var(--pf-margin) 30%, transparent) 37px 38px, transparent 38px);
          background-position: 0 0, 0 6px, 0 0;
        }
        .pf-page--narrow { max-width: 30rem; }
        .pf-page-inner { padding: 1.75rem 1.5rem 1.75rem 3.5rem; }

        .pf-title {
          font-family: var(--pf-display);
          font-size: clamp(30px, 7vw, 46px);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 0.95;
          color: var(--pf-ink);
        }
        .pf-title--sm { font-size: clamp(21px, 4.4vw, 28px); }
        .pf-title::after {
          content: "";
          display: block;
          width: 2.6em;
          max-width: 100%;
          margin-top: 0.28em;
          height: 4px;
          border-top: 2px solid var(--pf-margin);
          border-bottom: 1px solid color-mix(in srgb, var(--pf-margin) 45%, transparent);
        }
        .pf-eyebrow {
          display: block;
          font-family: var(--pf-mono);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--pf-margin);
        }
        .pf-standfirst {
          margin: 0.6rem 0 1.15rem;
          font-size: 13.5px;
          line-height: 1.55;
          color: var(--pf-ink-2);
        }
        .pf-note {
          margin-bottom: 1rem;
          font-family: var(--pf-mono);
          font-size: 10.5px;
          line-height: 1.6;
          letter-spacing: 0.01em;
          color: var(--pf-ink-2);
        }

        /* ---- Mode list ---- */
        .pf-modes { display: grid; gap: 0.45rem; }
        .pf-mode {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 0.85rem;
          cursor: pointer;
          border: 0;
          border-bottom: 1px solid color-mix(in srgb, var(--pf-ink) 16%, transparent);
          background: none;
          padding: 0.7rem 0.2rem;
          text-align: left;
          color: inherit;
          transition: background-color 160ms ease, padding-left 200ms var(--ease-out, ease);
        }
        .pf-modes li:last-child .pf-mode { border-bottom: 0; }
        .pf-mode:hover, .pf-mode:focus-visible {
          background: color-mix(in srgb, var(--pf-blue) 8%, transparent);
          padding-left: 0.55rem;
          outline: none;
        }
        .pf-mode-title {
          display: block;
          font-family: var(--pf-display);
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.015em;
          color: var(--pf-ink);
        }
        .pf-mode-desc {
          display: block;
          margin-top: 2px;
          font-size: 12px;
          line-height: 1.45;
          color: var(--pf-ink-2);
        }
        .pf-mode-go { font-size: 17px; color: color-mix(in srgb, var(--pf-ink) 35%, transparent); transition: color 160ms ease, transform 200ms ease; }
        .pf-mode:hover .pf-mode-go { color: var(--pf-blue); transform: translateX(2px); }
        .pf-who { flex: none; color: var(--pf-ink); }

        /* ---- Catalogue ---- */
        .pf-catalogue { display: grid; gap: 0.35rem; }
        .pf-entry {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.15rem 1.15rem;
          width: 100%;
          cursor: pointer;
          border: 0;
          background: none;
          padding: 0.6rem 0.4rem 0.7rem;
          text-align: left;
          color: inherit;
          transition: background-color 160ms ease;
        }
        .pf-entry:hover, .pf-entry:focus-visible {
          background: color-mix(in srgb, var(--pf-pen) 10%, transparent);
          outline: none;
        }
        .pf-entry-head { display: flex; align-items: baseline; gap: 0.5rem; }
        .pf-entry-name {
          font-family: var(--pf-display);
          font-size: 14.5px;
          font-weight: 700;
          letter-spacing: -0.015em;
          color: var(--pf-ink);
        }
        .pf-entry-spec {
          font-family: var(--pf-mono);
          font-size: 10px;
          letter-spacing: 0.04em;
          color: var(--pf-ink-2);
          white-space: nowrap;
        }
        .pf-entry-tagline { font-size: 11.5px; line-height: 1.45; color: var(--pf-ink-2); }
        .pf-entry-draw { margin: 0.3rem 0; display: block; width: 100%; height: auto; }
        .pf-stats { display: flex; flex-wrap: wrap; gap: 0.15rem 0.9rem; }
        .pf-stat { display: flex; align-items: center; gap: 0.35rem; }
        .pf-stat-name {
          font-family: var(--pf-mono);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: color-mix(in srgb, var(--pf-ink) 55%, transparent);
        }
        .pf-pip { display: block; width: 8px; height: 3px; background: color-mix(in srgb, var(--pf-ink) 18%, transparent); }
        .pf-pip--on { background: var(--pf-pen); }
        .pf-take {
          margin-top: 0.45rem;
          justify-self: start;
          font-family: var(--pf-mono);
          font-size: 9.5px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--pf-pen);
          border-bottom: 1px solid currentColor;
          padding-bottom: 1px;
          opacity: 0;
          transition: opacity 160ms ease;
        }
        .pf-entry:hover .pf-take, .pf-entry:focus-visible .pf-take { opacity: 1; }
        @media (hover: none) { .pf-take { opacity: 1; } }
        @media (min-width: 640px) {
          .pf-entry { grid-template-columns: 17.5rem 1fr; align-items: center; }
          .pf-entry-draw { grid-row: span 3; margin: 0; }
          .pf-take { margin-top: 0.3rem; }
        }

        /* ---- Controls ---- */
        .pf-btn {
          display: inline-flex;
          height: 2.45rem;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 0;
          border-radius: 2px;
          background: var(--pf-ink);
          padding: 0 1.1rem;
          font-family: var(--pf-mono);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--pf-paper);
          transition: background-color 160ms ease;
        }
        .pf-btn:hover { background: var(--pf-blue); }
        .pf-btn--quiet {
          background: none;
          color: var(--pf-ink);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pf-ink) 35%, transparent);
        }
        .pf-btn--quiet:hover { background: color-mix(in srgb, var(--pf-ink) 10%, transparent); }
        .pf-btn:disabled { cursor: not-allowed; opacity: 0.35; }
        .pf-btn:disabled:hover { background: none; }
        .pf-input {
          height: 2.45rem;
          min-width: 0;
          flex: 1;
          border: 0;
          border-radius: 2px;
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pf-ink) 30%, transparent);
          background: color-mix(in srgb, #fff 35%, transparent);
          padding: 0 0.9rem;
          text-align: center;
          font-family: var(--pf-mono);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--pf-ink);
        }
        .pf-input::placeholder { color: color-mix(in srgb, var(--pf-ink) 35%, transparent); letter-spacing: 0.3em; }
        .pf-input:focus { outline: none; box-shadow: inset 0 0 0 2px var(--pf-blue); }
        .pf-code {
          font-family: var(--pf-mono);
          font-size: clamp(34px, 11vw, 46px);
          font-weight: 700;
          letter-spacing: 0.2em;
          line-height: 1.2;
          color: var(--pf-ink);
          text-indent: 0.2em;
        }
        .pf-error { margin-top: 0.7rem; font-size: 12px; font-weight: 600; color: var(--pf-margin); }
        .pf-back {
          margin-top: 1rem;
          cursor: pointer;
          border: 0;
          background: none;
          font-family: var(--pf-mono);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--pf-ink-2);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .pf-back:hover { color: var(--pf-ink); }

        @media (prefers-reduced-motion: reduce) {
          .pf-mode, .pf-mode:hover, .pf-mode-go, .pf-take, .pf-entry { transition-duration: 1ms; }
          .pf-mode:hover { padding-left: 0.2rem; }
          .pf-mode:hover .pf-mode-go { transform: none; }
        }
      `}</style>
    </div>
  );
};

/**
 * Who is playing, and on what. The three modes differ by exactly that, so the
 * diagram carries the distinction instead of a decorative number would.
 */
function WhoDiagram({ mode }: { mode: Mode }) {
  const stroke = "currentColor";
  return (
    <svg viewBox="0 0 40 24" className="pf-who h-6 w-10" aria-hidden focusable="false">
      {mode === "cpu" && (
        <>
          <circle cx="9" cy="12" r="4" fill={stroke} />
          <rect x="24" y="7" width="10" height="10" rx="1.5" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M26 5v2M29 5v2M32 5v2M26 17v2M29 17v2M32 17v2" stroke={stroke} strokeWidth="1.2" />
          <path d="M15 12h5" stroke={stroke} strokeWidth="1.2" />
        </>
      )}
      {mode === "local" && (
        <>
          <rect x="12" y="2" width="16" height="20" rx="2.5" fill="none" stroke={stroke} strokeWidth="1.5" />
          <circle cx="20" cy="8" r="3" fill={stroke} />
          <circle cx="20" cy="16" r="3" fill={stroke} opacity="0.45" />
        </>
      )}
      {mode === "online" && (
        <>
          <rect x="1" y="5" width="11" height="14" rx="2" fill="none" stroke={stroke} strokeWidth="1.5" />
          <circle cx="6.5" cy="12" r="2.6" fill={stroke} />
          <rect x="28" y="5" width="11" height="14" rx="2" fill="none" stroke={stroke} strokeWidth="1.5" />
          <circle cx="33.5" cy="12" r="2.6" fill={stroke} opacity="0.45" />
          <path d="M14 12h12" stroke={stroke} strokeWidth="1.2" strokeDasharray="2 2.5" />
        </>
      )}
    </svg>
  );
}

/** The longest and the fattest pen in the box; the drawing scale comes from these. */
const MAX_HALF_LEN = Math.max(...PEN_TYPES.map((p) => p.halfLen));
const MAX_RADIUS = Math.max(...PEN_TYPES.map((p) => p.radius));

/**
 * A pen drawn at true scale, in centimetres, from the same numbers the 3D
 * build and the physics use — so the catalogue page itself shows you that the
 * pencil really is the longest and the highlighter really is the fattest.
 *
 * The vertical gradient is what sells the cylinder: dark at both edges, bright
 * just above the middle where the lamp would catch it.
 */
function PenDrawing({ pen, className }: { pen: PenType; className?: string }) {
  const PAD = 0.5;
  const W = MAX_HALF_LEN * 2 + PAD * 2;
  const H = MAX_RADIUS * 2 + PAD * 2;
  const cy = H / 2;
  const r = pen.radius;
  const len = pen.halfLen * 2;
  const x0 = PAD;
  const id = `pd-${pen.id}`;
  const { body, accent, tip } = pen.colors;
  const metal = pen.finish.metalness > 0.6;
  const hex = pen.shape === "pencil";
  const chisel = pen.shape === "marker" || pen.shape === "highlighter";

  const tipLen = chisel ? 0.9 : 1.6;
  const tipX = x0 + len - tipLen;
  const capW = Math.min(len * 0.28, 3.2);
  const round = hex ? 0 : r;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity={metal ? 0.5 : 0.36} />
          <stop offset="26%" stopColor="#fff" stopOpacity={metal ? 0.8 : 0.45} />
          <stop offset="50%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity={metal ? 0.55 : 0.45} />
        </linearGradient>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity="0.32" />
          <stop offset="30%" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="58%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.42" />
        </linearGradient>
      </defs>

      {/* Contact shadow: the pen is lying on the page, not floating over it. */}
      <ellipse cx={x0 + len / 2} cy={cy + r + 0.24} rx={len / 2} ry={0.16} fill="#16233f" opacity="0.16" />

      <rect x={x0} y={cy - r} width={len - tipLen} height={r * 2} rx={round} fill={body} />
      <rect x={x0} y={cy - r} width={len - tipLen} height={r * 2} rx={round} fill={`url(#${id}-b)`} />

      <rect x={x0} y={cy - r} width={capW} height={r * 2} rx={round} fill={accent} />
      <rect x={x0} y={cy - r} width={capW} height={r * 2} rx={round} fill={`url(#${id}-a)`} />

      {chisel ? (
        <>
          <rect x={tipX} y={cy - r * 0.55} width={tipLen} height={r * 1.1} rx={0.15} fill={tip} />
          <rect x={tipX} y={cy - r * 0.55} width={tipLen} height={r * 1.1} rx={0.15} fill={`url(#${id}-a)`} />
        </>
      ) : (
        <>
          <path d={`M${tipX} ${cy - r} L${x0 + len} ${cy} L${tipX} ${cy + r} Z`} fill={tip} />
          <path d={`M${tipX} ${cy - r} L${x0 + len} ${cy} L${tipX} ${cy + r} Z`} fill={`url(#${id}-a)`} />
        </>
      )}

      {hex && <path d={`M${x0 + len - 0.55} ${cy - 0.16} L${x0 + len} ${cy} L${x0 + len - 0.55} ${cy + 0.16} Z`} fill="#2b2b2b" />}

      {(pen.shape === "ballpoint" || pen.shape === "gel" || pen.shape === "jotter" || pen.shape === "fountain") && (
        <rect x={x0 + 0.8} y={cy - r - 0.26} width={capW * 0.85} height={0.28} rx={0.14} fill={metal ? "#e5e7eb" : accent} />
      )}
    </svg>
  );
}

function PenEntry({ pen, side, onPick }: { pen: PenType; side: Side; onPick: () => void }) {
  const st = penStats(pen);
  // Reach and bounce are in the drawing and the physics; the three that change
  // how a flick feels are the three worth printing.
  const rows: [string, number][] = [
    ["Weight", st.weight],
    ["Speed", st.speed],
    ["Grip", st.grip],
  ];
  const cm = (pen.halfLen * 2).toFixed(1).replace(/\.0$/, "");
  const grams = Math.round(pen.mass * 6);

  return (
    <button
      type="button"
      onClick={onPick}
      className="pf-entry"
      style={{ "--pf-pen": SIDE_COLORS[side] } as React.CSSProperties}
    >
      <PenDrawing pen={pen} className="pf-entry-draw" />
      <span>
        <span className="pf-entry-head">
          <span className="pf-entry-name">{pen.name}</span>
          <span className="pf-entry-spec">
            {cm} cm · {grams} g
          </span>
        </span>
        <span className="pf-entry-tagline">{pen.tagline}</span>
        <span className="mt-1.5 flex flex-col items-start gap-1">
          <span className="pf-stats">
            {rows.map(([name, v]) => (
              <span key={name} className="pf-stat">
                <span className="pf-stat-name">{name}</span>
                <span className="flex gap-[2px]">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={i <= v ? "pf-pip pf-pip--on" : "pf-pip"} />
                  ))}
                </span>
              </span>
            ))}
          </span>
          <span className="pf-take">Take this one</span>
        </span>
      </span>
    </button>
  );
}
