# Game Hub

**Ten classic arcade and puzzle games, rebuilt for the browser. No downloads, no ads, no sign-up required — open the site and play.**

Every game runs at the same speed on every screen, works on phones and tablets with touch controls, pauses when you switch tabs, and posts your high scores to a per-game leaderboard.

---

## How to play

1. Open the site in any modern browser — Chrome, Firefox, Safari, Edge — on desktop or mobile.
2. Pick a game from the home page, or filter by category: Arcade, Puzzle, Retro, Action.
3. Hit **Play**. The game loads instantly inside the page.
4. When your run ends, enter three initials to post your score.

**Pause any game with `P` or `Esc`.** Games also pause on their own if you switch tabs or the window loses focus, so a notification never costs you a run.

**On a phone or tablet:** swipe to steer, tap to jump or fire, drag to move paddles. Every game works without a keyboard.

---

## The games

| Game | Controls | What you're doing |
|------|----------|-------------------|
| **Snake** | Arrows / WASD · swipe | Eat, grow, don't crash. Speeds up with every pellet. |
| **Pong** | W/S or arrows · drag | First to 11 vs. the CPU — or **2 Player** on one keyboard, W/S vs. arrows. |
| **Tetris** | ← → move · ↑ rotate · ↓ soft drop · Space hard drop · tap on touch | 7-bag piece order, wall kicks, lock delay, ghost piece, next-piece preview. |
| **Flappy Bird** | Space / tap | Thread the gaps. Pipes speed up every five. |
| **Breakout** | ← → / mouse / drag · Space or tap to launch | Clear the bricks. Each level adds rows and speed; top rows go two-hit from level 2. |
| **Asteroids** | ← → turn · ↑ thrust · Space fire · hold-drag on touch | Split the rocks, survive the waves. Small rocks are fast and worth the most. |
| **Space Invaders** | ← → / mouse / drag · Space fire (hold for auto) | The formation speeds up as it thins. Your shots can intercept theirs. |
| **Pac-Man Style** | Arrows / WASD · swipe | Four ghosts with real chase AI. Power pellets flip it: 200, 400, 800, 1600. |
| **2048** | Arrows / WASD · swipe | Merge to 2048, then keep going. Best score saved on your device. |
| **Chrome Dino** | Space / tap jump · ↓ / swipe-down duck | Jump the cacti, duck the birds. Speed never stops climbing. |

---

## Leaderboards and your library

- **Leaderboards** are per-game, top 10. Scores are validated server-side — anything impossible for the game or the time played is rejected, and submissions are rate-limited — so what you see is real runs.
- **My Library** keeps the games you've saved. Sign in with email to sync across devices; without an account it stays on the device you're using.
- Every score is also saved locally on your device first, so a dropped connection never loses a run.

---

## For developers

Only read on if you want to run or modify the code.

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Supabase (Postgres + Auth). Every game is hand-written `<canvas>` (2048 is DOM) on a small shared engine — no game framework.

```bash
npm install
cp .env.example .env.local   # add your Supabase URL + anon key
npm run dev
```

The site works without a database — it falls back to the built-in catalog — but leaderboards and accounts need Supabase. Run [`supabase.sql`](supabase.sql) in your project's SQL editor to create the tables, policies, and seed the games.

### Game engine — [`lib/game-engine/`](lib/game-engine/)

- **`useGameLoop`** — fixed-timestep simulation. Games advance in exact steps regardless of display refresh rate, so a 144 Hz monitor and a 60 Hz one play identically. Auto-pauses on tab/window blur, caps catch-up after stalls.
- **`useGameInput`** — keyboard, touch swipe, tap, and pointer resolved to logical actions (`up`, `down`, `left`, `right`, `primary`, `pause`). Direction queue for grid games, press counting so rapid taps don't collapse, raw key access for shared-keyboard two-player, and an event callback for turn-based games.
- **`useGameCanvas`** — device-pixel-ratio backing store so games are sharp on retina and phone screens.
- **`useLatest`** — ref sync for callbacks the loop reads, compatible with the React Compiler.

### Adding a game

1. Add an entry to [`lib/catalog.ts`](lib/catalog.ts) — title, slug, controls, rules, and the score ceiling used for validation. This is the single source of truth.
2. Build `components/games/YourGame.tsx` with the engine hooks. [Snake](components/games/Snake.tsx) is the smallest reference; [Pacman](components/games/Pacman.tsx) shows grid movement and AI.
3. Register it in [`app/games/[slug]/embed/GameEmbedClient.tsx`](app/games/[slug]/embed/GameEmbedClient.tsx) and export from [`components/games/index.ts`](components/games/index.ts).
4. Run `npx tsx scripts/gen-seed-sql.ts` to regenerate the SQL seed, then re-run `supabase.sql`.

**Scripts:** `npm run build` · `npm run lint` · `npm run db:seed` · `npx tsx scripts/gen-seed-sql.ts`

---

Built with Next.js. Deployed on Vercel.
