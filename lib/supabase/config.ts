/**
 * Supabase connection settings, resolved once for every client type.
 *
 * The anon key is a publishable key: it is shipped to every browser by design
 * and row-level security is what protects the data.
 *
 * When the env vars are missing, placeholders keep the build and the page
 * rendering (a component that creates a client during render must not throw
 * at prerender). Every request then fails fast and the app falls back to the
 * built-in catalog, local scores, and device-only library — and
 * `isSupabaseConfigured` lets the health endpoint and logs say so plainly,
 * instead of quietly pointing at a project that may no longer exist.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

export const SUPABASE_URL = url || "https://not-configured.supabase.co";
export const SUPABASE_ANON_KEY = key || "not-configured";
