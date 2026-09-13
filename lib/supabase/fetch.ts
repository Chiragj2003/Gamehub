/**
 * Resilience for every Supabase call.
 *
 * A dead or unreachable project must degrade to the built-in fallbacks in
 * well under a second, not after DNS gives up. Two layers:
 *
 *  - `timeoutFetch` aborts any single request after QUERY_TIMEOUT_MS.
 *  - `databaseBreaker` remembers a failure for BREAKER_COOLDOWN_MS and lets
 *    callers skip straight to their fallback in the meantime, so a page that
 *    runs several queries pays for the outage once, not per query.
 *
 * Both are per-instance (serverless functions do not share memory); that is
 * fine — the goal is to bound latency, not to coordinate.
 */

export const QUERY_TIMEOUT_MS = 4000;
const BREAKER_COOLDOWN_MS = 30_000;

let downUntil = 0;

export const databaseBreaker = {
  /** True while a recent failure says the database should be skipped. */
  isOpen: () => Date.now() < downUntil,
  /** Record a failure; callers fall back immediately until the cooldown ends. */
  trip: () => {
    downUntil = Date.now() + BREAKER_COOLDOWN_MS;
  },
  /** A success clears any open breaker early. */
  reset: () => {
    downUntil = 0;
  },
};

export const timeoutFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(QUERY_TIMEOUT_MS) });
