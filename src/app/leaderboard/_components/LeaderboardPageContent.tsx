import Link from "@/components/Link";
import "@/GameSetup.css";
import type { DbLeaderboardEntry } from "@/lib/db/schema";

function formatDuration(ms: number | null | undefined) {
  if (ms == null) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

type LeaderboardPageContentProps = {
  title: string;
  subtitle: string;
  entries: DbLeaderboardEntry[];
};

export default function LeaderboardPageContent({
  title,
  subtitle,
  entries,
}: LeaderboardPageContentProps) {
  return (
    <div className="game-setup">
      <div className="setup-container">
        <p className="leaderboard-subtitle">
          <Link href="/">Back to Home</Link>
        </p>
        <h1>{title}</h1>

        <p className="leaderboard-subtitle">{subtitle}</p>
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
      </div>
    </div>
  );
}
