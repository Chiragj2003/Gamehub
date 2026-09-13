"use client";

import React, { useEffect, useRef, useState } from "react";
import { GameProps } from "./types";
import { joinRoom, makeRoomCode, normalizeRoomCode, type Role, type Room } from "@/lib/realtime";
import {
  useGameLoop,
  useGameInput,
  useGameCanvas,
  useLatest,
  drawPauseOverlay,
  drawGameOverFlash,
} from "@/lib/game-engine";

const WIDTH = 800;
const HEIGHT = 600;

const PAD_W = 12;
const PAD_H = 80;
const PAD_INSET = 10;
/** Pixels per second — every speed below is per second, not per frame. */
const PADDLE_SPEED = 420;
const AI_SPEED = 330;

const BALL_RADIUS = 8;
const BALL_START_SPEED = 330;
/** Hard ceiling: above this the ball outruns any human reaction time. */
const BALL_MAX_SPEED = 780;
const BALL_SPEEDUP = 1.04;

const WIN_SCORE = 11;

type Mode = "ai" | "two-player" | "online";

/** What the host streams to the guest, ~30 times a second. */
interface NetState {
  bx: number;
  by: number;
  p1y: number;
  p2y: number;
  p1score: number;
  p2score: number;
  serveDelay: number;
  over: boolean;
}

/** What the guest streams to the host: just its paddle. */
interface NetInput {
  y: number;
}

const NET_SEND_HZ = 30;

function initialState() {
  return {
    p1y: (HEIGHT - PAD_H) / 2,
    p2y: (HEIGHT - PAD_H) / 2,
    bx: WIDTH / 2,
    by: HEIGHT / 2,
    bvx: BALL_START_SPEED,
    bvy: 0,
    p1score: 0,
    p2score: 0,
    aiError: 0,
    /** Countdown before the ball launches, so a point does not start instantly. */
    serveDelay: 1.2,
    over: false,
    paused: false,
    reported: false,
    /** Guest-side: the latest host snapshot, eased toward each frame. */
    remote: null as NetState | null,
    /** Host-side: the guest's most recent paddle position. */
    guestY: (HEIGHT - PAD_H) / 2,
    netTimer: 0,
  };
}

type OnlinePhase = "idle" | "connecting" | "waiting" | "playing" | "ended";

export const ClassicPong: React.FC<GameProps> = ({ onGameOver }) => {
  const { canvasRef, ctxRef } = useGameCanvas(WIDTH, HEIGHT);
  const stateRef = useRef(initialState());
  const [mode, setMode] = useState<Mode>("ai");
  const modeRef = useLatest(mode);
  const onGameOverRef = useLatest(onGameOver);

  const [phase, setPhase] = useState<OnlinePhase>("idle");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [netError, setNetError] = useState<string | null>(null);
  const roomRef = useRef<Room<NetState, NetInput> | null>(null);
  const roleRef = useRef<Role>("host");
  const phaseRef = useLatest(phase);

  const leaveRoom = () => {
    roomRef.current?.leave();
    roomRef.current = null;
    setPhase("idle");
    setRoomCode("");
    setNetError(null);
  };

  useEffect(() => () => roomRef.current?.leave(), []);

  const connect = async (role: Role, code: string) => {
    setNetError(null);
    setPhase("connecting");
    roleRef.current = role;
    stateRef.current = initialState();
    try {
      const room = await joinRoom<NetState, NetInput>("pong", code, role, {
        onPeerJoin: () => {
          setPhase("playing");
          if (role === "host") {
            const s = stateRef.current;
            serve(s, Math.random() < 0.5 ? 1 : -1);
          }
        },
        onPeerLeave: () => {
          if (phaseRef.current === "playing") {
            setNetError("Your opponent left the match.");
            setPhase("ended");
          }
        },
        onState: (state) => {
          stateRef.current.remote = state;
        },
        onInput: (input) => {
          stateRef.current.guestY = input.y;
        },
        onError: (message) => setNetError(message),
      });
      roomRef.current = room;
      setRoomCode(code);
      setPhase("waiting");
    } catch (e) {
      setNetError(e instanceof Error ? e.message : "Could not connect");
      setPhase("idle");
    }
  };

  const input = useGameInput({
    target: canvasRef,
    queueDirections: false,
    onPause: () => {
      const s = stateRef.current;
      if (!s.over) s.paused = !s.paused;
    },
  });

  const serve = (s: ReturnType<typeof initialState>, direction: number) => {
    s.bx = WIDTH / 2;
    s.by = HEIGHT / 2;
    s.bvx = direction * BALL_START_SPEED;
    s.bvy = (Math.random() - 0.5) * BALL_START_SPEED * 0.6;
    s.serveDelay = 1.2;
    // Re-roll the AI's aim error each point so it is not perfectly predictable.
    s.aiError = (Math.random() - 0.5) * 46;
  };

  /**
   * Swept paddle collision.
   *
   * The old version tested the ball's centre against a fixed band each frame.
   * Once the ball got fast enough it jumped the whole paddle between frames and
   * passed straight through. Checking whether the ball *crossed* the paddle
   * plane during this step catches it at any speed.
   */
  const collide = (
    s: ReturnType<typeof initialState>,
    prevX: number,
    prevY: number,
    planeX: number,
    paddleY: number,
    movingLeft: boolean
  ): boolean => {
    const edge = movingLeft ? prevX - BALL_RADIUS : prevX + BALL_RADIUS;
    const nowEdge = movingLeft ? s.bx - BALL_RADIUS : s.bx + BALL_RADIUS;

    const crossed = movingLeft
      ? edge >= planeX && nowEdge <= planeX
      : edge <= planeX && nowEdge >= planeX;
    if (!crossed) return false;

    // Interpolate the ball's Y at the exact moment it reached the paddle plane,
    // rather than using its end-of-step position, which on a fast shot can be
    // well past the paddle.
    const span = edge - nowEdge;
    const t = span === 0 ? 0 : (edge - planeX) / span;
    const contactY = prevY + (s.by - prevY) * t;

    // Use the ball's extent, not just its centre, so edge hits still count.
    if (contactY + BALL_RADIUS < paddleY || contactY - BALL_RADIUS > paddleY + PAD_H) {
      return false;
    }

    const speed = Math.min(Math.hypot(s.bvx, s.bvy) * BALL_SPEEDUP, BALL_MAX_SPEED);
    // Where the ball struck the paddle sets the bounce angle, capped at 60°
    // so a rally can never devolve into a nearly vertical, unreturnable shot.
    const offset = (contactY - (paddleY + PAD_H / 2)) / (PAD_H / 2);
    const angle = Math.max(-1, Math.min(1, offset)) * (Math.PI / 3);

    s.bvx = (movingLeft ? 1 : -1) * speed * Math.cos(angle);
    s.bvy = speed * Math.sin(angle);
    s.bx = movingLeft ? planeX + BALL_RADIUS : planeX - BALL_RADIUS;
    return true;
  };

  useGameLoop({
    step: 1000 / 120, // finer step keeps fast-ball collision precise
    update: (dt) => {
      const s = stateRef.current;
      const io = input.current;
      // Report once, on the first tick after the match ended. Sits above every
      // early return so no code path can skip it. Points won plus a win bonus,
      // scored from whichever paddle is yours.
      if (s.over && !s.reported) {
        s.reported = true;
        const mine = modeRef.current === "online" && roleRef.current === "guest" ? s.p2score : s.p1score;
        const final = mine * 100 + (mine >= WIN_SCORE ? 500 : 0);
        setTimeout(() => onGameOverRef.current(final), 1200);
      }
      if (!io || s.over || s.paused) return;

      const online = modeRef.current === "online";
      if (online && phaseRef.current !== "playing") return;

      // Online guest: drive only the right paddle, stream it to the host, and
      // ease the rest of the world toward the host's latest snapshot.
      if (online && roleRef.current === "guest") {
        const p = io.pointer();
        if (io.isDown("up")) s.p2y -= PADDLE_SPEED * dt;
        if (io.isDown("down")) s.p2y += PADDLE_SPEED * dt;
        if (p && io.isDown("primary")) s.p2y = p.y - PAD_H / 2;
        s.p2y = Math.max(0, Math.min(HEIGHT - PAD_H, s.p2y));

        s.netTimer += dt;
        if (s.netTimer >= 1 / NET_SEND_HZ) {
          s.netTimer = 0;
          roomRef.current?.sendInput({ y: s.p2y });
        }

        const r = s.remote;
        if (r) {
          // Exponential ease: hides the 30Hz step without adding much lag.
          const k = 1 - Math.pow(0.001, dt);
          s.bx += (r.bx - s.bx) * k;
          s.by += (r.by - s.by) * k;
          s.p1y += (r.p1y - s.p1y) * k;
          s.p1score = r.p1score;
          s.p2score = r.p2score;
          s.serveDelay = r.serveDelay;
          if (r.over && !s.over) s.over = true;
        }
        return;
      }

      const twoPlayer = modeRef.current === "two-player";

      // Player 1 — W/S in two-player mode, either scheme against the CPU.
      const p1Up = twoPlayer ? io.isKeyDown("w") : io.isDown("up");
      const p1Down = twoPlayer ? io.isKeyDown("s") : io.isDown("down");
      if (p1Up) s.p1y -= PADDLE_SPEED * dt;
      if (p1Down) s.p1y += PADDLE_SPEED * dt;
      s.p1y = Math.max(0, Math.min(HEIGHT - PAD_H, s.p1y));

      if (online) {
        // Online host: the right paddle is wherever the guest last said it was.
        s.p2y = Math.max(0, Math.min(HEIGHT - PAD_H, s.guestY));
      } else if (twoPlayer) {
        // Player 2 — arrow keys, or drag on the right half of a touchscreen.
        if (io.isKeyDown("arrowup")) s.p2y -= PADDLE_SPEED * dt;
        if (io.isKeyDown("arrowdown")) s.p2y += PADDLE_SPEED * dt;
        const p = io.pointer();
        if (p && p.x > WIDTH / 2) s.p2y = p.y - PAD_H / 2;
        s.p2y = Math.max(0, Math.min(HEIGHT - PAD_H, s.p2y));
      } else {
        // AI tracks the ball only while it is approaching, which is what makes
        // it beatable — it cannot pre-position during the return leg.
        if (s.bvx > 0) {
          const target = s.by + s.aiError - PAD_H / 2;
          const delta = target - s.p2y;
          const move = AI_SPEED * dt;
          s.p2y += Math.abs(delta) < move ? delta : Math.sign(delta) * move;
        }
        s.p2y = Math.max(0, Math.min(HEIGHT - PAD_H, s.p2y));
      }

      if (s.serveDelay > 0) {
        s.serveDelay -= dt;
        return;
      }

      const prevX = s.bx;
      const prevY = s.by;
      s.bx += s.bvx * dt;
      s.by += s.bvy * dt;

      if (s.by - BALL_RADIUS <= 0) {
        s.by = BALL_RADIUS;
        s.bvy = Math.abs(s.bvy);
      } else if (s.by + BALL_RADIUS >= HEIGHT) {
        s.by = HEIGHT - BALL_RADIUS;
        s.bvy = -Math.abs(s.bvy);
      }

      if (s.bvx < 0) {
        collide(s, prevX, prevY, PAD_INSET + PAD_W, s.p1y, true);
      } else {
        collide(s, prevX, prevY, WIDTH - PAD_INSET - PAD_W, s.p2y, false);
      }

      if (s.bx + BALL_RADIUS < 0) {
        s.p2score++;
        if (s.p2score >= WIN_SCORE) s.over = true;
        else serve(s, 1);
      } else if (s.bx - BALL_RADIUS > WIDTH) {
        s.p1score++;
        if (s.p1score >= WIN_SCORE) s.over = true;
        else serve(s, -1);
      }

      if (online) {
        s.netTimer += dt;
        if (s.netTimer >= 1 / NET_SEND_HZ || s.over) {
          s.netTimer = 0;
          roomRef.current?.sendState({
            bx: s.bx,
            by: s.by,
            p1y: s.p1y,
            p2y: s.p2y,
            p1score: s.p1score,
            p2score: s.p2score,
            serveDelay: s.serveDelay,
            over: s.over,
          });
        }
      }

    },

    render: () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      const s = stateRef.current;

      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 4;
      ctx.setLineDash([15, 15]);
      ctx.beginPath();
      ctx.moveTo(WIDTH / 2, 0);
      ctx.lineTo(WIDTH / 2, HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = "bold 48px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.textAlign = "center";
      ctx.fillText(String(s.p1score), WIDTH / 4, 80);
      ctx.fillText(String(s.p2score), (3 * WIDTH) / 4, 80);

      ctx.fillStyle = "#06b6d4";
      ctx.fillRect(PAD_INSET, s.p1y, PAD_W, PAD_H);
      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(WIDTH - PAD_INSET - PAD_W, s.p2y, PAD_W, PAD_H);

      if (s.serveDelay <= 0) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s.bx, s.by, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "bold 20px system-ui, sans-serif";
        ctx.fillText(
          `First to ${WIN_SCORE}`,
          WIDTH / 2,
          HEIGHT / 2 + 100
        );
      }

      if (s.paused) drawPauseOverlay(ctx, WIDTH, HEIGHT);
      if (s.over) {
        drawGameOverFlash(ctx, WIDTH, HEIGHT);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 44px system-ui, sans-serif";
        ctx.textAlign = "center";
        const mine = modeRef.current === "online" && roleRef.current === "guest" ? s.p2score : s.p1score;
        const label =
          modeRef.current === "two-player"
            ? s.p1score >= WIN_SCORE
              ? "LEFT WINS"
              : "RIGHT WINS"
            : mine >= WIN_SCORE
              ? "YOU WIN"
              : "YOU LOSE";
        ctx.fillText(label, WIDTH / 2, HEIGHT / 2);
      }
    },
  });

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none bg-zinc-950"
        aria-label="Pong game"
      />
      <div className="absolute left-1/2 top-3 flex -translate-x-1/2 gap-1 rounded-full border border-white/10 bg-black/60 p-1 backdrop-blur">
        {(["ai", "two-player", "online"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              leaveRoom();
              stateRef.current = initialState();
              setMode(m);
            }}
            className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              mode === m ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            {m === "ai" ? "vs CPU" : m === "two-player" ? "2 Player" : "Online"}
          </button>
        ))}
      </div>

      {mode === "online" && phase !== "playing" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/85 p-6 backdrop-blur-sm">
          <div className="w-full max-w-xs space-y-4 rounded-2xl border border-white/10 bg-zinc-900/80 p-6 text-center">
            {phase === "idle" && (
              <>
                <h3 className="text-lg font-black uppercase tracking-tight text-white">Play a friend online</h3>
                <p className="text-xs text-zinc-400">
                  Create a room and share the code, or enter a code you were given.
                </p>
                <button
                  onClick={() => connect("host", makeRoomCode())}
                  className="h-10 w-full cursor-pointer rounded-full bg-white text-xs font-bold uppercase tracking-wider text-black transition-opacity hover:opacity-90"
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
                    className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-zinc-950 px-4 text-center font-mono text-sm font-bold uppercase tracking-[0.3em] text-white focus:border-white/30 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={joinCode.length !== 4}
                    className="h-10 cursor-pointer rounded-full border border-white/15 px-4 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Join
                  </button>
                </form>
              </>
            )}
            {phase === "connecting" && <p className="text-sm font-semibold text-zinc-300">Connecting…</p>}
            {phase === "waiting" && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Room code</p>
                <p className="font-mono text-4xl font-black tracking-[0.3em] text-white">{roomCode}</p>
                <p className="text-xs text-zinc-400">Share this code. The match starts when they join.</p>
                <button
                  onClick={leaveRoom}
                  className="cursor-pointer text-[11px] font-semibold text-zinc-500 hover:text-white"
                >
                  Cancel
                </button>
              </>
            )}
            {phase === "ended" && (
              <>
                <p className="text-sm font-semibold text-zinc-300">{netError ?? "Match over"}</p>
                <button
                  onClick={leaveRoom}
                  className="h-10 w-full cursor-pointer rounded-full bg-white text-xs font-bold uppercase tracking-wider text-black"
                >
                  Back
                </button>
              </>
            )}
            {netError && phase === "idle" && (
              <p role="alert" className="text-[11px] font-medium text-rose-300">
                {netError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
