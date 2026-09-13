import { NextResponse } from "next/server";
import { createGameSession } from "@/lib/db-queries";
import { rateLimiter, getClientKey } from "@/lib/rate-limit";

/**
 * Open a play session. The server issues the id and records the start time;
 * a score can later be attached only to a session created here.
 */
export async function POST(request: Request) {
  try {
    const limit = await rateLimiter.check("session", getClientKey(request));
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many sessions started. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const gameId = Number(body?.gameId);
    if (!Number.isInteger(gameId) || gameId <= 0) {
      return NextResponse.json({ error: "Invalid gameId" }, { status: 400 });
    }

    const sessionId = await createGameSession(gameId);
    if (!sessionId) {
      return NextResponse.json({ error: "Could not create session" }, { status: 503 });
    }
    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error("POST /api/games/session error:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
