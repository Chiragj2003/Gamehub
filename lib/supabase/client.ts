"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import { timeoutFetch } from "./fetch";

/**
 * The browser auth client, loaded on demand.
 *
 * `@supabase/ssr` and the gotrue client under it are ~240 KB — about a quarter
 * of everything the site ships — and nothing on a first paint needs them: the
 * game grid, the games themselves, local scores and the on-device library all
 * work signed out. Importing the library inside this function keeps it out of
 * every page's first load and fetches it only when something actually reaches
 * for auth, which for most visitors is never.
 *
 * The promise is memoised, so concurrent callers share one client and one
 * network fetch; a second call after it resolves is synchronous in all but
 * name.
 */
let client: SupabaseClient | null = null;
let loading: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> {
  if (client) return Promise.resolve(client);
  loading ??= import("@supabase/ssr").then(({ createBrowserClient }) => {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch: timeoutFetch },
    });
    return client;
  });
  return loading;
}
