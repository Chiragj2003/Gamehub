"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * A two-player room over Supabase Realtime Broadcast.
 *
 * Broadcast relays messages between the connected clients without touching
 * the database, which is what a fast-paced game needs. Presence tells each
 * side when the other arrives or leaves. There is no server authority: the
 * room's creator (the host) runs the simulation and streams state; the guest
 * streams only its own input. Good enough for a casual match between friends.
 */

export type Role = "host" | "guest";

export interface RoomEvents<State, Input> {
  onPeerJoin?: () => void;
  onPeerLeave?: () => void;
  onState?: (state: State) => void;
  onInput?: (input: Input) => void;
  onError?: (message: string) => void;
}

export interface Room<State, Input> {
  code: string;
  role: Role;
  sendState: (state: State) => void;
  sendInput: (input: Input) => void;
  leave: () => void;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion

export function makeRoomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

export async function joinRoom<State, Input>(
  game: string,
  code: string,
  role: Role,
  events: RoomEvents<State, Input>
): Promise<Room<State, Input>> {
  const supabase = createClient();
  const me = crypto.randomUUID();
  const channel = supabase.channel(`${game}:${code}`, {
    config: { broadcast: { self: false, ack: false }, presence: { key: me } },
  });

  let peerPresent = false;

  channel
    .on("broadcast", { event: "state" }, ({ payload }) => events.onState?.(payload as State))
    .on("broadcast", { event: "input" }, ({ payload }) => events.onInput?.(payload as Input))
    .on("presence", { event: "sync" }, () => {
      const others = Object.keys(channel.presenceState()).filter((k) => k !== me);
      const nowPresent = others.length > 0;
      if (nowPresent && !peerPresent) events.onPeerJoin?.();
      if (!nowPresent && peerPresent) events.onPeerLeave?.();
      peerPresent = nowPresent;
    });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out connecting to the room")), 8000);
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        // A room holds exactly two: if two are already here, refuse the third.
        const existing = Object.keys(channel.presenceState()).length;
        if (role === "guest" && existing >= 2) {
          reject(new Error("That room is full"));
          return;
        }
        await channel.track({ role, joinedAt: Date.now() });
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        reject(new Error("Could not connect to the room"));
      }
    });
  }).catch((e: Error) => {
    supabase.removeChannel(channel);
    events.onError?.(e.message);
    throw e;
  });

  return {
    code,
    role,
    sendState: (state) => {
      channel.send({ type: "broadcast", event: "state", payload: state });
    },
    sendInput: (input) => {
      channel.send({ type: "broadcast", event: "input", payload: input });
    },
    leave: () => {
      supabase.removeChannel(channel);
    },
  };
}
