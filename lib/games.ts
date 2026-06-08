import * as queries from "./db-queries";

export async function getAllGames() {
  return await queries.queryAllGames();
}

export async function getFeaturedGames() {
  return await queries.queryFeaturedGames();
}

export async function getGameBySlug(slug: string) {
  return await queries.queryGameBySlug(slug);
}

export async function getGamesByCategory(category: string) {
  return await queries.queryGamesByCategory(category);
}

export async function searchGames(query: string) {
  if (!query || !query.trim()) {
    return await queries.queryAllGames();
  }
  return await queries.querySearchGames(query.trim());
}

export async function incrementPlayCount(id: number) {
  return await queries.incrementGamePlayCount(id);
}

// Re-export query bindings for library, analytics, and leaderboards
export {
  queryUserLibrary,
  insertUserGame,
  deleteUserGame,
  insertGameAnalytics,
  queryLeaderboard,
  updateSessionScoreAndPlayer,
  insertSessionScore,
  updateGameAnalyticsDuration,
  FALLBACK_GAMES
} from "./db-queries";
export { type Game } from "../db";
