import { NextResponse } from "next/server";
import { queryLeaderboard, getGameSession, finalizeGameSession } from "@/lib/db-queries";
import { validateScore } from "@/lib/score-validation";
import { rateLimiter, getClientKey } from "@/lib/rate-limit";

/** Sessions older than this cannot be scored; stops replaying an old id. */
const SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = parseInt(searchParams.get("gameId") ?? "", 10);
    if (!Number.isInteger(gameId) || gameId <= 0) {
      return NextResponse.json({ error: "Invalid gameId parameter" }, { status: 400 });
    }
    const scores = await queryLeaderboard(gameId);
    return NextResponse.json(scores, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("GET /api/games/scores error:", error);
    return NextResponse.json({ error: "Failed to query scores" }, { status: 500 });
  }
}

/**
 * Attach a score to a session.
 *
 * The session must exist, be unclaimed, and be recent. Play time is taken
 * from the session's server-side start stamp, not from the request, so the
 * points-per-second check cannot be defeated by lying about duration. There
 * is deliberately no "insert without a session" fallback.
 */
export async function POST(request: Request) {
  try {
    const limit = await rateLimiter.check("score", getClientKey(request));
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many score submissions. Please wait before trying again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { gameId, score, playerName, slug, sessionId } = body ?? {};

    if (typeof sessionId !== "string" || sessionId.length < 8 || sessionId.length > 80) {
      return NextResponse.json({ error: "A play session is required to submit a score" }, { status: 400 });
    }

    const session = await getGameSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unknown play session" }, { status: 404 });
    }
    if (session.score !== null) {
      return NextResponse.json({ error: "This run has already been scored" }, { status: 409 });
    }
    if (session.gameId !== Number(gameId)) {
      return NextResponse.json({ error: "Session does not belong to this game" }, { status: 400 });
    }

    const ageMs = Date.now() - session.createdAt.getTime();
    if (ageMs > SESSION_MAX_AGE_MS) {
      return NextResponse.json({ error: "This play session has expired" }, { status: 410 });
    }
    const durationSeconds = Math.max(0, Math.round(ageMs / 1000));

    const result = validateScore({ gameId: session.gameId, score, playerName, slug, durationSeconds });
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    const ok = await finalizeGameSession(sessionId, result.score, result.playerName, durationSeconds);
    if (!ok) {
      return NextResponse.json({ error: "Could not record score; it may have been submitted already" }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/games/scores error:", error);
    return NextResponse.json({ error: "Failed to submit score" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
