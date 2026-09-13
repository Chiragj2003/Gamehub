import { unstable_cache } from "next/cache";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { CATALOG } from "./catalog";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://khavodmfrdazsszqeddg.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_85uWdXZEhjIHStK8pCUc9Q_toXMjX-7";
const publicSupabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Game {
  id: number;
  title: string;
  slug: string;
  description: string;
  category: string;
  difficulty: string;
  rating: number;
  plays: number;
  thumbnailUrl: string | null;
  iframeUrl: string | null;
  controlsJson: Record<string, string>;
  rulesJson: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Helper to choose the right client depending on whether execution is client-side or server-side
async function getSupabaseClient() {
  if (typeof window !== "undefined") {
    return createBrowserClient();
  }
  return await createServerClient();
}

// Offline fallback so the site renders during build or a database outage.
// Derived from the catalog, which is the single source of truth for the games.
const CATALOG_EPOCH = new Date("2025-01-01T00:00:00Z");
export const FALLBACK_GAMES: Game[] = CATALOG.map((g) => ({
  id: g.id,
  title: g.title,
  slug: g.slug,
  description: g.description,
  category: g.category,
  difficulty: g.difficulty,
  rating: g.rating,
  plays: g.plays,
  thumbnailUrl: null,
  iframeUrl: `/games/${g.slug}/embed`,
  controlsJson: g.controls,
  rulesJson: g.rules,
  createdAt: CATALOG_EPOCH,
  updatedAt: CATALOG_EPOCH,
}));


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

// Helper to catch database connection/query errors and fall back gracefully
async function runQuery<T>(queryFn: () => Promise<T>, fallbackValue: T): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    console.warn("Supabase query failed, returning fallback data. Error:", error);
    return fallbackValue;
  }
}

// ----------------- GRAPHQL QUERY DRIVER -----------------

async function fetchGamesGraphQL(): Promise<Game[]> {
  const res = await fetch(`${supabaseUrl}/graphql/v1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apiKey": supabaseAnonKey,
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
  const res = await fetch(`${supabaseUrl}/graphql/v1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apiKey": supabaseAnonKey,
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
    console.warn(`Could not increment play count for game ID ${id}:`, error);
    return false;
  }
}

// User Library Queries
export async function queryUserLibrary(userId: string | null) {
  if (!userId) return [];
  return await runQuery(
    async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("user_games")
        .select("game_id")
        .eq("user_id", userId);
      if (error) throw error;
      const gameIds = (data || []).map((d: { game_id: string | number }) => Number(d.game_id));
      if (gameIds.length === 0) return [];
      
      const allGames = await queryAllGames();
      return allGames.filter(g => gameIds.includes(g.id));
    },
    []
  );
}

export async function insertUserGame(userId: string | null, gameId: number) {
  if (!userId) return false;
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from("user_games").insert({
      user_id: userId,
      game_id: gameId,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("Failed to save game to library:", error);
    return false;
  }
}

export async function deleteUserGame(userId: string | null, gameId: number) {
  if (!userId) return false;
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
    console.warn("Failed to delete game from library:", error);
    return false;
  }
}

// Analytics Queries
export async function insertGameAnalytics(
  gameId: number,
  sessionId: string,
  durationSeconds: number,
  completed: boolean,
  score?: number
) {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from("game_analytics").insert({
      game_id: gameId,
      session_id: sessionId,
      duration_seconds: durationSeconds,
      completed,
      score: score || null,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("Failed to save game analytics:", error);
    return false;
  }
}

export async function queryLeaderboard(gameId: number) {
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
        .limit(10);
      if (error) throw error;
      interface DatabaseScore {
        player_name: string;
        score: number | string;
        created_at: string;
      }
      return (data || []).map((d: DatabaseScore) => ({
        playerName: d.player_name,
        score: Number(d.score),
        createdAt: new Date(d.created_at),
      }));
    },
    []
  );
}

export async function updateSessionScoreAndPlayer(sessionId: string, score: number, playerName: string) {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("game_analytics")
      .update({ score, player_name: playerName })
      .eq("session_id", sessionId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn(`Failed to update session score for session ${sessionId}:`, error);
    return false;
  }
}

export async function insertSessionScore(gameId: number, score: number, playerName: string, sessionId?: string) {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from("game_analytics").insert({
      game_id: gameId,
      score,
      player_name: playerName,
      session_id: sessionId || `score-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      duration_seconds: 0,
      completed: true,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("Failed to insert session score:", error);
    return false;
  }
}

export async function updateGameAnalyticsDuration(sessionId: string, durationSeconds: number, completed: boolean) {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("game_analytics")
      .update({ duration_seconds: durationSeconds, completed })
      .eq("session_id", sessionId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn(`Failed to update game analytics duration for session ${sessionId}:`, error);
    return false;
  }
}
