import { NextResponse } from "next/server";
import { incrementPlayCount } from "@/lib/games";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gameId = parseInt(id, 10);

    if (isNaN(gameId)) {
      return NextResponse.json({ error: "Invalid Game ID" }, { status: 400 });
    }

    const success = await incrementPlayCount(gameId);
    if (!success) {
      return NextResponse.json({ error: "Failed to increment play count" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/games/play/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
