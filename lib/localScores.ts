/**
 * Per-device high scores kept in localStorage.
 *
 * Every score is saved here before it is sent to the server, so a run is never
 * lost to a flaky connection, and the leaderboard can show the player's own
 * best even when the database is unreachable.
 */

export interface LocalScoreEntry {
  playerName: string;
  score: number;
  date: string;
}

const MAX_ENTRIES = 10;

function keyFor(gameSlug: string) {
  return `game_hub_scores_${gameSlug}`;
}

export function saveLocalScore(gameSlug: string, playerName: string, score: number): LocalScoreEntry[] {
  try {
    const scores = getLocalScores(gameSlug);
    scores.push({
      playerName: playerName.toUpperCase().slice(0, 3),
      score,
      date: new Date().toISOString(),
    });
    scores.sort((a, b) => b.score - a.score);
    const top = scores.slice(0, MAX_ENTRIES);
    localStorage.setItem(keyFor(gameSlug), JSON.stringify(top));
    return top;
  } catch (e) {
    console.warn("Could not save score locally:", e);
    return [];
  }
}

export function getLocalScores(gameSlug: string): LocalScoreEntry[] {
  try {
    const raw = localStorage.getItem(keyFor(gameSlug));
    return raw ? (JSON.parse(raw) as LocalScoreEntry[]) : [];
  } catch (e) {
    console.warn("Could not read local scores:", e);
    return [];
  }
}
