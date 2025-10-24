const { canPlayCard, playCard, endTurn } = require("../gameLogic");

describe("Card Playing Rules", () => {
  describe("Ascending Piles", () => {
    test("should allow playing higher card on ascending pile", () => {
      const pile = [5, 10, 15];
      expect(canPlayCard(20, pile, "ascending")).toBe(true);
      expect(canPlayCard(16, pile, "ascending")).toBe(true);
      expect(canPlayCard(15, pile, "ascending")).toBe(false); // Same value
    });

    test("should not allow playing lower or equal card on ascending pile", () => {
      const pile = [5, 10, 15];
      expect(canPlayCard(12, pile, "ascending")).toBe(false);
      expect(canPlayCard(3, pile, "ascending")).toBe(false);
      expect(canPlayCard(15, pile, "ascending")).toBe(false);
    });

    test("should allow any card on empty ascending pile", () => {
      const emptyPile = [];
      expect(canPlayCard(50, emptyPile, "ascending")).toBe(true);
      expect(canPlayCard(1, emptyPile, "ascending")).toBe(true);
      expect(canPlayCard(98, emptyPile, "ascending")).toBe(true);
    });
  });

  describe("Descending Piles", () => {
    test("should allow playing lower card on descending pile", () => {
      const pile = [50, 40, 30];
      expect(canPlayCard(20, pile, "descending")).toBe(true);
      expect(canPlayCard(25, pile, "descending")).toBe(true);
      expect(canPlayCard(30, pile, "descending")).toBe(false); // Same value
    });

    test("should not allow playing higher or equal card on descending pile", () => {
      const pile = [50, 40, 30];
      expect(canPlayCard(35, pile, "descending")).toBe(false);
      expect(canPlayCard(60, pile, "descending")).toBe(false);
      expect(canPlayCard(30, pile, "descending")).toBe(false);
    });

    test("should allow any card on empty descending pile", () => {
      const emptyPile = [];
      expect(canPlayCard(1, emptyPile, "descending")).toBe(true);
      expect(canPlayCard(50, emptyPile, "descending")).toBe(true);
      expect(canPlayCard(98, emptyPile, "descending")).toBe(true);
    });
  });

  describe("Card Playing Integration", () => {
    test("should successfully play valid card", () => {
      const playerNames = ["Player1", "Player2"];
      const gameState = {
        playerHands: [
          [10, 20, 30],
          [15, 25, 35],
        ],
        discardPiles: [[5], [], [100], []],
        currentPlayer: 0,
        cardsPlayedThisTurn: 0,
        turnComplete: false,
      };

      // Player 0 plays card 20 on ascending pile 1 (index 1)
      const newGameState = playCard(gameState, 0, 1, 1);

      expect(newGameState.discardPiles[1]).toContain(20);
      expect(newGameState.playerHands[0]).not.toContain(20);
      expect(newGameState.cardsPlayedThisTurn).toBe(1);
    });

    test("should not allow playing invalid card", () => {
      const playerNames = ["Player1", "Player2"];
      const gameState = {
        playerHands: [
          [10, 20, 30],
          [15, 25, 35],
        ],
        discardPiles: [[5], [], [100], []],
        currentPlayer: 0,
        cardsPlayedThisTurn: 0,
        turnComplete: false,
      };

      // Try to play card 10 on ascending pile with 5 (should fail)
      const newGameState = playCard(gameState, 0, 0, 0);

      // Card should not be played
      expect(newGameState.discardPiles[0]).toEqual([5]);
      expect(newGameState.playerHands[0]).toContain(10);
      expect(newGameState.cardsPlayedThisTurn).toBe(0);
    });
  });

  describe("Turn Completion", () => {
    test("should complete turn after playing 2 cards", () => {
      const gameState = {
        playerHands: [
          [10, 20, 30, 40],
          [15, 25, 35],
        ],
        discardPiles: [[], [], [], []],
        currentPlayer: 0,
        cardsPlayedThisTurn: 0,
        turnComplete: false,
      };

      // Play first card
      let newGameState = playCard(gameState, 0, 0, 0);
      expect(newGameState.turnComplete).toBe(false);
      expect(newGameState.cardsPlayedThisTurn).toBe(1);

      // Play second card
      newGameState = playCard(newGameState, 0, 0, 1);
      expect(newGameState.turnComplete).toBe(true);
      expect(newGameState.cardsPlayedThisTurn).toBe(2);
    });

    test("should require minimum 2 cards for turn completion", () => {
      const gameState = {
        playerHands: [
          [10, 20, 30],
          [15, 25, 35],
        ],
        discardPiles: [[], [], [], []],
        currentPlayer: 0,
        cardsPlayedThisTurn: 0,
        turnComplete: false,
      };

      // Play only 1 card
      const newGameState = playCard(gameState, 0, 0, 0);
      expect(newGameState.turnComplete).toBe(false);
      expect(newGameState.cardsPlayedThisTurn).toBe(1);
    });
  });

  describe("Turn Order", () => {
    test("should advance to next player after ending turn", () => {
      const gameState = {
        playerHands: [
          [10, 20],
          [15, 25],
          [30, 40],
        ],
        discardPiles: [[], [], [], []],
        currentPlayer: 0,
        cardsPlayedThisTurn: 2,
        turnComplete: true,
      };

      const newGameState = endTurn(gameState);
      expect(newGameState.currentPlayer).toBe(1);
      expect(newGameState.cardsPlayedThisTurn).toBe(0);
      expect(newGameState.turnComplete).toBe(false);
    });

    test("should wrap around to first player after last player", () => {
      const gameState = {
        playerHands: [
          [10, 20],
          [15, 25],
        ],
        discardPiles: [[], [], [], []],
        currentPlayer: 1, // Last player
        cardsPlayedThisTurn: 2,
        turnComplete: true,
      };

      const newGameState = endTurn(gameState);
      expect(newGameState.currentPlayer).toBe(0); // Back to first player
    });
  });

  describe("Edge Cases", () => {
    test("should handle playing on piles with single cards", () => {
      const pile = [50];
      expect(canPlayCard(60, pile, "ascending")).toBe(true);
      expect(canPlayCard(40, pile, "ascending")).toBe(false);
      expect(canPlayCard(30, pile, "descending")).toBe(true);
      expect(canPlayCard(60, pile, "descending")).toBe(false);
    });

    test("should handle boundary values correctly", () => {
      const ascendingPile = [98];
      const descendingPile = [1];

      // Can't play higher than 98 on ascending
      expect(canPlayCard(99, ascendingPile, "ascending")).toBe(false);
      expect(canPlayCard(98, ascendingPile, "ascending")).toBe(false);

      // Can't play lower than 1 on descending
      expect(canPlayCard(0, descendingPile, "descending")).toBe(false);
      expect(canPlayCard(1, descendingPile, "descending")).toBe(false);
    });

    test("should handle empty player hand gracefully", () => {
      const gameState = {
        playerHands: [[], [15, 25]], // Player 0 has no cards
        discardPiles: [[], [], [], []],
        currentPlayer: 0,
        cardsPlayedThisTurn: 0,
        turnComplete: false,
      };

      // Try to play card from empty hand
      const newGameState = playCard(gameState, 0, 0, 0);
      expect(newGameState).toEqual(gameState); // Should remain unchanged
    });
  });
});










