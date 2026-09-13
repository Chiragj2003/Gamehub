/**
 * Server-side score validation.
 *
 * The submit endpoint is public, so without these checks anyone can POST an
 * arbitrary score and permanently own every leaderboard. None of this makes
 * cheating impossible — a determined player can still drive the real game with
 * a script — but it removes the trivial `curl` attack and bounds the damage.
 */

import { getCatalogGame } from "./catalog";

/** Used when a submission names a slug the catalog does not know. */
const DEFAULT_CEILING = 100_000;
const DEFAULT_MAX_RATE = 2_000;

export interface ScoreSubmission {
  gameId: number;
  score: number;
  playerName: string;
  slug?: string;
  sessionId?: string;
  durationSeconds?: number;
}

export type ValidationResult =
  | { ok: true; score: number; playerName: string }
  | { ok: false; reason: string };

export function validateScore(input: ScoreSubmission): ValidationResult {
  const { gameId, score, playerName, slug, durationSeconds } = input;

  if (!Number.isInteger(gameId) || gameId <= 0) {
    return { ok: false, reason: "Invalid gameId" };
  }

  if (typeof score !== "number" || !Number.isFinite(score)) {
    return { ok: false, reason: "Score must be a finite number" };
  }

  if (!Number.isInteger(score) || score < 0) {
    return { ok: false, reason: "Score must be a non-negative integer" };
  }

  const game = slug ? getCatalogGame(slug) : undefined;
  const ceiling = game?.maxScore ?? DEFAULT_CEILING;
  if (score > ceiling) {
    return { ok: false, reason: "Score exceeds the maximum possible for this game" };
  }

  // Reject scores that outpace what the elapsed play time allows. A 2s grace
  // period keeps legitimate fast finishes (a quick Pong loss, an early Flappy death) from tripping it.
  if (typeof durationSeconds === "number" && durationSeconds >= 0) {
    const rate = game?.maxRate ?? DEFAULT_MAX_RATE;
    if (score > rate * (durationSeconds + 2)) {
      return { ok: false, reason: "Score is not achievable in the time played" };
    }
  }

  if (typeof playerName !== "string") {
    return { ok: false, reason: "Player name is required" };
  }

  // Arcade-style initials: letters and digits only, so the leaderboard cannot
  // be used to display slurs, markup, or injected content.
  const cleaned = playerName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length === 0) {
    return { ok: false, reason: "Player name must contain letters or numbers" };
  }

  return { ok: true, score, playerName: cleaned.slice(0, 3) };
}

/**
 * Fixed-window rate limiter, keyed per client.
 *
 * In-memory, so it resets on redeploy and is per-instance rather than global —
 * enough to stop casual scripted spam. Move this to Postgres or Upstash Redis
 * when the site runs on more than one instance.
 */
const submissions = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

export function checkRateLimit(key: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = submissions.get(key);

  if (!entry || now > entry.resetAt) {
    submissions.set(key, { count: 1, resetAt: now + WINDOW_MS });

    // Opportunistic cleanup; the map would otherwise grow with every new client.
    if (submissions.size > 5_000) {
      for (const [k, v] of submissions) {
        if (now > v.resetAt) submissions.delete(k);
      }
    }
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= MAX_PER_WINDOW) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

/** Best-effort client identity from proxy headers, for rate-limit keying. */
export function getClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
