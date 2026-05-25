import type { DbGame } from "@/lib/db/schema";

type AccessContext = {
  userId?: string | null;
  guestSessionId?: string | null;
};

export function canAccessGame(game: DbGame, context: AccessContext): boolean {
  if (game.userId && context.userId) {
    return game.userId === context.userId;
  }
  if (!game.userId && game.guestSessionId && context.guestSessionId) {
    return game.guestSessionId === context.guestSessionId;
  }
  return false;
}

export function assertGameAccess(game: DbGame, context: AccessContext): void {
  if (!canAccessGame(game, context)) {
    throw new Error("Unauthorized access to game");
  }
}
