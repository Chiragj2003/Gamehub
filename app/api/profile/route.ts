import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTag, setTag, isTagAvailable } from "@/lib/profile";
import { isClerkConfigured } from "@/lib/clerk";
import { rateLimiter, getClientKey } from "@/lib/rate-limit";

/**
 * The signed-in player's tag.
 *
 * Identity comes from Clerk on the server, never from the request body, so a
 * caller cannot read or rename anyone else's profile.
 */

async function currentUserId(): Promise<string | null> {
  if (!isClerkConfigured) return null;
  const { userId } = await auth();
  return userId;
}

export async function GET(request: Request) {
  try {
    const userId = await currentUserId();
    if (!userId) return NextResponse.json({ error: "Sign in to see your tag" }, { status: 401 });

    // `?check=` answers "is this free?" while someone is typing.
    const wanted = new URL(request.url).searchParams.get("check");
    if (wanted) {
      const available = await isTagAvailable(wanted, userId);
      if (available === null) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
      return NextResponse.json({ tag: wanted, available });
    }

    return NextResponse.json({ tag: await getTag(userId) });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const limit = await rateLimiter.check("score", getClientKey(request));
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many changes. Please wait a moment." }, { status: 429 });
    }

    const userId = await currentUserId();
    if (!userId) return NextResponse.json({ error: "Sign in to set your tag" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const result = await setTag(userId, body?.tag);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: result.status });

    return NextResponse.json({ tag: result.tag });
  } catch (error) {
    console.error("PUT /api/profile error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
