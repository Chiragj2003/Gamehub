# Game Hub

**21 classic arcade and puzzle games, rebuilt for the browser. No downloads, no ads, no sign-up required — open the site and play.**

Post your high scores and climb the per-game leaderboards. Snake, Pong, and Tetris run on a new engine with touch controls and identical speed on every screen; the rest are being moved over.

---

## How to play

1. Open the site in any modern browser (Chrome, Firefox, Safari, Edge).
2. Pick a game from the home page, or filter by category — Arcade, Puzzle, Retro, Strategy, Action.
3. Hit **Play**. The game loads instantly inside the page.
4. When your run ends, enter three initials to post your score to the leaderboard.

**Pause with `P` or `Esc`** in Snake, Pong, and Tetris. They also pause automatically if you switch tabs, so a notification never costs you a run.

**On a phone or tablet:** Snake, Pong, and Tetris have full touch controls — swipe to steer, tap to rotate or jump, drag to move paddles. The other games currently need a keyboard; touch is coming as each one moves to the shared engine.

---

## The games

### Arcade
| Game | Controls | Goal |
|------|----------|------|
| **Snake** ✦ | Arrow keys / WASD · swipe | Eat food, grow longer, don't hit the walls or yourself. Speeds up as you grow. |
| **Flappy Bird** | Space | Flap through the gaps. |
| **Breakout** | Arrow keys | Smash every brick with the ball. |
| **Chrome Dino** | Space | Jump the cacti. Runs faster the longer you survive. |
| **Rock Paper Scissors** | Click | Best-of series against the CPU. |
| **Balance** | Arrow keys | Keep the platform level. |
| **Neon Snake** | Arrow keys / swipe | Snake with power-ups: slow time, double points, neon trails. |
| **Space Defender** | Mouse / touch drag · Space to shield | Waves of alien ships. Bosses every 5th wave. |

### Puzzle
| Game | Controls | Goal |
|------|----------|------|
| **Tetris** ✦ | ← → move · ↑ rotate · ↓ soft drop · Space hard drop · tap left/right/middle on touch | Clear lines. Standard 7-bag piece order, wall kicks, lock delay, next-piece preview, ghost piece. |
| **2048** | Arrow keys | Merge tiles to reach 2048. |
| **Memory Match** | Click | Flip pairs. |
| **Hangman** | Keyboard | Guess the word before the drawing finishes. |
| **Typing Speed Test** | Keyboard | Words per minute with accuracy tracking. |
| **Maze** | Arrow keys | Find the exit. Three hints per maze. |
| **Memory Matrix** | Click / tap | Repeat the flashed pattern. Sequences get longer each round. |

### Retro
| Game | Controls | Goal |
|------|----------|------|
| **Pong** ✦ | W/S or arrows · drag on touch | First to 11. Play the CPU, or **2 Player** on one keyboard — W/S vs. arrow keys. |
| **Space Invaders** | Arrow keys · Space to fire | Clear the descending formation. |
| **Pac-Man Style** | Arrow keys | Eat the dots, dodge the ghosts. |

### Strategy
| Game | Controls | Goal |
|------|----------|------|
| **Connect Four** | Click a column | Four in a row. |
| **Tic Tac Toe** | Click | Three in a row vs. the CPU. |

### Action
| Game | Controls | Goal |
|------|----------|------|
| **Asteroids** | Arrows to turn/thrust · Space to fire | Break the rocks, survive the field. |

✦ = on the shared engine: fixed-timestep, touch controls, pause, auto-pause on tab switch.

---

## Leaderboards and your library

- **Leaderboards** are per-game. Scores are validated on the server: anything impossible for the game or the time played is rejected, and submissions are rate-limited, so the boards reflect real runs.
- **My Library** keeps the games you've saved. Sign in (email + password) to sync it across devices; without an account it stays on the device you're using.
- Your score is also saved locally on your device, so a flaky connection never loses a run.

---

## For developers

Only read on if you want to run or modify the code.

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Supabase (Postgres + Auth), Phaser 3 for the three "Neon" games. Everything else is hand-written `<canvas>`.

```bash
npm install
cp .env.example .env.local   # add your Supabase URL + anon key
npm run dev
```

The site works without a database — it falls back to a built-in catalog — but leaderboards and accounts need Supabase. Run [`supabase.sql`](supabase.sql) in your project's SQL editor to create the tables and policies.

**Game engine.** Snake, Pong, and Tetris run on [`lib/game-engine/`](lib/game-engine/); the remaining canvas games are being migrated onto it one at a time:

- `useGameLoop` — fixed-timestep simulation. Games advance in exact `1/60 s` steps regardless of display refresh rate, so a 144 Hz monitor and a 60 Hz one play identically. Auto-pauses on tab blur and caps catch-up after stalls.
- `useGameInput` — keyboard, touch swipe, tap, and pointer resolved to a small set of logical actions (`up`, `down`, `left`, `right`, `primary`, `pause`). Includes a direction queue for grid games and press-edge detection for actions that must not auto-repeat.
- `useGameCanvas` — device-pixel-ratio scaling so games render sharp on retina and phone screens.

To add a game: create `components/games/YourGame.tsx` using those hooks (Snake is the smallest reference), register it in `app/games/[slug]/embed/GameEmbedClient.tsx`, and add a catalog entry to `FALLBACK_GAMES` in `lib/db-queries.ts` plus a score ceiling in `lib/score-validation.ts`.

**Scripts:** `npm run build` · `npm run lint` · `npm run db:generate` / `db:migrate` (Drizzle) · `npm run db:seed`

---

Built with Next.js. Deployed on Vercel.
