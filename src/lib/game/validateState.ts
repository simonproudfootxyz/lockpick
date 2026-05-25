import { z } from "zod";
import { canPlayCard } from "./gameLogic";
import type { GameState } from "./gameTypes";

const gameStateSchema = z.object({
  playerHand: z.array(z.number()),
  discardPiles: z.array(z.array(z.number())).length(4),
  deck: z.array(z.number()),
  gameWon: z.boolean(),
  gameFinished: z.boolean(),
  cardsPlayedThisTurn: z.number().int().min(0),
  turnComplete: z.boolean(),
  totalCards: z.number().int().positive(),
  maxCard: z.number().int().positive(),
  descendingStart: z.number().int(),
  totalTurns: z.number().int().min(0),
  gameScore: z.number().int().min(0),
  isKonamiMode: z.boolean(),
  startedAt: z.number(),
  finishedAt: z.number().optional(),
  totalTime: z.number().optional(),
});

export function parseGameState(state: unknown): GameState | null {
  const result = gameStateSchema.safeParse(state);
  return result.success ? result.data : null;
}

/** Basic integrity checks on persisted state shape and card multiset. */
export function validateGameStateIntegrity(state: GameState): boolean {
  const parsed = parseGameState(state);
  if (!parsed) return false;

  const allCards = [
    ...parsed.playerHand,
    ...parsed.deck,
    ...parsed.discardPiles.flat(),
  ].sort((a, b) => a - b);

  const expected = new Set<number>();
  for (let i = 2; i <= parsed.maxCard; i++) {
    expected.add(i);
  }

  if (allCards.length !== expected.size) return false;

  const seen = new Set<number>();
  for (const card of allCards) {
    if (!expected.has(card) || seen.has(card)) return false;
    seen.add(card);
  }

  return true;
}

/** Verify each card on a pile could have been legally played in sequence (simplified). */
export function validateDiscardPiles(state: GameState): boolean {
  for (let pileIndex = 0; pileIndex < state.discardPiles.length; pileIndex++) {
    const pileType = pileIndex < 2 ? "ascending" : "descending";
    const pile: number[] = [];
    for (const card of state.discardPiles[pileIndex]) {
      if (
        !canPlayCard(card, pile, pileType, {
          allowMultiplesOfTenReverse: state.isKonamiMode,
        })
      ) {
        return false;
      }
      pile.push(card);
    }
  }
  return true;
}

export function validateGameStateForSave(state: GameState): boolean {
  return validateGameStateIntegrity(state) && validateDiscardPiles(state);
}
