import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queryUserLibraryIds, insertUserGame, deleteUserGame } from "@/lib/db-queries";

/**
 * The signed-in user's saved games.
 *
 * Identity comes from the Supabase session cookie, never from the request
 * body: a client cannot read or edit anyone else's library by naming them.
 */
async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function GET() {
  try {
    const userId = await currentUserId();
    if (!userId) return NextResponse.json({ error: "Sign in to sync your library" }, { status: 401 });
    const gameIds = await queryUserLibraryIds(userId);
    return NextResponse.json({ gameIds });
  } catch (error) {
    console.error("GET /api/user/library error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Save one game, or — with `gameIds` — merge a whole list (used on sign-in). */
export async function POST(request: Request) {
  try {
    const userId = await currentUserId();
    if (!userId) return NextResponse.json({ error: "Sign in to sync your library" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const ids: number[] = Array.isArray(body?.gameIds)
      ? body.gameIds.map(Number)
      : [Number(body?.gameId)];

    const valid = ids.filter((id) => Number.isInteger(id) && id > 0);
    if (valid.length === 0) return NextResponse.json({ error: "Invalid game id" }, { status: 400 });

    const results = await Promise.all(valid.map((id) => insertUserGame(userId, id)));
    if (results.some((ok) => !ok)) return NextResponse.json({ error: "Failed to save" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/user/library error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await currentUserId();
    if (!userId) return NextResponse.json({ error: "Sign in to sync your library" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const gameId = Number(body?.gameId);
    if (!Number.isInteger(gameId) || gameId <= 0) {
      return NextResponse.json({ error: "Invalid game id" }, { status: 400 });
    }

    const ok = await deleteUserGame(userId, gameId);
    if (!ok) return NextResponse.json({ error: "Failed to remove" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/user/library error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
