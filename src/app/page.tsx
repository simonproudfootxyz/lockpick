import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { startGame } from "@/actions/game";
import StartGameSubmitButton from "@/components/StartGameSubmitButton";
import RulesContent from "@/components/RulesContent";
import LockpickLogo from "@/assets/LockpickLogo.svg";
import "@/GameSetup.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="game-setup">
      <div className="setup-container">
        <h1>
          <img src={LockpickLogo.src} alt="Lockpick" />
        </h1>
        <div className="setup-options">
          <form action={startGame}>
            <StartGameSubmitButton
              idleLabel="Start Game"
              pendingLabel="Starting Game..."
            />
          </form>
          <div className="setup-auth-links">
            {session?.user ? (
              <>
                <p>Signed in as {session.user.username}</p>
                <Link href="/account">Account</Link>
              </>
            ) : (
              <>
                <Link href="/sign-in">Sign in</Link>
                <Link href="/sign-up">Create account</Link>
              </>
            )}
            <Link href="/leaderboard">Leaderboard</Link>
          </div>
        </div>
        <div className="rules-summary">
          <RulesContent className="setup-rules-content" />
        </div>
      </div>
    </div>
  );
}
