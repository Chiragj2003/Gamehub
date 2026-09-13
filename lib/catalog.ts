/**
 * The game catalog.
 *
 * Single source of truth for what the site offers: the database seed, the
 * offline fallback, the embed router and the score validator all derive from
 * this list. To add a game, add an entry here, build the component in
 * components/games/, and register it in components/GameRenderer.tsx.
 */

export interface CatalogGame {
  /** Stable database id. Never renumber: game_analytics rows reference it. */
  id: number;
  title: string;
  slug: string;
  description: string;
  category: "Arcade" | "Puzzle" | "Retro" | "Action";
  difficulty: "Easy" | "Medium" | "Hard";
  rating: number;
  plays: number;
  controls: Record<string, string>;
  rules: string[];
  /** Highest score a human could plausibly reach; submissions above it are rejected. */
  maxScore: number;
  /** Highest plausible points per second, used to catch scores impossible for the play time. */
  maxRate: number;
}

export const CATALOG: CatalogGame[] = [
  {
    id: 1,
    title: "Snake",
    slug: "snake",
    description:
      "The retro block-eating serpent, rebuilt. Eat food, grow longer, and keep clear of the walls and your own tail. Every pellet makes the snake a little faster.",
    category: "Arcade",
    difficulty: "Easy",
    rating: 4.8,
    plays: 14820,
    controls: { move: "Arrow keys / WASD", touch: "Swipe to turn", pause: "P or Esc" },
    rules: [
      "Eat the red pellets to score 10 points and grow one segment.",
      "The snake speeds up with every pellet eaten.",
      "Hitting a wall or your own body ends the run.",
    ],
    maxScore: 5_000,
    maxRate: 12,
  },
  {
    id: 2,
    title: "Pong",
    slug: "pong",
    description:
      "The original paddle duel. Play the CPU, share a keyboard with a friend, or create a room code and play someone online. First to 11 wins.",
    category: "Retro",
    difficulty: "Easy",
    rating: 4.6,
    plays: 11230,
    controls: {
      "vs CPU": "Arrow keys or W / S",
      "2 player (left)": "W / S",
      "2 player (right)": "Arrow Up / Down, or drag on touch",
      online: "Create a room, share the 4-letter code",
      pause: "P or Esc",
    },
    rules: [
      "Return the ball past your opponent to score a point.",
      "Where the ball hits your paddle sets the angle of the return.",
      "First player to 11 points wins the match.",
    ],
    maxScore: 1_600,
    maxRate: 30,
  },
  {
    id: 3,
    title: "Tetris",
    slug: "tetris",
    description:
      "Stack falling tetrominoes and clear complete lines. Full SRS rotation with wall kicks and T-spins, 7-bag piece order, hold, lock delay, ghost piece and next-piece preview.",
    category: "Puzzle",
    difficulty: "Medium",
    rating: 4.9,
    plays: 18450,
    controls: {
      move: "Left / Right (hold to auto-shift)",
      rotate: "Up",
      "soft drop": "Down",
      "hard drop": "Space",
      hold: "C or Shift",
      touch: "Tap left / right thirds to move, middle to rotate",
      pause: "P or Esc",
    },
    rules: [
      "Complete a horizontal line to clear it. Clearing several at once scores more.",
      "T-spins score extra: rotate a T into a slot so three corners are blocked.",
      "Every 10 lines raises the level and the fall speed.",
      "The game ends when a new piece has no room to spawn.",
    ],
    maxScore: 500_000,
    maxRate: 900,
  },
  {
    id: 4,
    title: "Flappy Bird",
    slug: "flappy-bird",
    description:
      "Tap to flap and thread the bird through the gaps. Deceptively simple, brutally hard. The pipes speed up every five you pass.",
    category: "Arcade",
    difficulty: "Medium",
    rating: 4.5,
    plays: 9870,
    controls: { flap: "Space / Up / click / tap", pause: "P or Esc" },
    rules: [
      "Each pipe you pass is one point.",
      "Touching a pipe, the ground, or the ceiling ends the run.",
      "Pipes move faster every five points.",
    ],
    maxScore: 1_000,
    maxRate: 2,
  },
  {
    id: 5,
    title: "Breakout",
    slug: "breakout",
    description:
      "Smash every brick with a bouncing ball. Each level adds rows and speed, and the top rows start taking two hits from level 2.",
    category: "Arcade",
    difficulty: "Medium",
    rating: 4.6,
    plays: 8450,
    controls: { move: "Left / Right, mouse, or drag", launch: "Space / click / tap", pause: "P or Esc" },
    rules: [
      "Bricks score 20 points; the tough ones score 10 on the first hit.",
      "Clearing the board awards a level bonus and a faster ball.",
      "Miss the ball three times and the game is over.",
    ],
    maxScore: 20_000,
    maxRate: 60,
  },
  {
    id: 6,
    title: "Asteroids",
    slug: "asteroids",
    description:
      "Pilot a lone ship through a field of drifting rocks. Big asteroids split into smaller, faster ones, and every wave adds more of them.",
    category: "Action",
    difficulty: "Hard",
    rating: 4.7,
    plays: 7620,
    controls: {
      turn: "Left / Right",
      thrust: "Up",
      fire: "Space / click",
      touch: "Hold and drag to steer and thrust, tap to fire",
      pause: "P or Esc",
    },
    rules: [
      "Large rocks are 20 points, medium 50, small 100.",
      "Small rocks move fastest; splitting a big one raises the pressure.",
      "You get a short shield after each respawn. Three lives.",
    ],
    maxScore: 100_000,
    maxRate: 80,
  },
  {
    id: 7,
    title: "Space Invaders",
    slug: "space-invaders",
    description:
      "Hold the line against a descending alien formation. They march faster as their numbers fall, and each wave arrives quicker and angrier than the last.",
    category: "Retro",
    difficulty: "Hard",
    rating: 4.7,
    plays: 10240,
    controls: {
      move: "Left / Right, mouse, or drag",
      fire: "Space / click / tap (hold to auto-fire)",
      pause: "P or Esc",
    },
    rules: [
      "Aliens in the back rows are worth more: 40, 30, 20, 10 points.",
      "Your shots can intercept incoming alien fire.",
      "The game ends if the formation reaches your cannon or you lose all three lives.",
    ],
    maxScore: 50_000,
    maxRate: 100,
  },
  {
    id: 8,
    title: "Pac-Man Style",
    slug: "pacman",
    description:
      "Clear the maze of dots while four ghosts hunt you down. Grab a power pellet to turn the tables and eat them for a rising bonus.",
    category: "Retro",
    difficulty: "Hard",
    rating: 4.8,
    plays: 13560,
    controls: { move: "Arrow keys / WASD", touch: "Swipe to turn", pause: "P or Esc" },
    rules: [
      "Dots are 10 points, power pellets 50.",
      "Eating ghosts in one power-up scores 200, 400, 800, 1600.",
      "Clear every dot to advance; ghosts get faster each level.",
    ],
    maxScore: 100_000,
    maxRate: 60,
  },
  {
    id: 12,
    title: "2048",
    slug: "2048",
    description:
      "Slide the tiles and merge matching numbers. Reach 2048 and then keep going for a high score. Your best is saved on this device.",
    category: "Puzzle",
    difficulty: "Medium",
    rating: 4.7,
    plays: 15320,
    controls: { move: "Arrow keys / WASD", touch: "Swipe" },
    rules: [
      "Tiles slide as far as they can; equal tiles that collide merge into one.",
      "Every merge adds the new tile's value to your score.",
      "The game ends when no move is possible.",
    ],
    maxScore: 200_000,
    maxRate: 600,
  },
  {
    id: 18,
    title: "Chrome Dino",
    slug: "dino",
    description:
      "The offline runner, online. Jump the cacti, duck under the birds, and see how far you can get before the speed becomes unfair.",
    category: "Arcade",
    difficulty: "Medium",
    rating: 4.5,
    plays: 12080,
    controls: {
      jump: "Space / Up / tap",
      duck: "Down / swipe down",
      pause: "P or Esc",
    },
    rules: [
      "Score climbs with distance travelled.",
      "Birds appear after 200 points: low ones must be jumped, high ones ducked.",
      "The run gets faster the longer you survive.",
    ],
    maxScore: 50_000,
    maxRate: 80,
  },
];

export const CATALOG_BY_SLUG = new Map(CATALOG.map((g) => [g.slug, g]));

/** The shape pages and cards render; identical to a database row. */
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

const CATALOG_EPOCH = new Date("2025-01-01T00:00:00Z");

/**
 * The catalog as render-ready rows. Pages that only need to list or look up
 * games use this directly — it is the same data the database is seeded from,
 * ships in the bundle, and costs no request.
 */
export const CATALOG_GAMES: Game[] = CATALOG.map((g) => ({
  id: g.id,
  title: g.title,
  slug: g.slug,
  description: g.description,
  category: g.category,
  difficulty: g.difficulty,
  rating: g.rating,
  plays: g.plays,
  thumbnailUrl: null,
  iframeUrl: null,
  controlsJson: g.controls,
  rulesJson: g.rules,
  createdAt: CATALOG_EPOCH,
  updatedAt: CATALOG_EPOCH,
}));

export function getCatalogGame(slug: string): CatalogGame | undefined {
  return CATALOG_BY_SLUG.get(slug);
}
