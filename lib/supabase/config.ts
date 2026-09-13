/**
 * Supabase connection settings, resolved once for every client type.
 *
 * The anon key is a publishable key: it is shipped to every browser by design
 * and row-level security is what protects the data. Falling back to the
 * project's public values means a build or preview environment without env
 * vars (Vercel scopes them per environment) still compiles and renders,
 * instead of crashing at prerender inside a component that creates a client.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://khavodmfrdazsszqeddg.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_85uWdXZEhjIHStK8pCUc9Q_toXMjX-7";
