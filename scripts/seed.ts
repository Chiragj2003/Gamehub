
// Load env variables from .env.local natively in Node.js
try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(".env.local");
  }
} catch (error) {
  console.warn("Could not load .env.local file natively:", error);
}

import { db } from "../db";
import { games } from "../db/schema";

const gameList = [
  {
    title: "Snake",
    slug: "snake",
    description: "The retro block-eating serpent returns. Remastered with modern visuals, fluid keyboard controls, and local high scores. Navigate the field, eat food, and grow longer without crashing into the walls or your own tail.",
    category: "Arcade",
    difficulty: "Easy",
    rating: 4.8,
    plays: 14820,
    thumbnailUrl: "",
    iframeUrl: "/games/snake/embed",
    controlsJson: {
      movement: "Arrow Keys / WASD",
      pause: "P key",
      restart: "R key",
    },
    rulesJson: [
      "Navigate the snake to eat glowing red food pellets.",
      "Each food pellet increases your length and speeds up the game.",
      "Game over if you collide with the border walls or your own body.",
    ],
  },
  {
    title: "Pong",
    slug: "pong",
    description: "Experience the granddaddy of arcade games. Take control of your paddle and bounce the ball past your opponent. Play against a challenging local AI and claim retro table-tennis glory.",
    category: "Retro",
    difficulty: "Easy",
    rating: 4.5,
    plays: 8900,
    thumbnailUrl: "",
    iframeUrl: "/games/pong/embed",
    controlsJson: {
      "player 1 (Left)": "W / S keys",
      "player 2 (Right)": "Arrow Up / Down keys",
      pause: "P key",
    },
    rulesJson: [
      "Bounce the ball back and forth using your paddles.",
      "Score a point when the ball passes the opponent's screen edge.",
      "The first player to score 11 points wins the match.",
    ],
  },
  {
    title: "Tetris",
    slug: "tetris",
    description: "The ultimate block-fitting puzzle classic. Rotate, shift, and drop falling tetrominoes to clear complete horizontal lines. Manage speed tiers as the board fills up rapidly.",
    category: "Puzzle",
    difficulty: "Medium",
    rating: 4.9,
    plays: 23150,
    thumbnailUrl: "",
    iframeUrl: "/games/tetris/embed",
    controlsJson: {
      move: "Left / Right Arrows",
      rotate: "Up Arrow / X key",
      "soft drop": "Down Arrow",
      "hard drop": "Spacebar",
      hold: "C key / Shift",
    },
    rulesJson: [
      "Arrange falling puzzle blocks to form complete horizontal lines.",
      "Completed lines are cleared and award score multipliers.",
      "Game ends immediately when blocks stack up to the top of the grid.",
    ],
  },
  {
    title: "Flappy Bird",
    slug: "flappy-bird",
    description: "Tap to flap and navigate through narrow green pipe structures. Fluid physics, timing-based jumps, and high-difficulty scrolling challenges will test your absolute reflexes.",
    category: "Arcade",
    difficulty: "Medium",
    rating: 4.6,
    plays: 16200,
    thumbnailUrl: "",
    iframeUrl: "/games/flappy-bird/embed",
    controlsJson: {
      flap: "Spacebar / Left Mouse Click",
      pause: "P key",
    },
    rulesJson: [
      "Tap flap controls to keep the bird flying upwards.",
      "Avoid colliding with the floating green pipes or the ground.",
      "Score one point for every set of pipes successfully navigated.",
    ],
  },
  {
    title: "Breakout",
    slug: "breakout",
    description: "Retro brick-breaker action. Control a sliding paddle to keep a bouncing ball in play, shattering rows of colorful neon bricks with distinct power-ups and physics calculations.",
    category: "Arcade",
    difficulty: "Medium",
    rating: 4.7,
    plays: 12050,
    thumbnailUrl: "",
    iframeUrl: "/games/breakout/embed",
    controlsJson: {
      move: "Left / Right Arrows or Mouse Move",
      release: "Spacebar / Left Click",
    },
    rulesJson: [
      "Destroy all bricks on the top board to clear the level.",
      "Keep the ball in play by deflecting it with your paddle.",
      "Losing all lives causes a game over.",
    ],
  },
  {
    title: "Asteroids",
    slug: "asteroids",
    description: "Pilot your spacecraft in a chaotic asteroid field. Thrust through weightless space, rotate, and blast giant space rocks into smaller fragments while avoiding screen-wrapping collisions.",
    category: "Action",
    difficulty: "Hard",
    rating: 4.8,
    plays: 19400,
    thumbnailUrl: "",
    iframeUrl: "/games/asteroids/embed",
    controlsJson: {
      rotate: "Left / Right Arrows",
      thrust: "Up Arrow",
      shoot: "Spacebar",
      hyperspace: "Shift key",
    },
    rulesJson: [
      "Shoot asteroids to break them down and score points.",
      "Dodge moving debris and alien saucers that shoot back.",
      "Crashing into any object destroys your ship and costs a life.",
    ],
  },
  {
    title: "Space Invaders",
    slug: "space-invaders",
    description: "Defend Earth against descending grids of alien invaders. Take cover behind bunkers and take out the alien columns before they reach the ground level.",
    category: "Retro",
    difficulty: "Hard",
    rating: 4.8,
    plays: 15600,
    thumbnailUrl: "",
    iframeUrl: "/games/space-invaders/embed",
    controlsJson: {
      move: "Left / Right Arrow keys",
      shoot: "Spacebar",
    },
    rulesJson: [
      "Eliminate all aliens in the grid to secure the stage.",
      "Use shielding bunkers to take cover from incoming alien fire.",
      "If any alien invader reaches the bottom line, it's instant game over.",
    ],
  },
  {
    title: "Pac-Man Style",
    slug: "pacman",
    description: "A legendary maze-chase experience. Gobble up yellow dots in a neon maze while escaping from four colorful ghosts with unique tracking behaviors.",
    category: "Retro",
    difficulty: "Hard",
    rating: 4.7,
    plays: 21100,
    thumbnailUrl: "",
    iframeUrl: "/games/pacman/embed",
    controlsJson: {
      navigate: "Arrow Keys / WASD",
    },
    rulesJson: [
      "Eat all pellets in the maze to complete the level.",
      "Avoid getting caught by the chasing ghosts.",
      "Eat power pellets to turn the ghosts blue and eat them for bonus scores.",
    ],
  },
  {
    title: "Memory Match",
    slug: "memory-match",
    description: "A clean card-matching brain puzzle. Flip tiles to reveal hidden neon glyphs and pair them up in as few moves as possible. Improves focus and cognitive recall.",
    category: "Puzzle",
    difficulty: "Easy",
    rating: 4.4,
    plays: 9400,
    thumbnailUrl: "",
    iframeUrl: "/games/memory-match/embed",
    controlsJson: {
      select: "Left Mouse Click",
    },
    rulesJson: [
      "Flip two cards face up at a time.",
      "If the icons match, the cards remain face up.",
      "Clear the entire board in the fewest moves to set a high score.",
    ],
  },
  {
    title: "Connect Four",
    slug: "connect-four",
    description: "The classic vertical drop board game. Drop your red or yellow discs into columns to form a straight line of four before your opponent blocks you.",
    category: "Strategy",
    difficulty: "Easy",
    rating: 4.5,
    plays: 10200,
    thumbnailUrl: "",
    iframeUrl: "/games/connect-four/embed",
    controlsJson: {
      select: "Left Mouse Click on Column",
    },
    rulesJson: [
      "Players take turns dropping one colored token from the top.",
      "The token falls to the lowest available space in the column.",
      "First to connect four tokens horizontally, vertically, or diagonally wins.",
    ],
  },
  {
    title: "Tic Tac Toe",
    slug: "tic-tac-toe",
    description: "Quick classic paper-and-pencil grid game. Face off against an unbeatable AI or play locally in an elegant neon 3x3 layout.",
    category: "Strategy",
    difficulty: "Easy",
    rating: 4.2,
    plays: 7800,
    thumbnailUrl: "",
    iframeUrl: "/games/tic-tac-toe/embed",
    controlsJson: {
      place: "Left Mouse Click on Empty Cell",
    },
    rulesJson: [
      "Place your symbol (X or O) in any empty grid cell.",
      "Form a line of three symbols horizontally, vertically, or diagonally to win.",
      "If all cells are filled and no player has three in a line, the game is a draw.",
    ],
  },
  {
    title: "2048",
    slug: "2048",
    description: "Slide and merge sliding number blocks. When two tiles with the same number touch, they merge into one. Work your way up to the ultimate 2048 tile.",
    category: "Puzzle",
    difficulty: "Medium",
    rating: 4.8,
    plays: 24500,
    thumbnailUrl: "",
    iframeUrl: "/games/2048/embed",
    controlsJson: {
      slide: "Arrow Keys / WASD or Swipe gestures",
    },
    rulesJson: [
      "Slide the board to shift all tiles in one direction.",
      "Tiles with identical values merge into a single tile of their sum.",
      "Keep merging tiles to reach the legendary 2048 block without running out of moves.",
    ],
  },
  {
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
      "Colliding with boundaries or your own tail terminates the run.",
    ],
  },
  {
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
      "Survive boss assaults on every 5th wave increment.",
    ],
  },
  {
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
      "Chaining perfect rounds increases score multipliers and sequence length.",
    ],
  },
];

async function seed() {
  console.log("Seeding started...");
  try {
    for (const item of gameList) {
      // Upsert by slug
      await db.insert(games).values({
        title: item.title,
        slug: item.slug,
        description: item.description,
        category: item.category,
        difficulty: item.difficulty,
        rating: item.rating,
        plays: item.plays,
        thumbnailUrl: item.thumbnailUrl,
        iframeUrl: item.iframeUrl,
        controlsJson: item.controlsJson,
        rulesJson: item.rulesJson,
      }).onConflictDoUpdate({
        target: games.slug,
        set: {
          title: item.title,
          description: item.description,
          category: item.category,
          difficulty: item.difficulty,
          rating: item.rating,
          plays: item.plays,
          thumbnailUrl: item.thumbnailUrl,
          iframeUrl: item.iframeUrl,
          controlsJson: item.controlsJson,
          rulesJson: item.rulesJson,
          updatedAt: new Date(),
        }
      });
      console.log(`Seeded game: ${item.title}`);
    }
    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
