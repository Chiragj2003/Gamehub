import { NextResponse } from "next/server";
import { insertGameAnalytics, updateGameAnalyticsDuration } from "@/lib/games";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json({ error: "Missing gameId" }, { status: 400 });
    }

    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    // Log initial session event
    const logged = await insertGameAnalytics(gameId, sessionId, 0, false);

    return NextResponse.json({ sessionId, logged });
  } catch (error) {
    console.error("API POST session error:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, durationSeconds, completed } = body;

    if (!sessionId || durationSeconds === undefined || completed === undefined) {
      return NextResponse.json({ error: "Missing required fields (sessionId, durationSeconds, completed)" }, { status: 400 });
    }

    const updated = await updateGameAnalyticsDuration(sessionId, durationSeconds, completed);

    return NextResponse.json({ updated });
  } catch (error) {
    console.error("API PUT session error:", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
