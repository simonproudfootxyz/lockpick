import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { signOutAction } from "@/actions/account";
import Button from "@/components/Button";
import "@/GameSetup.css";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="game-setup">
      <div className="setup-container">
        <h1>Account</h1>
        {user ? (
          <div className="account-details">
            <p>
              <strong>Username:</strong> {user.username}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <form action={signOutAction}>
              <Button type="submit">Sign out</Button>
            </form>
          </div>
        ) : (
          <p>Not signed in.</p>
        )}
        <div className="setup-auth-links">
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
