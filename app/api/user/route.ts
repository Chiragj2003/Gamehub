import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimiter, getClientKey } from "@/lib/rate-limit";

/**
 * The signed-in user's account.
 *
 * DELETE removes the auth user; the profile and library rows go with it via
 * ON DELETE CASCADE. Leaderboard entries are not linked to accounts (three
 * initials and a score only), so there is nothing else to remove. Identity
 * comes from the session cookie; the body must carry the literal confirmation
 * so a stray request cannot delete an account.
 */
export async function DELETE(request: Request) {
  try {
    const limit = await rateLimiter.check("score", getClientKey(request));
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }

    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return NextResponse.json({ error: "Sign in to manage your account" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    if (body?.confirm !== "DELETE") {
      return NextResponse.json({ error: "Confirmation missing" }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Account deletion is not enabled on this deployment. Set SUPABASE_SERVICE_ROLE_KEY." },
        { status: 503 }
      );
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw new Error(error.message);

    // Clear the session cookie for the now-deleted user.
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/user error:", error);
    return NextResponse.json({ error: "Could not delete the account. Please try again." }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
