import { Bricolage_Grotesque } from "next/font/google";

/**
 * Pen Fight's display face — squarish and a little wonky, the way lettering on
 * a stationery box is.
 *
 * Declared here rather than in the root layout so it ships with the game's own
 * chunk. In the layout it was preloaded on every page of the site, ~40 KB that
 * nothing outside this one game renders.
 */
export const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});
