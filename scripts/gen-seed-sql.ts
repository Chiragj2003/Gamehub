/**
 * Regenerates the seed block of supabase.sql from lib/catalog.ts.
 *
 *   npx tsx scripts/gen-seed-sql.ts
 *
 * Keeps the SQL file and the TypeScript catalog from drifting apart: edit the
 * catalog, run this, commit both.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { CATALOG } from "../lib/catalog";

const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
const j = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;

const rows = CATALOG.map(
  (g) =>
    `  (${g.id}, ${q(g.title)}, ${q(g.slug)}, ${q(g.description)}, ${q(g.category)}, ${q(g.difficulty)}, ${g.rating}, ${g.plays}, NULL, NULL, ${j(g.controls)}, ${j(g.rules)}, ${g.maxScore})`
).join(",\n");

const keep = CATALOG.map((g) => q(g.slug)).join(", ");

const block = `-- 5. Seed Games Catalog
-- GENERATED from lib/catalog.ts by scripts/gen-seed-sql.ts. Do not edit by hand.

-- Games removed from the catalog are deleted here; their analytics rows go with
-- them (ON DELETE CASCADE) so the leaderboards and the home page stay in sync.
DELETE FROM public.games WHERE slug NOT IN (${keep});

INSERT INTO public.games (id, title, slug, description, category, difficulty, rating, plays, thumbnail_url, iframe_url, controls_json, rules_json, max_score)
VALUES
${rows}
ON CONFLICT (slug) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    difficulty = EXCLUDED.difficulty,
    rating = EXCLUDED.rating,
    iframe_url = EXCLUDED.iframe_url,
    controls_json = EXCLUDED.controls_json,
    rules_json = EXCLUDED.rules_json,
    max_score = EXCLUDED.max_score,
    updated_at = TIMEZONE('utc'::text, NOW());

-- Keep the identity sequence ahead of the fixed ids above.
SELECT setval(pg_get_serial_sequence('public.games', 'id'), (SELECT MAX(id) FROM public.games));
`;

const path = "supabase.sql";
const sql = readFileSync(path, "utf8");
const start = sql.indexOf("-- 5. Seed Games Catalog");
if (start === -1) throw new Error("Seed marker not found in supabase.sql");
const endMarker = "updated_at = TIMEZONE('utc'::text, NOW());";
let end = sql.indexOf(endMarker, start);
if (end === -1) throw new Error("Seed end marker not found");
end += endMarker.length;
// Swallow a previously generated setval line too, if present.
const after = sql.slice(end);
const setvalIdx = after.indexOf("SELECT setval(");
const tail = setvalIdx !== -1 && setvalIdx < 200 ? after.slice(after.indexOf("\n", setvalIdx) + 1) : after;

writeFileSync(path, sql.slice(0, start) + block + tail.replace(/^\n+/, "\n"));
console.log(`Wrote ${CATALOG.length} games to ${path}`);
