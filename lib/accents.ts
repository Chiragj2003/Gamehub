/**
 * The site's accent system is its game taxonomy: each category and difficulty
 * owns a colour, read from the theme tokens so both modes stay in step.
 */
export function categoryColor(category: string): string {
  switch (category.toLowerCase()) {
    case "arcade":
      return "var(--cat-arcade)";
    case "retro":
      return "var(--cat-retro)";
    case "puzzle":
      return "var(--cat-puzzle)";
    case "action":
      return "var(--cat-action)";
    default:
      return "var(--brand)";
  }
}

export function difficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return "var(--diff-easy)";
    case "medium":
      return "var(--diff-medium)";
    case "hard":
      return "var(--diff-hard)";
    default:
      return "var(--ink-2)";
  }
}
