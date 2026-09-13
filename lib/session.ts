"use client";

/**
 * Client side of the play-session handshake.
 *
 * A session is created on the server when a run starts, and a score can only
 * be attached to a session that exists, is unclaimed, and whose server-side
 * start time makes the score plausible. The client never reports how long it
 * played; the server measures that itself.
 */

export interface PlaySession {
  sessionId: string;
  /** Wall-clock start on the server, for the on-screen timer only. */
  startedAt: number;
}

export async function createPlaySession(gameId: number): Promise<PlaySession | null> {
  try {
    const res = await fetch("/api/games/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { sessionId?: string };
    if (!data.sessionId) return null;
    return { sessionId: data.sessionId, startedAt: Date.now() };
  } catch (e) {
    console.warn("Could not create play session:", e);
    return null;
  }
}
