import { NextResponse } from "next/server";
import { queryUserLibrary, insertUserGame, deleteUserGame } from "@/lib/games";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json([]); // Return empty list for guests (handled by localStorage on client)
    }

    const savedGames = await queryUserLibrary(userId);
    return NextResponse.json(savedGames);
  } catch (error) {
    console.error("GET /api/user/library error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, userId } = body;

    if (!gameId || isNaN(parseInt(gameId, 10))) {
      return NextResponse.json({ error: "Invalid Game ID" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized / Missing User ID" }, { status: 401 });
    }

    const success = await insertUserGame(userId, parseInt(gameId, 10));
    if (!success) {
      return NextResponse.json({ error: "Failed to save game" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/user/library error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { gameId, userId } = body;

    if (!gameId || isNaN(parseInt(gameId, 10))) {
      return NextResponse.json({ error: "Invalid Game ID" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized / Missing User ID" }, { status: 401 });
    }

    const success = await deleteUserGame(userId, parseInt(gameId, 10));
    if (!success) {
      return NextResponse.json({ error: "Failed to remove game" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/user/library error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
