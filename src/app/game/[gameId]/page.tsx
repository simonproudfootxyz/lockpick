import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { assertGameAccess } from "@/lib/auth/gameAccess";
import { getGuestSessionId } from "@/lib/auth/guestSession";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { parseGameState } from "@/lib/game/validateState";
import GameClient from "./GameClient";

export const dynamic = "force-dynamic";

type GamePageProps = {
  params: Promise<{ gameId: string }>;
};

export default async function GamePage({ params }: GamePageProps) {
  const { gameId } = await params;
  const session = await auth();
  const guestSessionId = await getGuestSessionId();

  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);

  if (!game) notFound();

  try {
    assertGameAccess(game, {
      userId: session?.user?.id ?? null,
      guestSessionId: guestSessionId ?? null,
    });
  } catch {
    notFound();
  }

  if (game.status === "finished") {
    redirect("/");
  }

  const initialState = parseGameState(game.state);
  if (!initialState) notFound();

  return <GameClient gameId={gameId} initialState={initialState} />;
}
