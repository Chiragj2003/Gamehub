import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";
import { timeoutFetch } from "./fetch";

/**
 * The service-role client: the only way player data is read or written.
 *
 * Identity now comes from Clerk, so the database has no Supabase session to
 * derive `auth.uid()` from and row-level security cannot police per-user
 * access. Instead nothing in the browser touches these tables at all — every
 * read and write goes through a route handler that first asks Clerk who is
 * calling, then uses this client. The tables have RLS on with no policies, so
 * the anon key cannot reach them even if it leaks.
 *
 * `server-only` makes importing this from a client component a build error,
 * which is the guard that matters: this key bypasses every rule.
 */
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isAdminConfigured = serviceKey.length > 0;

let cached: SupabaseClient | null = null;

/** Null when the service-role key is unset, so callers degrade instead of throwing. */
export function adminClient(): SupabaseClient | null {
  if (!isAdminConfigured) return null;
  cached ??= createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: timeoutFetch },
  });
  return cached;
}
