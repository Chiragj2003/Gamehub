import "server-only";

import { adminClient } from "./supabase/admin";
import { checkTag } from "./clerk";

/**
 * Player profiles: the tag a person is known by on the leaderboards.
 *
 * Every function here runs with the service-role key and takes the Clerk user
 * id from the caller, never from a request body — the route handler asks Clerk
 * who is signed in and passes that down, so nobody can rename anyone else.
 */

const TABLE = "player_profiles";

/** Postgres unique-violation. The race between two players is settled here. */
const UNIQUE_VIOLATION = "23505";

export type SetTagResult =
  | { ok: true; tag: string }
  | { ok: false; reason: string; status: number };

export async function getTag(userId: string): Promise<string | null> {
  const db = adminClient();
  if (!db) return null;
  const { data, error } = await db.from(TABLE).select("tag").eq("user_id", userId).maybeSingle();
  if (error) {
    console.warn("getTag failed:", error.message);
    return null;
  }
  return (data?.tag as string | undefined) ?? null;
}

/**
 * Is this tag free?
 *
 * Only ever advisory: two people asking at the same moment both get `true`,
 * and the unique index is what actually decides. Used to give a straight
 * answer while someone is typing, not to gate the write.
 */
export async function isTagAvailable(tag: string, exceptUserId?: string): Promise<boolean | null> {
  const db = adminClient();
  if (!db) return null;
  const { data, error } = await db
    .from(TABLE)
    .select("user_id")
    .ilike("tag", tag)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("isTagAvailable failed:", error.message);
    return null;
  }
  if (!data) return true;
  return data.user_id === exceptUserId;
}

/** Claim or change a tag. Uniqueness is enforced by the database, not by a prior read. */
export async function setTag(userId: string, raw: unknown): Promise<SetTagResult> {
  const checked = checkTag(raw);
  if (!checked.ok) return { ok: false, reason: checked.reason, status: 400 };

  const db = adminClient();
  if (!db) {
    return {
      ok: false,
      reason: "Player tags are not enabled on this deployment. Set SUPABASE_SERVICE_ROLE_KEY.",
      status: 503,
    };
  }

  const { error } = await db
    .from(TABLE)
    .upsert(
      { user_id: userId, tag: checked.tag, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: false, reason: "That tag is taken. Try another.", status: 409 };
    }
    console.error("setTag failed:", error.message);
    return { ok: false, reason: "Could not save your tag. Try again.", status: 500 };
  }
  return { ok: true, tag: checked.tag };
}

/** Remove a player's profile row. Used when an account is deleted. */
export async function deleteProfile(userId: string): Promise<void> {
  const db = adminClient();
  if (!db) return;
  await db.from(TABLE).delete().eq("user_id", userId);
  await db.from("user_games").delete().eq("user_id", userId);
}
