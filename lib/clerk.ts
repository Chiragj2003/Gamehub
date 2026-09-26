/**
 * Whether accounts are switched on.
 *
 * Clerk throws if it is mounted without a publishable key, which would take
 * every page of the site down rather than just the parts that need an account.
 * The site is designed to be fully playable signed out — games, local scores
 * and the on-device library all work — so auth is treated as an optional
 * capability: when the key is absent the provider, the proxy and the auth UI
 * all stand down, and the moment it is set they come up.
 *
 * NEXT_PUBLIC_ vars are inlined at build time, so this is safe on both sides.
 */
export const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

export const isClerkConfigured = CLERK_PUBLISHABLE_KEY.length > 0;

/** Player tags: what a person is called on the leaderboards. */
export const TAG_MIN = 3;
export const TAG_MAX = 16;

/**
 * Letters, digits, underscore. No spaces or punctuation, so a tag reads the
 * same everywhere it is shown and cannot be used to smuggle markup into a
 * leaderboard row.
 */
const TAG_PATTERN = /^[A-Za-z0-9_]+$/;

/** Words that would let someone pose as the site or as another player. */
const RESERVED = new Set(["admin", "administrator", "moderator", "gamehub", "system", "support", "official", "staff", "root", "null", "undefined", "anonymous", "guest", "you", "cpu"]);

export type TagCheck = { ok: true; tag: string } | { ok: false; reason: string };

/**
 * Validate and normalise a player tag.
 *
 * Returns the tag as typed — case is the player's to choose — while
 * uniqueness is enforced case-insensitively in the database, so `Chirag` and
 * `chirag` cannot both exist.
 */
export function checkTag(raw: unknown): TagCheck {
  if (typeof raw !== "string") return { ok: false, reason: "Enter a tag." };
  const tag = raw.trim();
  if (tag.length === 0) return { ok: false, reason: "Enter a tag." };
  if (tag.length < TAG_MIN) return { ok: false, reason: `At least ${TAG_MIN} characters.` };
  if (tag.length > TAG_MAX) return { ok: false, reason: `At most ${TAG_MAX} characters.` };
  if (!TAG_PATTERN.test(tag)) return { ok: false, reason: "Letters, numbers and underscores only." };
  if (RESERVED.has(tag.toLowerCase())) return { ok: false, reason: "That tag is reserved. Pick another." };
  return { ok: true, tag };
}
