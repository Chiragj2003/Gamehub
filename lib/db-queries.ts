import { unstable_cache } from "next/cache";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { CATALOG_GAMES, type Game } from "./catalog";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase/config";
import { timeoutFetch, databaseBreaker, withDeadline } from "./supabase/fetch";

const publicSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { fetch: timeoutFetch } });

export type { Game } from "./catalog";

// Helper to choose the right client depending on whether execution is client-side or server-side
async function getSupabaseClient() {
  if (typeof window !== "undefined") {
    return createBrowserClient();
  }
  return await createServerClient();
}

// Offline fallback so the site renders during build or a database outage.
export const FALLBACK_GAMES: Game[] = CATALOG_GAMES;


interface DatabaseGame {
  id: string | number;
  title: string;
  slug: string;
  description: string;
  category: string;
  difficulty: string;
  rating: string | number;
  plays: string | number;
  thumbnail_url: string | null;
  iframe_url: string | null;
  controls_json: string | Record<string, string>;
  rules_json: string | string[];
  created_at: string;
  updated_at: string;
}

// Map database snake_case representation to camelCase TypeScript definition
function mapGame(g: DatabaseGame): Game {
  if (!g) return g as unknown as Game;
  return {
    id: Number(g.id),
    title: g.title,
    slug: g.slug,
    description: g.description,
    category: g.category,
    difficulty: g.difficulty,
    rating: Number(g.rating),
    plays: Number(g.plays),
    thumbnailUrl: g.thumbnail_url,
    iframeUrl: g.iframe_url,
    controlsJson: typeof g.controls_json === "string" ? JSON.parse(g.controls_json) : g.controls_json,
    rulesJson: typeof g.rules_json === "string" ? JSON.parse(g.rules_json) : g.rules_json,
    createdAt: new Date(g.created_at),
    updatedAt: new Date(g.updated_at),
  };
}

// Run a query with a fallback. A failure trips the breaker so the next
// queries within the cooldown return their fallback at once instead of each
// waiting on a request that is going to time out.
async function runQuery<T>(queryFn: () => Promise<T>, fallbackValue: T): Promise<T> {
  if (databaseBreaker.isOpen()) return fallbackValue;
  try {
    const result = await withDeadline(queryFn());
    databaseBreaker.reset();
    return result;
  } catch (error) {
    databaseBreaker.trip();
    console.warn("Supabase query failed, returning fallback data. Error:", error);
    return fallbackValue;
  }
}

// ----------------- GRAPHQL QUERY DRIVER -----------------

async function fetchGamesGraphQL(): Promise<Game[]> {
  const res = await timeoutFetch(`${SUPABASE_URL}/graphql/v1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apiKey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      query: `
        query {
          gamesCollection {
            edges {
              node {
                id
                title
                slug
                description
                category
                difficulty
                rating
                plays
                thumbnail_url
                iframe_url
                controls_json
                rules_json
                created_at
                updated_at
              }
            }
          }
        }
      `
    })
  });
  if (!res.ok) {
    throw new Error(`GraphQL query failed with status ${res.status}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }
  const edges = json.data?.gamesCollection?.edges || [];
  return edges.map((edge: { node: DatabaseGame }) => mapGame(edge.node));
}

async function fetchGameBySlugGraphQL(slug: string): Promise<Game | null> {
  const res = await timeoutFetch(`${SUPABASE_URL}/graphql/v1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apiKey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      query: `
        query GetGame($slug: String!) {
          gamesCollection(filter: { slug: { eq: $slug } }) {
            edges {
              node {
                id
                title
                slug
                description
                category
                difficulty
                rating
                plays
                thumbnail_url
                iframe_url
                controls_json
                rules_json
                created_at
                updated_at
              }
            }
          }
        }
      `,
      variables: { slug }
    })
  });
  if (!res.ok) {
    throw new Error(`GraphQL query failed with status ${res.status}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }
  const edges = json.data?.gamesCollection?.edges || [];
  return edges.length > 0 ? mapGame(edges[0].node) : null;
}

// ----------------- CACHED CATALOG FETCHERS -----------------

const getCachedAllGames = unstable_cache(
  async () => {
    try {
      return await fetchGamesGraphQL();
    } catch (graphqlError) {
      console.warn("GraphQL query failed, falling back to Rest PostgREST client. Error:", graphqlError);
      const { data, error } = await publicSupabase
        .from("games")
        .select("*")
        .order("title");
      if (error) throw error;
      return (data || []).map(mapGame);
    }
  },
  ["all-games"],
  { revalidate: 3600, tags: ["games"] }
);

const getCachedFeaturedGames = unstable_cache(
  async () => {
    const { data, error } = await publicSupabase
      .from("games")
      .select("*")
      .in("slug", ["snake", "tetris", "space-invaders"]);
    if (error) throw error;
    return (data || []).map(mapGame);
  },
  ["featured-games"],
  { revalidate: 3600, tags: ["games"] }
);

const getCachedGameBySlug = unstable_cache(
  async (slug: string) => {
    try {
      return await fetchGameBySlugGraphQL(slug);
    } catch (graphqlError) {
      console.warn(`GraphQL query by slug failed, falling back to Rest client. Error:`, graphqlError);
      const { data, error } = await publicSupabase
        .from("games")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data ? mapGame(data) : null;
    }
  },
  ["game-by-slug"],
  { revalidate: 3600 }
);

const getCachedGamesByCategory = unstable_cache(
  async (category: string) => {
    const { data, error } = await publicSupabase
      .from("games")
      .select("*")
      .eq("category", category);
    if (error) throw error;
    return (data || []).map(mapGame);
  },
  ["games-by-category"],
  { revalidate: 3600 }
);

// ----------------- PUBLIC API METHODS -----------------

export async function queryAllGames() {
  return await runQuery(
    async () => await getCachedAllGames(),
    FALLBACK_GAMES
  );
}

export async function queryFeaturedGames() {
  return await runQuery(
    async () => await getCachedFeaturedGames(),
    FALLBACK_GAMES.filter(g => ["snake", "tetris", "space-invaders"].includes(g.slug))
  );
}

export async function queryGameBySlug(slug: string) {
  return await runQuery(
    async () => await getCachedGameBySlug(slug),
    FALLBACK_GAMES.find(g => g.slug === slug) || null
  );
}

export async function queryGamesByCategory(category: string) {
  return await runQuery(
    async () => await getCachedGamesByCategory(category),
    FALLBACK_GAMES.filter(g => g.category.toLowerCase() === category.toLowerCase())
  );
}

export async function querySearchGames(searchQuery: string) {
  return await runQuery(
    async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);
      if (error) throw error;
      return (data || []).map(mapGame);
    },
    FALLBACK_GAMES.filter(
      g =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
}

export async function incrementGamePlayCount(id: number) {
  if (databaseBreaker.isOpen()) return false;
  try {
    const supabase = await getSupabaseClient();
    
    // Select plays count
    const { data, error: selectError } = await supabase
      .from("games")
      .select("plays")
      .eq("id", id)
      .single();
    if (selectError) throw selectError;
    
    const { error: updateError } = await supabase
      .from("games")
      .update({ plays: (data?.plays || 0) + 1 })
      .eq("id", id);
    if (updateError) throw updateError;
    return true;
  } catch (error) {
    databaseBreaker.trip();
    console.warn(`Could not increment play count for game ID ${id}:`, error);
    return false;
  }
}

// User Library Queries
/** Ids of the games the signed-in user has saved. RLS scopes this to the caller. */
export async function queryUserLibraryIds(userId: string): Promise<number[]> {
  return await runQuery(
    async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("user_games")
        .select("game_id")
        .eq("user_id", userId);
      if (error) throw error;
      return (data || []).map((d: { game_id: string | number }) => Number(d.game_id));
    },
    []
  );
}

export async function insertUserGame(userId: string, gameId: number): Promise<boolean> {
  if (databaseBreaker.isOpen()) return false;
  try {
    const supabase = await getSupabaseClient();
    // Upsert on the (user, game) unique key so a double-tap is harmless.
    const { error } = await supabase
      .from("user_games")
      .upsert({ user_id: userId, game_id: gameId }, { onConflict: "user_id,game_id", ignoreDuplicates: true });
    if (error) throw error;
    return true;
  } catch (error) {
    databaseBreaker.trip();
    console.warn("Failed to save game to library:", error);
    return false;
  }
}

export async function deleteUserGame(userId: string, gameId: number): Promise<boolean> {
  if (databaseBreaker.isOpen()) return false;
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("user_games")
      .delete()
      .eq("user_id", userId)
      .eq("game_id", gameId);
    if (error) throw error;
    return true;
  } catch (error) {
    databaseBreaker.trip();
    console.warn("Failed to delete game from library:", error);
    return false;
  }
}

// Play sessions and leaderboards

export interface PlaySessionRow {
  sessionId: string;
  gameId: number;
  score: number | null;
  createdAt: Date;
}

/**
 * Open a session for a run. The server generates the id and stamps the start
 * time, so neither can be forged by the client. Also counts the play.
 */
export async function createGameSession(gameId: number): Promise<string | null> {
  if (databaseBreaker.isOpen()) return null;
  try {
    const supabase = await getSupabaseClient();
    const sessionId = `s_${Date.now().toString(36)}_${crypto.randomUUID().replace(/-/g, "")}`;
    const { error } = await supabase.from("game_analytics").insert({
      game_id: gameId,
      session_id: sessionId,
      duration_seconds: 0,
      completed: false,
    });
    if (error) throw error;
    // Play count is best-effort; a failure here must not block the session.
    incrementGamePlayCount(gameId).catch(() => {});
    return sessionId;
  } catch (error) {
    databaseBreaker.trip();
    console.warn("Could not create game session:", error);
    return null;
  }
}

export async function getGameSession(sessionId: string): Promise<PlaySessionRow | null> {
  if (databaseBreaker.isOpen()) return null;
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("game_analytics")
      .select("session_id, game_id, score, created_at")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      sessionId: data.session_id,
      gameId: Number(data.game_id),
      score: data.score === null ? null : Number(data.score),
      createdAt: new Date(data.created_at),
    };
  } catch (error) {
    databaseBreaker.trip();
    console.warn(`Could not read session ${sessionId}:`, error);
    return null;
  }
}

/** Attach the final score to a session. Fails if it was already claimed. */
export async function finalizeGameSession(
  sessionId: string,
  score: number,
  playerName: string,
  durationSeconds: number
): Promise<boolean> {
  if (databaseBreaker.isOpen()) return false;
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("game_analytics")
      .update({ score, player_name: playerName, duration_seconds: durationSeconds, completed: true })
      .eq("session_id", sessionId)
      .is("score", null)
      .select("id");
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  } catch (error) {
    databaseBreaker.trip();
    console.warn(`Could not finalize session ${sessionId}:`, error);
    return false;
  }
}

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  createdAt: Date;
}

export async function queryLeaderboard(gameId: number, limit = 10): Promise<LeaderboardEntry[]> {
  return await runQuery(
    async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("game_analytics")
        .select("player_name, score, created_at")
        .eq("game_id", gameId)
        .not("score", "is", null)
        .not("player_name", "is", null)
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data || []).map((d: { player_name: string; score: number | string; created_at: string }) => ({
        playerName: d.player_name,
        score: Number(d.score),
        createdAt: new Date(d.created_at),
      }));
    },
    []
  );
}
