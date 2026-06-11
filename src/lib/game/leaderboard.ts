import { and, asc, desc, gte, lt } from "drizzle-orm";
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

export async function getTopLeaderboardInDateRange(
  startDate: Date,
  endDate: Date,
  limit = LEADERBOARD_SIZE,
) {
  return db
    .select()
    .from(leaderboardEntries)
    .where(
      and(
        gte(leaderboardEntries.submittedAt, startDate),
        lt(leaderboardEntries.submittedAt, endDate),
      ),
    )
    .orderBy(desc(leaderboardEntries.finalScore), asc(leaderboardEntries.submittedAt))
    .limit(limit);
}

export function getTodayDateRange(now = new Date()) {
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);

  return { startDate, endDate };
}

export function getCurrentWeekDateRange(now = new Date()) {
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  return { startDate, endDate };
}

export async function getTopDailyLeaderboard(limit = LEADERBOARD_SIZE) {
  const { startDate, endDate } = getTodayDateRange();
  return getTopLeaderboardInDateRange(startDate, endDate, limit);
}

export async function getTopWeeklyLeaderboard(limit = LEADERBOARD_SIZE) {
  const { startDate, endDate } = getCurrentWeekDateRange();
  return getTopLeaderboardInDateRange(startDate, endDate, limit);
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
