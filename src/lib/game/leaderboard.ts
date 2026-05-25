import { desc, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { leaderboardEntries } from "@/lib/db/schema";
import {
  LEADERBOARD_SIZE,
  scoreQualifiesForLeaderboard,
} from "./leaderboardQualification";

export { LEADERBOARD_SIZE, scoreQualifiesForLeaderboard };

export async function getTopLeaderboard(limit = LEADERBOARD_SIZE) {
  return db
    .select()
    .from(leaderboardEntries)
    .orderBy(desc(leaderboardEntries.finalScore), asc(leaderboardEntries.submittedAt))
    .limit(limit);
}

export async function getQualifyingThreshold(): Promise<number | null> {
  const rows = await getTopLeaderboard(LEADERBOARD_SIZE);
  if (rows.length < LEADERBOARD_SIZE) return null;
  return rows[rows.length - 1]?.finalScore ?? null;
}

export async function getRankForScore(finalScore: number): Promise<number> {
  const rows = await getTopLeaderboard(LEADERBOARD_SIZE);
  const higherCount = rows.filter((r) => r.finalScore > finalScore).length;
  return higherCount + 1;
}
