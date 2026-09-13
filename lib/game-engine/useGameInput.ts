"use client";

import { useEffect, useRef } from "react";
import { useLatest } from "./useLatest";

/**
 * Unified input for canvas games: keyboard, touch swipes, and virtual buttons
 * all resolve to the same small set of logical actions, so a game reads one
 * API and works on desktop and mobile without branching.
 */

export type GameAction =
  | "up"
  | "down"
  | "left"
  | "right"
  | "primary"
  | "secondary"
  | "pause";

const KEY_MAP: Record<string, GameAction> = {
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
  " ": "primary",
  enter: "primary",
  shift: "secondary",
  p: "pause",
  escape: "pause",
};

/** Keys the browser would otherwise scroll or activate with. */
const SWALLOWED = new Set([
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  " ",
]);

/** Minimum travel in px before a touch drag counts as a swipe. */
const SWIPE_THRESHOLD = 30;

export interface GameInput {
  /** True while the action is held. */
  isDown: (action: GameAction) => boolean;
  /**
   * True once per discrete press, then false until released and pressed again.
   * Use for rotate, jump, hard drop — anything that must not auto-repeat.
   */
  consumePress: (action: GameAction) => boolean;
  /**
   * Oldest unconsumed direction, removed from the queue.
   * Grid games (Snake, Pac-Man) need this: pressing up-then-left faster than
   * one tick must register both turns in order, not just the last one.
   */
  shiftDirection: () => GameAction | null;
  /** Latest pointer/touch position in canvas pixels, or null if untouched. */
  pointer: () => { x: number; y: number } | null;
  /**
   * Raw key state by lowercase `event.key`.
   * Needed where two players share a keyboard and WASD must be distinguishable
   * from the arrow keys, which both map to the same logical actions.
   */
  isKeyDown: (key: string) => boolean;
  /**
   * True once per discrete press of a raw key, counted so a tap that lands
   * between two ticks is not lost. Use for one-shot keys outside the logical
   * action set (hold, alternate rotate).
   */
  consumeKey: (key: string) => boolean;
  clear: () => void;
}

export interface GameInputOptions {
  /** Element that receives touch events, normally the game canvas. */
  target?: React.RefObject<HTMLElement | null>;
  /** Queue directional presses for grid-stepped games. Default true. */
  queueDirections?: boolean;
  /** Emit a direction per swipe gesture on touch devices. Default true. */
  enableSwipe?: boolean;
  /** Fires on a tap that was not a swipe — jump, flap, shoot. */
  onTap?: (x: number, y: number) => void;
  /** Fires when the pause action is pressed. */
  onPause?: () => void;
  /**
   * Fires once per discrete press or swipe, for turn-based games that react
   * to events rather than polling inside a loop (2048, board games).
   */
  onAction?: (action: GameAction) => void;
}

export function useGameInput(options: GameInputOptions = {}) {
  const inputRef = useRef<GameInput | null>(null);
  const optionsRef = useLatest(options);

  const { target, queueDirections = true, enableSwipe = true } = options;

  useEffect(() => {
    const held = new Set<GameAction>();
    // Counted rather than a Set: two taps inside one simulation tick (possible
    // on a throttled 30fps tab) must yield two moves, not one.
    const pressed = new Map<GameAction, number>();
    const rawKeys = new Set<string>();
    const rawPressed = new Map<string, number>();
    const directionQueue: GameAction[] = [];
    let pointerPos: { x: number; y: number } | null = null;

    const pushDirection = (action: GameAction) => {
      if (!queueDirections) return;
      if (action === "up" || action === "down" || action === "left" || action === "right") {
        // Cap the queue so mashing cannot buffer a long tail of stale turns.
        if (directionQueue.length < 3) directionQueue.push(action);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (SWALLOWED.has(key)) e.preventDefault();
      if (!e.repeat && !rawKeys.has(key)) rawPressed.set(key, (rawPressed.get(key) ?? 0) + 1);
      rawKeys.add(key);

      const action = KEY_MAP[key];
      if (!action) return;

      if (action === "pause") {
        // Pause fires on the press edge only, never on auto-repeat.
        if (!e.repeat) optionsRef.current.onPause?.();
        return;
      }

      if (!held.has(action)) {
        pressed.set(action, (pressed.get(action) ?? 0) + 1);
        pushDirection(action);
        optionsRef.current.onAction?.(action);
      }
      held.add(action);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      rawKeys.delete(key);
      const action = KEY_MAP[key];
      if (action) held.delete(action);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Releasing focus mid-press would otherwise leave keys stuck down.
    const onBlur = () => {
      held.clear();
      pressed.clear();
      rawKeys.clear();
      rawPressed.clear();
    };
    window.addEventListener("blur", onBlur);

    const el = target?.current;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;

    const toCanvasCoords = (clientX: number, clientY: number) => {
      if (!el) return { x: clientX, y: clientY };
      const rect = el.getBoundingClientRect();
      const canvas = el as HTMLCanvasElement;
      // Canvas is drawn at a fixed internal resolution but displayed scaled,
      // so pointer coordinates must be mapped back into that space.
      const scaleX = (canvas.width || rect.width) / rect.width;
      const scaleY = (canvas.height || rect.height) / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      e.preventDefault();
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchMoved = false;
      pointerPos = toCanvasCoords(t.clientX, t.clientY);
      held.add("primary");
      pressed.set("primary", (pressed.get("primary") ?? 0) + 1);
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      e.preventDefault();
      pointerPos = toCanvasCoords(t.clientX, t.clientY);

      if (!enableSwipe || touchMoved) return;

      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

      // Commit to the dominant axis so a diagonal drag is unambiguous.
      const action: GameAction =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";

      held.add(action);
      pressed.set(action, (pressed.get(action) ?? 0) + 1);
      pushDirection(action);
      optionsRef.current.onAction?.(action);
      touchMoved = true;

      // A swipe is a discrete gesture; drop the held state on the next frame so
      // it does not read as a key being held down forever.
      setTimeout(() => held.delete(action), 100);
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      held.delete("primary");
      if (!touchMoved) {
        const p = pointerPos;
        if (p) optionsRef.current.onTap?.(p.x, p.y);
      }
      pointerPos = null;
    };

    const onPointerMove = (e: PointerEvent) => {
      pointerPos = toCanvasCoords(e.clientX, e.clientY);
    };

    if (el) {
      el.addEventListener("touchstart", onTouchStart, { passive: false });
      el.addEventListener("touchmove", onTouchMove, { passive: false });
      el.addEventListener("touchend", onTouchEnd, { passive: false });
      el.addEventListener("pointermove", onPointerMove);
    }

    inputRef.current = {
      isDown: (action) => held.has(action),
      consumePress: (action) => {
        const n = pressed.get(action) ?? 0;
        if (n === 0) return false;
        if (n === 1) pressed.delete(action);
        else pressed.set(action, n - 1);
        return true;
      },
      shiftDirection: () => directionQueue.shift() ?? null,
      pointer: () => pointerPos,
      isKeyDown: (key) => rawKeys.has(key.toLowerCase()),
      consumeKey: (key) => {
        const k = key.toLowerCase();
        const n = rawPressed.get(k) ?? 0;
        if (n === 0) return false;
        if (n === 1) rawPressed.delete(k);
        else rawPressed.set(k, n - 1);
        return true;
      },
      clear: () => {
        held.clear();
        pressed.clear();
        rawKeys.clear();
        rawPressed.clear();
        directionQueue.length = 0;
      },
    };

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      if (el) {
        el.removeEventListener("touchstart", onTouchStart);
        el.removeEventListener("touchmove", onTouchMove);
        el.removeEventListener("touchend", onTouchEnd);
        el.removeEventListener("pointermove", onPointerMove);
      }
      inputRef.current = null;
    };
  }, [target, queueDirections, enableSwipe, optionsRef]);

  return inputRef;
}
