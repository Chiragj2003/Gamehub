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
  /** Seconds since the session was opened, as measured by the server. */
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

  // Either arcade initials from a signed-out player or the tag on an account.
  // Letters, digits and underscores only, so the leaderboard cannot be used to
  // display markup or injected content. Case is kept: a tag is a chosen name.
  const cleaned = playerName.trim().replace(/[^A-Za-z0-9_]/g, "");
  if (cleaned.length === 0) {
    return { ok: false, reason: "Player name must contain letters or numbers" };
  }

  return { ok: true, score, playerName: cleaned.slice(0, 16) };
}
