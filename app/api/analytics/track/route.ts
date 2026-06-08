import { NextResponse } from "next/server";
import { insertGameAnalytics } from "@/lib/games";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, sessionId, durationSeconds, completed, score } = body;

    if (!gameId || !sessionId || typeof durationSeconds !== "number") {
      return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
    }

    const parsedGameId = parseInt(gameId, 10);
    const parsedScore = score !== undefined ? parseInt(score, 10) : undefined;

    const success = await insertGameAnalytics(
      parsedGameId,
      sessionId,
      durationSeconds,
      completed === true,
      isNaN(parsedScore as number) ? undefined : parsedScore
    );

    if (!success) {
      return NextResponse.json({ error: "Failed to write analytics" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/analytics/track error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
