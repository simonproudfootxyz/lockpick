export const LEADERBOARD_SIZE = 100;

export function scoreQualifiesForLeaderboard(
  finalScore: number,
  threshold: number | null,
): boolean {
  if (threshold === null) return true;
  return finalScore >= threshold;
}
