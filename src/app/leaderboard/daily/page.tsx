import { getTopDailyLeaderboard } from "@/lib/game/leaderboard";
import LeaderboardPageContent from "../_components/LeaderboardPageContent";

export const dynamic = "force-dynamic";

export default async function DailyLeaderboardPage() {
  const entries = await getTopDailyLeaderboard();

  return (
    <LeaderboardPageContent
      title="Daily Leaderboard"
      subtitle="Top 100 scores submitted today"
      entries={entries}
    />
  );
}
