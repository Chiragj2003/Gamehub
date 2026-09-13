import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";
import { timeoutFetch } from "./fetch";

/**
 * Service-role client for the few operations row-level security cannot
 * express — deleting an auth user is the main one. Server-only by import
 * guard; the key must never reach a client bundle.
 *
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is not configured so callers
 * can fail with a clear message instead of a 500.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: timeoutFetch },
  });
}
