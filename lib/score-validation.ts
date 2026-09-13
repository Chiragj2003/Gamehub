/**
 * Server-side score validation.
 *
 * The submit endpoint is public, so without these checks anyone can POST an
 * arbitrary score and permanently own every leaderboard. None of this makes
 * cheating impossible — a determined player can still drive the real game with
 * a script — but it removes the trivial `curl` attack and bounds the damage.
 */

/** Per-game ceilings, set well above realistic human play but far below Number.MAX. */
const SCORE_CEILINGS: Record<string, number> = {
  snake: 5_000,
  pong: 1_600,
  tetris: 500_000,
  "flappy-bird": 1_000,
  breakout: 20_000,
  asteroids: 100_000,
  "space-invaders": 50_000,
  pacman: 100_000,
  "memory-match": 10_000,
  "connect-four": 5_000,
  "tic-tac-toe": 1_000,
  "2048": 200_000,
  hangman: 5_000,
  "rock-paper-scissors": 2_000,
  dino: 50_000,
  "typing-test": 300,
  balance: 50_000,
  maze: 50_000,
  "neon-snake": 50_000,
  "space-defender": 200_000,
  "memory-matrix": 100_000,
};

const DEFAULT_CEILING = 100_000;

/**
 * Highest plausible points per second of play, per game.
 * A 400-point Snake run cannot happen in four seconds; this catches scores that
 * are individually under the ceiling but impossible for the time elapsed.
 */
const MAX_RATE: Record<string, number> = {
  snake: 12,
  tetris: 900,
  "2048": 600,
  "typing-test": 4,
};

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

  const ceiling = slug ? (SCORE_CEILINGS[slug] ?? DEFAULT_CEILING) : DEFAULT_CEILING;
  if (score > ceiling) {
    return { ok: false, reason: "Score exceeds the maximum possible for this game" };
  }

  // Reject scores that outpace what the elapsed play time allows. A 2s grace
  // period keeps legitimate fast finishes (Tic Tac Toe, RPS) from tripping it.
  if (typeof durationSeconds === "number" && durationSeconds >= 0) {
    const rate = slug ? (MAX_RATE[slug] ?? DEFAULT_MAX_RATE) : DEFAULT_MAX_RATE;
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
