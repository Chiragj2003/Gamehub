import { unstable_cache } from "next/cache";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

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

// High-quality fallback data to use if the database is offline during build or run
export const FALLBACK_GAMES: Game[] = [
  {
    id: 1,
    title: "Snake",
    slug: "snake",
    description: "The retro block-eating serpent returns. Remastered with modern visuals, fluid keyboard controls, and local high scores. Navigate the field, eat food, and grow longer without crashing into the walls or your own tail.",
    category: "Arcade",
    difficulty: "Easy",
    rating: 4.8,
    plays: 14820,
    thumbnailUrl: "",
    iframeUrl: "/games/snake/embed",
    controlsJson: { movement: "Arrow Keys / WASD", pause: "P key", restart: "R key" },
    rulesJson: [
      "Navigate the snake to eat glowing red food pellets.",
      "Each food pellet increases your length and speeds up the game.",
      "Game over if you collide with the border walls or your own body."
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    title: "Pong",
    slug: "pong",
    description: "Experience the granddaddy of arcade games. Take control of your paddle and bounce the ball past your opponent. Play against a challenging local AI and claim retro table-tennis glory.",
    category: "Retro",
    difficulty: "Easy",
    rating: 4.5,
    plays: 8900,
    thumbnailUrl: "",
    iframeUrl: "/games/pong/embed",
    controlsJson: { "player 1 (Left)": "W / S keys", "player 2 (Right)": "Arrow Up / Down keys", pause: "P key" },
    rulesJson: [
      "Bounce the ball back and forth using your paddles.",
      "Score a point when the ball passes the opponent's screen edge.",
      "The first player to score 11 points wins the match."
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    title: "Tetris",
    slug: "tetris",
    description: "The ultimate block-fitting puzzle classic. Rotate, shift, and drop falling tetrominoes to clear complete horizontal lines. Manage speed tiers as the board fills up rapidly.",
    category: "Puzzle",
    difficulty: "Medium",
    rating: 4.9,
    plays: 23150,
    thumbnailUrl: "",
    iframeUrl: "/games/tetris/embed",
    controlsJson: { move: "Left / Right Arrows", rotate: "Up Arrow / X key", "soft drop": "Down Arrow", "hard drop": "Spacebar", hold: "C key / Shift" },
    rulesJson: [
      "Arrange falling puzzle blocks to form complete horizontal lines.",
      "Completed lines are cleared and award score multipliers.",
      "Game ends immediately when blocks stack up to the top of the grid."
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 4,
    title: "Flappy Bird",
    slug: "flappy-bird",
    description: "Tap to flap and navigate through narrow green pipe structures. Fluid physics, timing-based jumps, and high-difficulty scrolling challenges will test your absolute reflexes.",
    category: "Arcade",
    difficulty: "Medium",
    rating: 4.6,
    plays: 16200,
    thumbnailUrl: "",
    iframeUrl: "/games/flappy-bird/embed",
    controlsJson: { flap: "Spacebar / Left Mouse Click", pause: "P key" },
    rulesJson: [
      "Tap flap controls to keep the bird flying upwards.",
      "Avoid colliding with the floating green pipes or the ground.",
      "Score one point for every set of pipes successfully navigated."
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 5,
    title: "Breakout",
    slug: "breakout",
    description: "Retro brick-breaker action. Control a sliding paddle to keep a bouncing ball in play, shattering rows of colorful neon bricks with distinct power-ups and physics calculations.",
    category: "Arcade",
    difficulty: "Medium",
    rating: 4.7,
    plays: 12050,
    thumbnailUrl: "",
    iframeUrl: "/games/breakout/embed",
    controlsJson: { move: "Left / Right Arrows or Mouse Move", release: "Spacebar / Left Click" },
    rulesJson: [
      "Destroy all bricks on the top board to clear the level.",
      "Keep the ball in play by deflecting it with your paddle.",
      "Losing all lives causes a game over."
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 6,
    title: "Asteroids",
    slug: "asteroids",
    description: "Pilot your spacecraft in a chaotic asteroid field. Thrust through weightless space, rotate, and blast giant space rocks into smaller fragments while avoiding screen-wrapping collisions.",
    category: "Action",
    difficulty: "Hard",
    rating: 4.8,
    plays: 19400,
    thumbnailUrl: "",
    iframeUrl: "/games/asteroids/embed",
    controlsJson: { rotate: "Left / Right Arrows", thrust: "Up Arrow", shoot: "Spacebar", hyperspace: "Shift key" },
    rulesJson: [
      "Shoot asteroids to break them down and score points.",
      "Dodge moving debris and alien saucers that shoot back.",
      "Crashing into any object destroys your ship and costs a life."
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 7,
    title: "Space Invaders",
    slug: "space-invaders",
    description: "Defend Earth against descending grids of alien invaders. Take cover behind bunkers and take out the alien columns before they reach the ground level.",
    category: "Retro",
    difficulty: "Hard",
    rating: 4.8,
    plays: 15600,
    thumbnailUrl: "",
    iframeUrl: "/games/space-invaders/embed",
    controlsJson: { move: "Left / Right Arrow keys", shoot: "Spacebar" },
    rulesJson: [
      "Eliminate all aliens in the grid to secure the stage.",
      "Use shielding bunkers to take cover from incoming alien fire.",
      "If any alien invader reaches the bottom line, it's instant game over."
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 8,
    title: "Pac-Man Style",
    slug: "pacman",
    description: "A legendary maze-chase experience. Gobble up yellow dots in a neon maze while escaping from four colorful ghosts with unique tracking behaviors.",
    category: "Retro",
    difficulty: "Hard",
    rating: 4.7,
    plays: 21100,
    thumbnailUrl: "",
    iframeUrl: "/games/pacman/embed",
    controlsJson: { navigate: "Arrow Keys / WASD" },
    rulesJson: [
      "Eat all pellets in the maze to complete the level.",
      "Avoid getting caught by the chasing ghosts.",
      "Eat power pellets to turn the ghosts blue and eat them for bonus scores."
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 9,
    title: "Memory Match",
    slug: "memory-match",
    description: "A clean card-matching brain puzzle. Flip tiles to reveal hidden neon glyphs and pair them up in as few moves as possible. Improves focus and cognitive recall.",
    category: "Puzzle",
    difficulty: "Easy",
    rating: 4.4,
    plays: 9400,
    thumbnailUrl: "",
    iframeUrl: "/games/memory-match/embed",
    controlsJson: { select: "Left Mouse Click" },
    rulesJson: [
      "Flip two cards face up at a time.",
      "If the icons match, the cards remain face up.",
      "Clear the entire board in the fewest moves to set a high score."
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 10,
    title: "Connect Four",
    slug: "connect-four",
    description: "The classic vertical drop board game. Drop your red or yellow discs into columns to form a straight line of four before your opponent blocks you.",
    category: "Strategy",
    difficulty: "Easy",
    rating: 4.5,
    plays: 10200,
    thumbnailUrl: "",
    iframeUrl: "/games/connect-four/embed",
    controlsJson: { select: "Left Mouse Click on Column" },
    rulesJson: [
      "Players take turns dropping one colored token from the top.",
      "The token falls to the lowest available space in the column.",
      "First to connect four tokens horizontally, vertically, or diagonally wins."
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 11,
    title: "Tic Tac Toe",
    slug: "tic-tac-toe",
    description: "Quick classic paper-and-pencil grid game. Face off against an unbeatable AI or play locally in an elegant neon 3x3 layout.",
    category: "Strategy",
    difficulty: "Easy",
    rating: 4.2,
    plays: 7800,
    thumbnailUrl: "",
    iframeUrl: "/games/tic-tac-toe/embed",
    controlsJson: { place: "Left Mouse Click on Empty Cell" },
    rulesJson: [
      "Place your symbol (X or O) in any empty grid cell.",
      "Form a line of three symbols horizontally, vertically, or diagonally to win.",
      "If all cells are filled and no player has three in a line, the game is a draw."
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 12,
    title: "2048",
    slug: "2048",
    description: "Slide and merge sliding number blocks. When two tiles with the same number touch, they merge into one. Work your way up to the ultimate 2048 tile.",
    category: "Puzzle",
    difficulty: "Medium",
    rating: 4.8,
    plays: 24500,
    thumbnailUrl: "",
    iframeUrl: "/games/2048/embed",
    controlsJson: { slide: "Arrow Keys / WASD or Swipe gestures" },
    rulesJson: [
      "Slide the board to shift all tiles in one direction.",
      "Tiles with identical values merge into a single tile of their sum.",
      "Keep merging tiles to reach the legendary 2048 block without running out of moves."
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 13,
    title: "Neon Snake",
    slug: "neon-snake",
    description: "Navigate a glowing grid, gather food capsules, and watch your neon trail grow. Collect power-ups to warp time or double your points, but avoid smashing into yourself or the neon boundaries.",
    category: "Arcade",
    difficulty: "Easy",
    rating: 4.9,
    plays: 12500,
    thumbnailUrl: "",
    iframeUrl: "phaser://neon-snake",
    controlsJson: {
      movement: "Arrow Keys / WASD",
      swipe: "Any direction (mobile)",
      pause: "P key",
    },
    rulesJson: [
      "Gather glowing grid cores to score points and grow longer.",
      "Eating glowing purple pills slows time; yellow pills double point values.",
      "Colliding with boundaries or your own tail terminates the run."
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 14,
    title: "Space Defender",
    slug: "space-defender",
    description: "Defend deep space from waves of glowing alien ships. Move your ship horizontally, collect power-ups, activate shield grids, and defeat massive boss craft spawning every 5 waves.",
    category: "Arcade",
    difficulty: "Medium",
    rating: 4.8,
    plays: 9800,
    thumbnailUrl: "",
    iframeUrl: "phaser://space-defender",
    controlsJson: {
      steer: "Mouse movement / Touch drag",
      shields: "Spacebar / Screen tap",
      pause: "P key",
    },
    rulesJson: [
      "Blast alien ships before they bypass your position. Lose 1 life for every hit.",
      "Collect shield charges, rapid fire lasers, and bonus lives dropped by enemies.",
      "Survive boss assaults on every 5th wave increment."
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 15,
    title: "Memory Matrix",
    slug: "memory-matrix",
    description: "Exercise your cognitive memory recall. Watch a 4x4 matrix grid of glassmorphic tiles flash with vibrant neon tones and replicate the pattern exactly as shown.",
    category: "Puzzle",
    difficulty: "Medium",
    rating: 4.7,
    plays: 7200,
    thumbnailUrl: "",
    iframeUrl: "phaser://memory-matrix",
    controlsJson: {
      "click grid": "Left mouse click / Touch tap",
      "toggle mode": "Menu buttons",
    },
    rulesJson: [
      "Watch the grid flash sequence carefully.",
      "Replicate the sequence in the exact order within the time limit.",
      "Chaining perfect rounds increases score multipliers and sequence length."
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 16,
    title: "Hangman",
    slug: "hangman",
    description: "Classic word-guessing game. Guess the letters before you run out of attempts and the stick figure is fully drawn.",
    category: "Puzzle",
    difficulty: "Medium",
    rating: 4.5,
    plays: 5200,
    thumbnailUrl: "",
    iframeUrl: "/games/hangman/embed",
    controlsJson: { select: "Mouse click or Keyboard letters" },
    rulesJson: ["Guess letters to reveal the hidden word.", "You have 6 attempts before losing."],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 17,
    title: "Rock Paper Scissors",
    slug: "rock-paper-scissors",
    description: "The classic hand game. Play against the AI and test your luck.",
    category: "Arcade",
    difficulty: "Easy",
    rating: 4.1,
    plays: 3300,
    thumbnailUrl: "",
    iframeUrl: "/games/rock-paper-scissors/embed",
    controlsJson: { select: "Mouse click" },
    rulesJson: ["Rock beats Scissors, Scissors beats Paper, Paper beats Rock."],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 18,
    title: "Chrome Dino",
    slug: "dino",
    description: "The legendary infinite side-scrolling runner. Jump over cacti as the game speeds up.",
    category: "Arcade",
    difficulty: "Medium",
    rating: 4.9,
    plays: 15400,
    thumbnailUrl: "",
    iframeUrl: "/games/dino/embed",
    controlsJson: { jump: "Spacebar / Up Arrow" },
    rulesJson: ["Jump over obstacles to survive.", "Game speeds up as score increases."],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 19,
    title: "Typing Speed Test",
    slug: "typing-test",
    description: "Test your typing speed and accuracy. Type the provided text as fast as you can.",
    category: "Puzzle",
    difficulty: "Medium",
    rating: 4.6,
    plays: 8900,
    thumbnailUrl: "",
    iframeUrl: "/games/typing-test/embed",
    controlsJson: { type: "Keyboard" },
    rulesJson: ["Type the sentence correctly.", "Score is based on Words Per Minute (WPM)."],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 20,
    title: "Balance",
    slug: "balance",
    description: "A physics-based balancing game. Keep the platform steady as wind and gravity try to tip it.",
    category: "Arcade",
    difficulty: "Hard",
    rating: 4.4,
    plays: 6700,
    thumbnailUrl: "",
    iframeUrl: "/games/balance/embed",
    controlsJson: { lean: "Left / Right Arrows" },
    rulesJson: ["Counteract the tilting force.", "If the platform leans more than 60 degrees, you lose."],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export const MOCK_LEADERBOARDS: Record<string, { playerName: string; score: number; createdAt: Date }[]> = {
  "neon-snake": [
    { playerName: "ACE", score: 85, createdAt: new Date() },
    { playerName: "NEO", score: 72, createdAt: new Date() },
    { playerName: "VIP", score: 61, createdAt: new Date() },
    { playerName: "JAC", score: 54, createdAt: new Date() },
    { playerName: "SLK", score: 43, createdAt: new Date() },
  ],
  "space-defender": [
    { playerName: "CMD", score: 4500, createdAt: new Date() },
    { playerName: "FOX", score: 3800, createdAt: new Date() },
    { playerName: "SLY", score: 3200, createdAt: new Date() },
    { playerName: "PIL", score: 2900, createdAt: new Date() },
    { playerName: "ROG", score: 1800, createdAt: new Date() },
  ],
  "memory-matrix": [
    { playerName: "CPU", score: 1200, createdAt: new Date() },
    { playerName: "MEM", score: 1050, createdAt: new Date() },
    { playerName: "RAM", score: 900, createdAt: new Date() },
    { playerName: "SYS", score: 750, createdAt: new Date() },
    { playerName: "BIT", score: 600, createdAt: new Date() },
  ],
};

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

export async function queryLeaderboard(gameId: number, slug?: string) {
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
    slug && MOCK_LEADERBOARDS[slug] ? MOCK_LEADERBOARDS[slug] :
    gameId === 13 ? MOCK_LEADERBOARDS["neon-snake"] :
    gameId === 14 ? MOCK_LEADERBOARDS["space-defender"] :
    gameId === 15 ? MOCK_LEADERBOARDS["memory-matrix"] :
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
