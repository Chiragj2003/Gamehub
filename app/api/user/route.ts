import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { deleteProfile } from "@/lib/profile";
import { isClerkConfigured } from "@/lib/clerk";
import { rateLimiter, getClientKey } from "@/lib/rate-limit";

/**
 * The signed-in user's account.
 *
 * DELETE removes the player's own data — their tag and their saved library —
 * and then the Clerk account itself. Leaderboard entries are deliberately left
 * behind: they are a name and a score, not personal data, and removing them
 * would punch holes in everyone else's rankings.
 *
 * Identity comes from Clerk; the body must carry the literal confirmation so a
 * stray request cannot delete an account.
 */
export async function DELETE(request: Request) {
  try {
    const limit = await rateLimiter.check("score", getClientKey(request));
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }

    if (!isClerkConfigured) {
      return NextResponse.json({ error: "Accounts are not enabled on this deployment." }, { status: 503 });
    }

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Sign in to manage your account" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    if (body?.confirm !== "DELETE") {
      return NextResponse.json({ error: "Confirmation missing" }, { status: 400 });
    }

    // Player rows first: if deleting the Clerk user succeeded and this failed,
    // the rows would be orphaned with no account left to clean them up.
    await deleteProfile(userId);

    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/user error:", error);
    return NextResponse.json({ error: "Could not delete the account. Please try again." }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
