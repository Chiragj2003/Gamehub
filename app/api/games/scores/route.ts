import { NextResponse } from "next/server";
import { queryLeaderboard, insertSessionScore, updateSessionScoreAndPlayer } from "@/lib/games";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameIdStr = searchParams.get("gameId");
    const slug = searchParams.get("slug") || undefined;

    if (!gameIdStr) {
      return NextResponse.json({ error: "Missing gameId parameter" }, { status: 400 });
    }

    const gameId = parseInt(gameIdStr, 10);
    const topScores = await queryLeaderboard(gameId, slug);

    return NextResponse.json(topScores);
  } catch (error) {
    console.error("API GET scores error:", error);
    return NextResponse.json({ error: "Failed to query scores" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, score, playerName, sessionId } = body;

    if (!gameId || score === undefined || !playerName) {
      return NextResponse.json({ error: "Missing required fields (gameId, score, playerName)" }, { status: 400 });
    }

    // Try to update existing session analytics score first, or insert new score
    let success = false;
    if (sessionId) {
      success = await updateSessionScoreAndPlayer(sessionId, score, playerName);
    }
    
    if (!success) {
      success = await insertSessionScore(gameId, score, playerName, sessionId);
    }

    return NextResponse.json({ success });
  } catch (error) {
    console.error("API POST score error:", error);
    return NextResponse.json({ error: "Failed to submit score" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
