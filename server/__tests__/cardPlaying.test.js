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
      const gameState = {
        playerHands: [
          [10, 20, 30],
          [15, 25, 35],
        ],
        discardPiles: [[5], [], [100], []],
        currentPlayer: 0,
        cardsPlayedThisTurn: 0,
        turnComplete: false,
        deck: [40, 45, 50],
        gameWon: false,
        gameOver: false,
      };

      // Player 0 plays card 20 on ascending pile 1 (index 1)
      const cardToPlay = gameState.playerHands[0][1];
      const result = playCard(gameState, cardToPlay, 1);
      expect(result.success).toBe(true);
      const newGameState = result.gameState;

      expect(newGameState.discardPiles[1]).toContain(20);
      expect(newGameState.playerHands[0]).not.toContain(20);
      expect(newGameState.cardsPlayedThisTurn).toBe(1);
    });

    test("should not allow playing invalid card", () => {
      const gameState = {
        playerHands: [
          [10, 20, 30],
          [15, 25, 35],
        ],
        discardPiles: [[5], [], [100], []],
        currentPlayer: 0,
        cardsPlayedThisTurn: 0,
        turnComplete: false,
        deck: [40, 45, 50],
        gameWon: false,
        gameOver: false,
      };

      // Try to play card 3 on ascending pile with 5 (should fail)
      const result = playCard(gameState, 3, 0);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // State should remain unchanged
      expect(gameState.discardPiles[0]).toEqual([5]);
      expect(gameState.playerHands[0]).toContain(10);
      expect(gameState.cardsPlayedThisTurn).toBe(0);
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
        deck: [50, 60, 70],
        gameWon: false,
        gameOver: false,
      };

      // Play first card
      const firstPlay = playCard(gameState, 10, 0);
      expect(firstPlay.success).toBe(true);
      let newGameState = firstPlay.gameState;
      expect(newGameState.turnComplete).toBe(false);
      expect(newGameState.cardsPlayedThisTurn).toBe(1);

      // Play second card
      const secondPlay = playCard(
        newGameState,
        newGameState.playerHands[0][0],
        1
      );
      expect(secondPlay.success).toBe(true);
      newGameState = secondPlay.gameState;
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
        deck: [50, 60, 70],
        gameWon: false,
        gameOver: false,
      };

      // Play only 1 card
      const result = playCard(gameState, 10, 0);
      expect(result.success).toBe(true);
      const newGameState = result.gameState;
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
        deck: [60, 70, 80],
        gameWon: false,
        gameOver: false,
      };

      const { success, gameState: newGameState } = endTurn({
        ...gameState,
        deck: [...gameState.deck],
        playerHands: gameState.playerHands.map((hand) => [...hand]),
      });
      expect(success).toBe(true);
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
        deck: [60, 70, 80],
        gameWon: false,
        gameOver: false,
      };

      const { success, gameState: newGameState } = endTurn({
        ...gameState,
        deck: [...gameState.deck],
        playerHands: gameState.playerHands.map((hand) => [...hand]),
      });
      expect(success).toBe(true);
      expect(newGameState.currentPlayer).toBe(0); // Back to first player
    });
  });

  describe("Edge Cases", () => {
    test("should handle playing on piles with single cards", () => {
      const pile = [50];
      expect(canPlayCard(60, pile, "ascending")).toBe(true);
      expect(canPlayCard(40, pile, "ascending")).toBe(true);
      expect(canPlayCard(30, pile, "descending")).toBe(true);
      expect(canPlayCard(60, pile, "descending")).toBe(true);
    });

    test("should handle boundary values correctly", () => {
      const ascendingPile = [98];
      const descendingPile = [1];

      expect(canPlayCard(108, ascendingPile, "ascending")).toBe(true);
      expect(canPlayCard(88, ascendingPile, "ascending")).toBe(true);

      expect(canPlayCard(-5, descendingPile, "descending")).toBe(true);
      expect(canPlayCard(11, descendingPile, "descending")).toBe(true);
    });

    test("should handle empty player hand gracefully", () => {
      const gameState = {
        playerHands: [[], [15, 25]], // Player 0 has no cards
        discardPiles: [[], [], [], []],
        currentPlayer: 0,
        cardsPlayedThisTurn: 0,
        turnComplete: false,
        deck: [40, 45, 50],
        gameWon: false,
        gameOver: false,
      };

      // Try to play card from empty hand
      const result = playCard(gameState, 10, 0);
      expect(result.success).toBe(true);
      const newState = result.gameState;
      expect(newState.playerHands[0]).toEqual([]);
      expect(newState.cardsPlayedThisTurn).toBe(1);
    });
  });
});










