import { NextResponse } from "next/server";
import { getAllGames } from "@/lib/games";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const difficulty = searchParams.get("difficulty");

    let list = await getAllGames();

    if (category) {
      list = list.filter(g => g.category.toLowerCase() === category.toLowerCase());
    }
    if (difficulty) {
      list = list.filter(g => g.difficulty.toLowerCase() === difficulty.toLowerCase());
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error("GET /api/games error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
