"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { assertGameAccess } from "@/lib/auth/gameAccess";
import {
  generateGuestSessionId,
  getGuestSessionId,
  setGuestSessionCookie,
} from "@/lib/auth/guestSession";
import { db } from "@/lib/db";
import { games, leaderboardEntries } from "@/lib/db/schema";
import { buildNewGameState, calculateFinalScore } from "@/lib/game/gameLogic";
import { getOverallRankForEntry } from "@/lib/game/leaderboard";
import type { FinishGameResult, GameState } from "@/lib/game/gameTypes";
import {
  parseGameState,
  validateGameStateForSave,
} from "@/lib/game/validateState";
import { displayNameSchema } from "@/lib/auth/schemas";

async function getAccessContext() {
  const session = await auth();
  const guestSessionId = await getGuestSessionId();
  return {
    userId: session?.user?.id ?? null,
    guestSessionId: guestSessionId ?? null,
    username: session?.user?.username ?? null,
  };
}

async function getGameOrThrow(gameId: string) {
  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  if (!game) throw new Error("Game not found");
  return game;
}

export async function startGame() {
  const context = await getAccessContext();
  const initialState = buildNewGameState();

  let guestSessionId = context.guestSessionId;
  if (!context.userId) {
    guestSessionId = generateGuestSessionId();
    await setGuestSessionCookie(guestSessionId);
  }

  const [game] = await db
    .insert(games)
    .values({
      userId: context.userId,
      guestSessionId: context.userId ? null : guestSessionId,
      state: initialState,
      status: "in_progress",
      totalTurns: 0,
      gameScore: 0,
    })
    .returning({ id: games.id });

  redirect(`/game/${game.id}`);
}

export async function loadGame(gameId: string): Promise<GameState | null> {
  const context = await getAccessContext();
  const game = await getGameOrThrow(gameId);
  assertGameAccess(game, context);
  return parseGameState(game.state);
}

export async function getGameStatus(gameId: string): Promise<{
  status: string;
  gameFinished: boolean;
  gameWon: boolean;
}> {
  const context = await getAccessContext();
  const game = await getGameOrThrow(gameId);
  assertGameAccess(game, context);
  const state = parseGameState(game.state);
  if (!state) throw new Error("Invalid game state");

  return {
    status: game.status,
    gameFinished: state.gameFinished,
    gameWon: state.gameWon,
  };
}

export async function saveGameState(gameId: string, state: GameState) {
  const context = await getAccessContext();
  const game = await getGameOrThrow(gameId);
  assertGameAccess(game, context);

  if (game.status === "finished") {
    throw new Error("Cannot save a finished game");
  }

  if (!validateGameStateForSave(state)) {
    throw new Error("Invalid game state");
  }

  await db
    .update(games)
    .set({
      state,
      totalTurns: state.totalTurns,
      gameScore: state.gameScore,
      updatedAt: new Date(),
    })
    .where(eq(games.id, gameId));

  return { ok: true as const };
}

export async function saveKonamiMode(gameId: string) {
  const context = await getAccessContext();
  const game = await getGameOrThrow(gameId);
  assertGameAccess(game, context);

  const state = parseGameState(game.state);
  if (!state) throw new Error("Invalid game state");

  const nextState: GameState = { ...state, isKonamiMode: true };

  await db
    .update(games)
    .set({ state: nextState, updatedAt: new Date() })
    .where(eq(games.id, gameId));

  return { ok: true as const, state: nextState };
}

function computeFinalMetrics(state: GameState) {
  const totalCardsPlayed = state.discardPiles.reduce(
    (sum, pile) => sum + pile.length,
    0,
  );
  const finalScore = calculateFinalScore({ ...state, totalCardsPlayed });
  const finishedAt = Date.now();
  const durationMs = finishedAt - state.startedAt;

  return {
    totalCardsPlayed,
    finalScore,
    finishedAt,
    durationMs,
    finishedState: {
      ...state,
      gameFinished: true,
      finishedAt,
      totalTime: durationMs,
    } satisfies GameState,
  };
}

async function insertLeaderboardEntry(
  gameId: string,
  userId: string | null,
  displayName: string,
  finalScore: number,
  durationMs: number,
  totalTurns: number,
) {
  const [entry] = await db
    .insert(leaderboardEntries)
    .values({
      gameId,
      userId,
      displayName,
      finalScore,
      durationMs,
      totalTurns,
    })
    .returning({
      id: leaderboardEntries.id,
      finalScore: leaderboardEntries.finalScore,
      submittedAt: leaderboardEntries.submittedAt,
      displayName: leaderboardEntries.displayName,
    });

  if (!entry) {
    throw new Error("Failed to create leaderboard entry");
  }

  return entry;
}

async function buildFinishResult(
  gameId: string,
  finalScore: number,
  context: Awaited<ReturnType<typeof getAccessContext>>,
): Promise<FinishGameResult> {
  const [existing] = await db
    .select()
    .from(leaderboardEntries)
    .where(eq(leaderboardEntries.gameId, gameId))
    .limit(1);

  if (existing) {
    const rank = await getOverallRankForEntry({
      id: existing.id,
      finalScore: existing.finalScore,
      submittedAt: existing.submittedAt,
    });
    return {
      ok: true,
      needsDisplayName: false,
      submitted: true,
      rank,
      displayName: existing.displayName,
    };
  }

  const username = context.username ?? undefined;
  if (context.userId && !username) {
    throw new Error("Authenticated user is missing username");
  }

  if (context.userId) {
    return {
      ok: true,
      needsDisplayName: false,
      displayName: username,
      submitted: false,
    };
  }

  return { ok: true, needsDisplayName: true, submitted: false };
}

export async function finishGame(
  gameId: string,
  state: GameState,
): Promise<FinishGameResult> {
  const context = await getAccessContext();
  const game = await getGameOrThrow(gameId);
  assertGameAccess(game, context);

  if (game.status === "finished" && game.finalScore != null) {
    return buildFinishResult(gameId, game.finalScore, context);
  }

  if (!state.gameFinished && !state.gameWon) {
    throw new Error("Game is not finished");
  }

  if (!validateGameStateForSave(state)) {
    throw new Error("Invalid game state");
  }

  const { finalScore, durationMs, finishedState } = computeFinalMetrics(state);

  await db
    .update(games)
    .set({
      state: finishedState,
      status: "finished",
      totalTurns: state.totalTurns,
      gameScore: state.gameScore,
      finalScore,
      durationMs,
      finishedAt: new Date(finishedState.finishedAt!),
      updatedAt: new Date(),
    })
    .where(eq(games.id, gameId));

  const result = await buildFinishResult(gameId, finalScore, context);

  if (
    !result.needsDisplayName &&
    !result.submitted &&
    context.userId &&
    context.username
  ) {
    const [existing] = await db
      .select()
      .from(leaderboardEntries)
      .where(eq(leaderboardEntries.gameId, gameId))
      .limit(1);
    if (!existing) {
      const createdEntry = await insertLeaderboardEntry(
        gameId,
        context.userId,
        context.username,
        finalScore,
        durationMs,
        state.totalTurns,
      );
      const rank = await getOverallRankForEntry(createdEntry);
      return {
        ...result,
        submitted: true,
        rank,
        displayName: createdEntry.displayName,
      };
    }

    const rank = await getOverallRankForEntry({
      id: existing.id,
      finalScore: existing.finalScore,
      submittedAt: existing.submittedAt,
    });
    return {
      ...result,
      submitted: true,
      rank,
      displayName: existing.displayName,
    };
  }

  return result;
}

export async function submitGuestLeaderboardName(
  gameId: string,
  displayName: string,
): Promise<FinishGameResult> {
  const context = await getAccessContext();
  if (context.userId) {
    throw new Error("Authenticated users do not submit display names");
  }

  const parsed = displayNameSchema.safeParse(displayName);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid display name");
  }

  const game = await getGameOrThrow(gameId);
  assertGameAccess(game, context);

  if (game.status !== "finished" || game.finalScore == null) {
    throw new Error("Game must be finished before leaderboard submission");
  }

  const [existing] = await db
    .select()
    .from(leaderboardEntries)
    .where(eq(leaderboardEntries.gameId, gameId))
    .limit(1);
  if (existing) {
    const rank = await getOverallRankForEntry({
      id: existing.id,
      finalScore: existing.finalScore,
      submittedAt: existing.submittedAt,
    });
    return {
      ok: true,
      needsDisplayName: false,
      submitted: true,
      rank,
      displayName: existing.displayName,
    };
  }

  const createdEntry = await insertLeaderboardEntry(
    gameId,
    null,
    parsed.data,
    game.finalScore,
    game.durationMs ?? 0,
    game.totalTurns,
  );

  const rank = await getOverallRankForEntry(createdEntry);
  return {
    ok: true,
    needsDisplayName: false,
    submitted: true,
    rank,
    displayName: createdEntry.displayName,
  };
}
