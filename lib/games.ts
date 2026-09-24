import * as queries from "./db-queries";
import { sortGames } from "./catalog";

export async function getAllGames() {
  return sortGames(await queries.queryAllGames());
}

export async function getFeaturedGames() {
  return await queries.queryFeaturedGames();
}

export async function getGameBySlug(slug: string) {
  return await queries.queryGameBySlug(slug);
}

export async function getGamesByCategory(category: string) {
  return sortGames(await queries.queryGamesByCategory(category));
}

export async function searchGames(query: string) {
  if (!query || !query.trim()) {
    return sortGames(await queries.queryAllGames());
  }
  return sortGames(await queries.querySearchGames(query.trim()));
}

export async function incrementPlayCount(id: number) {
  return await queries.incrementGamePlayCount(id);
}

export { queryLeaderboard, FALLBACK_GAMES } from "./db-queries";
export { type Game } from "./db-queries";
