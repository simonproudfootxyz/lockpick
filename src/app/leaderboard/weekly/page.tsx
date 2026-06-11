import { getTopWeeklyLeaderboard } from "@/lib/game/leaderboard";
import LeaderboardPageContent from "../_components/LeaderboardPageContent";

export const dynamic = "force-dynamic";

export default async function WeeklyLeaderboardPage() {
  const entries = await getTopWeeklyLeaderboard();

  return (
    <LeaderboardPageContent
      title="Weekly Leaderboard"
      subtitle="Top 100 scores submitted this week (Sunday-Saturday)"
      entries={entries}
    />
  );
}
