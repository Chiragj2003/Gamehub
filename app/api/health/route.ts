import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "@/lib/supabase/config";
import { rateLimitBackend } from "@/lib/rate-limit";
import { CATALOG } from "@/lib/catalog";

/**
 * Deployment health. Answers the one question that matters after a deploy:
 * is the database actually reachable, or is the site running on fallbacks?
 *
 *   curl https://<your-site>/api/health
 */
export async function GET() {
  const startedAt = Date.now();
  let database: { ok: boolean; games?: number; error?: string; hint?: string };

  if (!isSupabaseConfigured) {
    database = {
      ok: false,
      error: "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set",
      hint: "Set them in the Vercel project (Settings → Environment Variables) and redeploy.",
    };
  } else {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { count, error } = await supabase
        .from("games")
        .select("id", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      database = { ok: true, games: count ?? 0 };
      if ((count ?? 0) !== CATALOG.length) {
        database.hint = `Database has ${count} games, catalog has ${CATALOG.length}. Run supabase.sql to re-seed.`;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      database = {
        ok: false,
        error: message,
        hint: /ENOTFOUND|fetch failed/i.test(message)
          ? `The Supabase project at ${SUPABASE_URL} does not resolve. It may be paused or deleted — check supabase.com/dashboard, then update the env vars.`
          : /relation .* does not exist|column .* does not exist/i.test(message)
            ? "Schema is out of date. Run supabase.sql in the Supabase SQL editor."
            : undefined,
      };
    }
  }

  const body = {
    ok: database.ok,
    database,
    rateLimit: rateLimitBackend,
    catalogSource: database.ok ? "database" : "fallback",
    ms: Date.now() - startedAt,
    time: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: database.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}

export const dynamic = "force-dynamic";
