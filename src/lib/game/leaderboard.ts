import { and, asc, desc, eq, gt, gte, lte, lt, or, sql } from "drizzle-orm";
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

export async function getOverallRankForEntry({
  id,
  finalScore,
  submittedAt,
}: {
  id: string;
  finalScore: number;
  submittedAt: Date;
}) {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leaderboardEntries)
    .where(
      or(
        gt(leaderboardEntries.finalScore, finalScore),
        and(
          eq(leaderboardEntries.finalScore, finalScore),
          or(
            lt(leaderboardEntries.submittedAt, submittedAt),
            and(
              eq(leaderboardEntries.submittedAt, submittedAt),
              lte(leaderboardEntries.id, id),
            ),
          ),
        ),
      ),
    );

  return result?.count ?? 1;
}
