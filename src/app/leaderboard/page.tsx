import { getTopLeaderboard } from "@/lib/game/leaderboard";
import LeaderboardPageContent from "./_components/LeaderboardPageContent";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const entries = await getTopLeaderboard();

  return (
    <LeaderboardPageContent
      title="Leaderboard"
      subtitle="Top 100 all-time scores"
      entries={entries}
    />
  );
}
