/**
 * Canonical site URL for metadata, sitemaps, and social cards.
 * Vercel exposes the production hostname at build time; override with
 * NEXT_PUBLIC_SITE_URL once a custom domain is attached.
 */
export const SITE_NAME = "Game Hub";
export const SITE_TAGLINE = "Ten classic arcade and puzzle games, rebuilt for the browser. No downloads, no sign-up. Tap and play.";

export const SITE_URL = (() => {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
})();
