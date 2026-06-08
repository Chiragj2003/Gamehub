import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL env variable is not set. Using local database string as fallback.");
}

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/game_hub";
const client = neon(connectionString);

export const db = drizzle(client, { schema });
export * from "./schema";
