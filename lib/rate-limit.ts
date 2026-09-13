import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Per-client rate limiting for the write endpoints.
 *
 * With UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN set, limits are
 * enforced in Redis and shared across every serverless instance and cold
 * start. Without them, an in-memory sliding window is used instead — good
 * enough for a single instance and for local development, but it resets on
 * every deploy and is not shared between instances.
 */

export type RateLimitScope = "score" | "session";

const LIMITS: Record<RateLimitScope, { requests: number; windowSeconds: number }> = {
  score: { requests: 10, windowSeconds: 60 },
  session: { requests: 30, windowSeconds: 60 },
};

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

interface Limiter {
  check(scope: RateLimitScope, key: string): Promise<RateLimitResult>;
}

function createUpstashLimiter(url: string, token: string): Limiter {
  const redis = new Redis({ url, token });
  const limiters = Object.fromEntries(
    (Object.keys(LIMITS) as RateLimitScope[]).map((scope) => [
      scope,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(LIMITS[scope].requests, `${LIMITS[scope].windowSeconds} s`),
        prefix: `gamehub:${scope}`,
      }),
    ])
  ) as Record<RateLimitScope, Ratelimit>;

  return {
    async check(scope, key) {
      try {
        const r = await limiters[scope].limit(key);
        return { allowed: r.success, retryAfter: Math.max(0, Math.ceil((r.reset - Date.now()) / 1000)) };
      } catch (error) {
        // Redis being down should not take the site down; fail open and log.
        console.warn("Upstash rate limit check failed; allowing request:", error);
        return { allowed: true, retryAfter: 0 };
      }
    },
  };
}

function createMemoryLimiter(): Limiter {
  const hits = new Map<string, number[]>();
  return {
    async check(scope, key) {
      const { requests, windowSeconds } = LIMITS[scope];
      const now = Date.now();
      const cutoff = now - windowSeconds * 1000;
      const bucket = `${scope}:${key}`;
      const stamps = (hits.get(bucket) ?? []).filter((t) => t > cutoff);
      if (stamps.length >= requests) {
        hits.set(bucket, stamps);
        return { allowed: false, retryAfter: Math.ceil((stamps[0] + windowSeconds * 1000 - now) / 1000) };
      }
      stamps.push(now);
      hits.set(bucket, stamps);
      // Opportunistic cleanup so the map does not grow with every new client.
      if (hits.size > 5_000) {
        for (const [k, v] of hits) {
          if (v.every((t) => t <= cutoff)) hits.delete(k);
        }
      }
      return { allowed: true, retryAfter: 0 };
    },
  };
}

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const rateLimiter: Limiter = url && token ? createUpstashLimiter(url, token) : createMemoryLimiter();

export const rateLimitBackend = url && token ? "upstash" : "memory";

/** Best-effort client identity from proxy headers. */
export function getClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
