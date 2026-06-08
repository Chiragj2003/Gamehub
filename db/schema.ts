import { pgTable, serial, varchar, text, real, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  difficulty: varchar("difficulty", { length: 50 }).notNull(), // 'Easy' | 'Medium' | 'Hard'
  rating: real("rating").notNull(),
  plays: integer("plays").default(0).notNull(),
  thumbnailUrl: text("thumbnail_url"),
  iframeUrl: text("iframe_url"),
  controlsJson: jsonb("controls_json").default({}).notNull(), // e.g. { "ArrowUp": "Move Up" }
  rulesJson: jsonb("rules_json").default([]).notNull(), // e.g. ["Rule 1", "Rule 2"]
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userGames = pgTable("user_games", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }), // nullable for anonymous local storage syncing
  gameId: integer("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
});

export const gameAnalytics = pgTable("game_analytics", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  completed: boolean("completed").default(false).notNull(),
  score: integer("score"),
  playerName: varchar("player_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type UserGame = typeof userGames.$inferSelect;
export type GameAnalytic = typeof gameAnalytics.$inferSelect;
