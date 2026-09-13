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
import { CATALOG } from "../lib/catalog";

async function seed() {
  console.log(`Seeding ${CATALOG.length} games...`);

  for (const g of CATALOG) {
    await db
      .insert(games)
      .values({
        id: g.id,
        title: g.title,
        slug: g.slug,
        description: g.description,
        category: g.category,
        difficulty: g.difficulty,
        rating: g.rating,
        plays: g.plays,
        thumbnailUrl: null,
        iframeUrl: null,
        maxScore: g.maxScore,
        controlsJson: g.controls,
        rulesJson: g.rules,
      })
      .onConflictDoUpdate({
        target: games.slug,
        set: {
          title: g.title,
          description: g.description,
          category: g.category,
          difficulty: g.difficulty,
          controlsJson: g.controls,
          rulesJson: g.rules,
          maxScore: g.maxScore,
          updatedAt: new Date(),
        },
      });
    console.log(`  ${g.title}`);
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
