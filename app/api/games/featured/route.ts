import { NextResponse } from "next/server";
import { getFeaturedGames } from "@/lib/games";

export async function GET() {
  try {
    const list = await getFeaturedGames();
    return NextResponse.json(list);
  } catch (error) {
    console.error("GET /api/games/featured error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
