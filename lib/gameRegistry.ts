
export interface PhaserGameMeta {
  id: number;
  title: string;
  slug: string;
  description: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  controls: Record<string, string>;
  rules: string[];
}

export const PHASER_GAMES: PhaserGameMeta[] = [
  {
    id: 13,
    title: "Neon Snake",
    slug: "neon-snake",
    description: "Navigate a glowing grid, gather food capsules, and watch your neon trail grow. Collect power-ups to warp time or double your points, but avoid smashing into yourself or the neon boundaries.",
    category: "Arcade",
    difficulty: "Easy",
    controls: {
      "Move": "Arrow Keys / WASD",
      "Swipe (Mobile)": "Any direction to steer",
      "Pause": "P key"
    },
    rules: [
      "Gather glowing grid cores to score points and grow longer.",
      "Eating glowing purple pills slows time; yellow pills double point values.",
      "Colliding with boundaries or your own tail terminates the run."
    ]
  },
  {
    id: 14,
    title: "Space Defender",
    slug: "space-defender",
    description: "Defend deep space from waves of glowing alien ships. Move your ship horizontally, collect power-ups, activate shield grids, and defeat massive boss craft spawning every 5 waves.",
    category: "Arcade",
    difficulty: "Medium",
    controls: {
      "Steer": "Mouse movement / Touch drag",
      "Shields": "Spacebar / Screen tap",
      "Pause": "P key"
    },
    rules: [
      "Blast alien ships before they bypass your position. Lose 1 life for every hit.",
      "Collect shield charges, rapid fire lasers, and bonus lives dropped by enemies.",
      "Survive boss assaults on every 5th wave increment."
    ]
  },
  {
    id: 15,
    title: "Memory Matrix",
    slug: "memory-matrix",
    description: "Exercise your cognitive memory recall. Watch a 4x4 matrix grid of glassmorphic tiles flash with vibrant neon tones and replicate the pattern exactly as shown.",
    category: "Puzzle",
    difficulty: "Medium",
    controls: {
      "Click Grid": "Left mouse click / Touch tap",
      "Toggle Mode": "Menu buttons"
    },
    rules: [
      "Watch the grid flash sequence carefully.",
      "Replicate the sequence in the exact order within the time limit.",
      "Chaining perfect rounds increases score multipliers and sequence length."
    ]
  }
];

export function isPhaserGame(slug: string): boolean {
  return PHASER_GAMES.some(g => g.slug === slug);
}

export function getPhaserGame(slug: string): PhaserGameMeta | undefined {
  return PHASER_GAMES.find(g => g.slug === slug);
}

/**
 * Helper to generate simple inline CSS gradients/SVG thumbnails for Phaser games
 */
export function getGameThumbnailUrl(slug: string): string {
  switch (slug) {
    case "neon-snake":
      return "linear-gradient(135deg, #a855f7 0%, #10b981 100%)";
    case "space-defender":
      return "linear-gradient(135deg, #06b6d4 0%, #e11d48 100%)";
    case "memory-matrix":
      return "linear-gradient(135deg, #f59e0b 0%, #3b82f6 100%)";
    default:
      return "linear-gradient(135deg, #18181b 0%, #27272a 100%)";
  }
}

/**
 * Local scores interface for localStorage caching when database offline
 */
export interface LocalScoreEntry {
  playerName: string;
  score: number;
  date: string;
}

export function saveLocalScore(gameSlug: string, playerName: string, score: number): LocalScoreEntry[] {
  try {
    const key = `game_hub_scores_${gameSlug}`;
    const raw = localStorage.getItem(key);
    const scores: LocalScoreEntry[] = raw ? JSON.parse(raw) : [];
    
    scores.push({
      playerName: playerName.toUpperCase().substring(0, 3),
      score,
      date: new Date().toISOString()
    });

    // Sort descending by score, limit to top 10
    scores.sort((a, b) => b.score - a.score);
    const sliced = scores.slice(0, 10);
    localStorage.setItem(key, JSON.stringify(sliced));
    return sliced;
  } catch (e) {
    console.warn("Could not save score locally:", e);
    return [];
  }
}

export function getLocalScores(gameSlug: string): LocalScoreEntry[] {
  try {
    const key = `game_hub_scores_${gameSlug}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Could not fetch scores locally:", e);
    return [];
  }
}
