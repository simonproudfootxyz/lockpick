import Link from "next/link";
import { getTopLeaderboard } from "@/lib/game/leaderboard";
import "@/GameSetup.css";

export const dynamic = "force-dynamic";

function formatDuration(ms: number | null | undefined) {
  if (ms == null) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default async function LeaderboardPage() {
  const entries = await getTopLeaderboard();

  return (
    <div className="game-setup">
      <div className="setup-container">
        <h1>Leaderboard</h1>
        <p className="leaderboard-subtitle">Top 100 scores by final score</p>
        <div className="leaderboard-table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Score</th>
                <th>Turns</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5}>No scores yet. Be the first!</td>
                </tr>
              ) : (
                entries.map((entry, index) => (
                  <tr key={entry.id}>
                    <td>{index + 1}</td>
                    <td>{entry.displayName}</td>
                    <td>{entry.finalScore}</td>
                    <td>{entry.totalTurns}</td>
                    <td>{formatDuration(entry.durationMs)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Link href="/" className="setup-auth-links">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
