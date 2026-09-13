import { NextResponse } from "next/server";
import { queryLeaderboard, insertSessionScore, updateSessionScoreAndPlayer } from "@/lib/games";
import { validateScore, checkRateLimit, getClientKey } from "@/lib/score-validation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameIdStr = searchParams.get("gameId");
    const slug = searchParams.get("slug") || undefined;

    if (!gameIdStr) {
      return NextResponse.json({ error: "Missing gameId parameter" }, { status: 400 });
    }

    const gameId = parseInt(gameIdStr, 10);
    if (!Number.isInteger(gameId) || gameId <= 0) {
      return NextResponse.json({ error: "Invalid gameId parameter" }, { status: 400 });
    }

    const topScores = await queryLeaderboard(gameId, slug);
    return NextResponse.json(topScores);
  } catch (error) {
    console.error("API GET scores error:", error);
    return NextResponse.json({ error: "Failed to query scores" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const limit = checkRateLimit(getClientKey(request));
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many score submissions. Please wait before trying again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const body = await request.json();
    const { gameId, score, playerName, slug, sessionId, durationSeconds } = body ?? {};

    const result = validateScore({
      gameId,
      score,
      playerName,
      slug,
      sessionId,
      durationSeconds,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    // Prefer updating the analytics row created when the run started: that row
    // already carries a server-recorded duration, so a score attached to it is
    // tied to a real session rather than invented by the caller.
    let success = false;
    if (sessionId) {
      success = await updateSessionScoreAndPlayer(sessionId, result.score, result.playerName);
    }

    if (!success) {
      success = await insertSessionScore(gameId, result.score, result.playerName, sessionId);
    }

    return NextResponse.json({ success });
  } catch (error) {
    console.error("API POST score error:", error);
    return NextResponse.json({ error: "Failed to submit score" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
