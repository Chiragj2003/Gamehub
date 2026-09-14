# Game Hub

**Eleven classic games, rebuilt for the browser. No downloads, no ads, no sign-up required — open the site and play.**

Every game runs at the same speed on every screen, works on phones and tablets with touch controls, pauses when you switch tabs, and posts your high scores to a per-game leaderboard.

---

## How to play

1. Open the site in any modern browser — Chrome, Firefox, Safari, Edge — on desktop or mobile.
2. Pick a game from the home page, or filter by category: Arcade, Puzzle, Retro, Action.
3. Hit **Play**. The game loads instantly inside the page.
4. When your run ends, enter three initials to post your score.

**Pause any game with `P` or `Esc`.** Games also pause on their own if you switch tabs or the window loses focus, so a notification never costs you a run.

**Light or dark:** the sun/moon in the header switches themes and remembers your choice; with no choice made, the site follows your system. Press `⌘K` / `Ctrl+K` anywhere to search.

**On a phone or tablet:** tapping Play opens the game fullscreen — turn your phone sideways for the biggest view. Swipe to steer, tap to jump or fire, drag to move paddles. Tetris: tap to rotate, swipe left/right to move, swipe down to drop, swipe up to hold. Tap a paused game to resume.

---

## The games

| Game | Controls | What you're doing |
|------|----------|-------------------|
| **Snake** | Arrows / WASD · swipe | Eat, grow, don't crash. Speeds up with every pellet. |
| **Pong** | W/S or arrows · drag | First to 11 vs. the CPU, **2 Player** on one keyboard, or **Online** — create a room, share the 4-letter code. |
| **Tetris** | ← → move · ↑/X rotate · Z rotate back · ↓ soft drop · Space hard drop · C hold · touch: tap rotate, swipe | Full SRS rotation with wall kicks and T-spin scoring, 7-bag order, hold, lock delay, ghost, next preview. |
| **Flappy Bird** | Space / tap | Thread the gaps. Pipes speed up every five. |
| **Breakout** | ← → / mouse / drag · Space or tap to launch | Clear the bricks. Each level adds rows and speed; top rows go two-hit from level 2. |
| **Asteroids** | ← → turn · ↑ thrust · Space fire · hold-drag on touch | Split the rocks, survive the waves. Small rocks are fast and worth the most. |
| **Space Invaders** | ← → / mouse / drag · Space fire (hold for auto) | The formation speeds up as it thins. Your shots can intercept theirs. |
| **Pac-Man Style** | Arrows / WASD · swipe | Four ghosts with real chase AI. Power pellets flip it: 200, 400, 800, 1600. |
| **2048** | Arrows / WASD · swipe | Merge to 2048, then keep going. Best score saved on your device. |
| **Chrome Dino** | Space / tap jump · ↓ / swipe-down duck | Jump the cacti, duck the birds. Speed never stops climbing. |
| **Pen Fight** | Drag back from a pen and release · ← → aim · ↑ ↓ power · Space flick · Shift switch pen | The school-desk game in 3D. Knock the other side's pens off the edge. Seven pens with their own weight, speed, grip and bounce. **vs CPU** for the leaderboard (rounds get harder), **2 Player** pass-and-play (the camera swings to whoever's up), or **Online** with a 4-letter room code. |

---

## Leaderboards and your library

- **Leaderboards** are per-game, top 10. Every run opens a server-side session when you press Play; a score can only be attached to that session, the server measures the play time itself, and anything impossible for the game or the time is rejected. Submissions are rate-limited. Your own best on this device is shown separately, never mixed into the global board.
- **My Library** keeps the games you've saved. Sign in with email and it follows your account across devices; anything you saved before signing in is merged in. Without an account it stays on the device.
- **Your account** (`/account`) shows your sign-in, lets you change your password, sign out, or delete the account and everything tied to it. Forgot your password? The sign-in dialog has a reset link.
- Every score is also saved locally on your device first, so a dropped connection never loses a run.

---

## For developers

Only read on if you want to run or modify the code.

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Supabase (Postgres + Auth). Every game is hand-written `<canvas>` (2048 is DOM) on a small shared engine — no game framework. Pen Fight is the exception: it renders with Three.js (loaded only on its page) over its own rigid-body physics in `components/games/penfight/`.

**Design system:** every colour is a CSS custom property in [`app/globals.css`](app/globals.css) (`--bg`, `--surface`, `--ink`, `--brand`, per-category and per-difficulty accents), with light as the base and `[data-theme="dark"]` overriding. Tailwind utilities read them (`bg-page`, `text-ink`, `border-line`, `text-cat-arcade`…). Glass surfaces are the `.glass`, `.glass-strong`, `.glass-card` utilities; CTAs are `.btn-glow` / `.btn-quiet`. The game canvases are deliberately dark in both themes. The theme is set before first paint by an inline script (`lib/theme.ts`).

```bash
npm install
cp .env.example .env.local   # add your Supabase URL + anon key
npm run dev
```

The site runs without a database — games, local scores and the device library all work — but **leaderboards, accounts, cross-device library and online Pong need Supabase.**

### Connect your database

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard) (free tier is fine).
2. SQL Editor → New query → paste the whole of [`supabase.sql`](supabase.sql) → Run. Safe to re-run; it creates tables, policies, the stats view, and seeds the eleven games.
3. Project Settings → API: copy the **Project URL** and the **anon / publishable key**.
4. Vercel → your project → Settings → Environment Variables: set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for **all** environments (Production, Preview, Development), plus `SUPABASE_SERVICE_ROLE_KEY` (server-only; it powers account deletion). Redeploy.
5. Confirm: open `https://your-site/api/health`. It reports whether the database is reachable, how many games it holds, and what to fix if not.

Online Pong and online Pen Fight use Supabase Realtime, which is on by default. To offer Google sign-in, enable the Google provider in Supabase → Authentication → Providers, then set `NEXT_PUBLIC_AUTH_GOOGLE=1`. Optional: the Upstash variables in `.env.example` share rate limits across serverless instances.

**Which games do people finish?** In the SQL editor: `SELECT * FROM game_stats ORDER BY starts DESC;` — starts, scored runs, completion %, average play time and top score per game.

The site ships `robots.txt`, `sitemap.xml`, a web-app manifest with generated icons (installable on phones), an Open Graph image, security headers, a branded 404 and error page, and a skip-to-content link. Set `NEXT_PUBLIC_SITE_URL` once you have a custom domain so those point at it.

**Before every push, run `npm run verify`.** It typechecks, lints, and builds with `.env.local` hidden and a clean `.next` — the same conditions as a Vercel Preview deploy.

### Game engine — [`lib/game-engine/`](lib/game-engine/)

- **`useGameLoop`** — fixed-timestep simulation. Games advance in exact steps regardless of display refresh rate, so a 144 Hz monitor and a 60 Hz one play identically. Auto-pauses on tab/window blur, caps catch-up after stalls.
- **`useGameInput`** — keyboard, touch swipe, tap, and pointer resolved to logical actions (`up`, `down`, `left`, `right`, `primary`, `pause`). Direction queue for grid games, press counting (`consumePress`, `consumeKey`) so a tap between two ticks is never lost, raw key access for shared-keyboard two-player, and an event callback for turn-based games.
- **`useGameCanvas`** — device-pixel-ratio backing store so games are sharp on retina and phone screens.
- **`useLatest`** — ref sync for callbacks the loop reads, compatible with the React Compiler.

### Adding a game

1. Add an entry to [`lib/catalog.ts`](lib/catalog.ts) — title, slug, controls, rules, and the score ceiling used for validation. This is the single source of truth.
2. Build `components/games/YourGame.tsx` with the engine hooks. [Snake](components/games/Snake.tsx) is the smallest reference; [Pacman](components/games/Pacman.tsx) shows grid movement and AI.
3. Register it in [`components/GameRenderer.tsx`](components/GameRenderer.tsx) and export from [`components/games/index.ts`](components/games/index.ts).
4. Run `npm run seed:sql` to regenerate the SQL seed, then re-run `supabase.sql`.

Games render directly in the page inside an error boundary; a crash in one game shows a restart button instead of taking the page down.

**Scripts:** `npm run verify` · `npm run build` · `npm run lint` · `npm run db:seed` · `npm run seed:sql`

---

Built with Next.js. Deployed on Vercel.
