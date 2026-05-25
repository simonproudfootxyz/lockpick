import { describe, expect, it } from "vitest";
import { buildNewGameState, canPlayCard, calculateFinalScore } from "./gameLogic";
import { scoreQualifiesForLeaderboard } from "./leaderboardQualification";

describe("gameLogic", () => {
  it("builds a valid new game state", () => {
    const state = buildNewGameState();
    expect(state.playerHand).toHaveLength(8);
    expect(state.discardPiles).toHaveLength(4);
    expect(state.deck.length).toBeGreaterThan(0);
    expect(state.gameFinished).toBe(false);
  });

  it("allows ascending +1 and descending -1 plays", () => {
    expect(canPlayCard(2, [1], "ascending")).toBe(true);
    expect(canPlayCard(99, [100], "descending")).toBe(true);
  });

  it("calculates final score from components", () => {
    const score = calculateFinalScore(10, 98, 98, 5);
    expect(score).toBeGreaterThan(0);
  });
});

describe("leaderboard qualification", () => {
  it("qualifies when fewer than 100 entries exist", () => {
    expect(scoreQualifiesForLeaderboard(1, null)).toBe(true);
  });

  it("qualifies at or above threshold", () => {
    expect(scoreQualifiesForLeaderboard(100, 100)).toBe(true);
    expect(scoreQualifiesForLeaderboard(99, 100)).toBe(false);
  });
});
