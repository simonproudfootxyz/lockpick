const {
  createDeck,
  shuffleDeck,
  getHandSize,
  canPlayCard,
  isGameWon,
  initializeGame,
  playCard,
  endTurn,
  getTotalCardCount,
  getMaxCardValue,
} = require("../gameLogic");

describe("Game Logic", () => {
  describe("Deck Creation and Shuffling", () => {
    test("should create a deck with base 98 cards for up to 5 players", () => {
      const deck = createDeck(5);
      expect(deck).toHaveLength(98);
    });

    test("should expand deck by 10 cards per player above 5", () => {
      const deckSixPlayers = createDeck(6);
      expect(deckSixPlayers).toHaveLength(108);

      const deckTenPlayers = createDeck(10);
      expect(deckTenPlayers).toHaveLength(148);
    });

    test("should shuffle deck differently each time", () => {
      const deck1 = createDeck(5);
      const deck2 = createDeck(5);
      const shuffled1 = shuffleDeck([...deck1]);
      const shuffled2 = shuffleDeck([...deck2]);

      // Very unlikely to be identical after shuffling
      expect(shuffled1).not.toEqual(deck1);
      expect(shuffled2).not.toEqual(deck2);
    });
  });

  describe("Hand Size Calculation", () => {
    test("should return correct hand size for different player counts", () => {
      expect(getHandSize(2)).toBe(7);
      expect(getHandSize(3)).toBe(6);
      expect(getHandSize(5)).toBe(6);
      expect(getHandSize(7)).toBe(5);
      expect(getHandSize(10)).toBe(4);
    });
  });

  describe("Card Playing Rules", () => {
    test("should allow playing higher card on ascending pile", () => {
      const pile = [5, 10, 15];
      expect(canPlayCard(20, pile, "ascending")).toBe(true);
      expect(canPlayCard(16, pile, "ascending")).toBe(true);
    });

    test("should not allow playing lower card on ascending pile", () => {
      const pile = [5, 10, 15];
      expect(canPlayCard(12, pile, "ascending")).toBe(false);
      expect(canPlayCard(3, pile, "ascending")).toBe(false);
    });

    test("should allow playing lower card on descending pile", () => {
      const pile = [50, 40, 30];
      expect(canPlayCard(20, pile, "descending")).toBe(true);
      expect(canPlayCard(25, pile, "descending")).toBe(true);
    });

    test("should not allow playing higher card on descending pile", () => {
      const pile = [50, 40, 30];
      expect(canPlayCard(35, pile, "descending")).toBe(false);
      expect(canPlayCard(60, pile, "descending")).toBe(false);
    });

    test("should allow playing any card on empty pile", () => {
      const emptyPile = [];
      expect(canPlayCard(50, emptyPile, "ascending")).toBe(true);
      expect(canPlayCard(1, emptyPile, "descending")).toBe(true);
    });
  });

  describe("Game Initialization", () => {
    test("should initialize game with correct number of players", () => {
      const playerNames = ["Player1", "Player2", "Player3"];
      const gameState = initializeGame(playerNames);

      expect(gameState.playerHands).toHaveLength(3);
      expect(gameState.currentPlayer).toBe(0);
      expect(gameState.discardPiles).toHaveLength(4);
      expect(gameState.gameStarted).toBe(true);
      expect(gameState.turnComplete).toBe(false);
      expect(gameState.cardsPlayedThisTurn).toBe(0);
      expect(gameState.totalCards).toBe(getTotalCardCount(3));
      expect(gameState.maxCard).toBe(getMaxCardValue(3));
    });

    test("should distribute correct number of cards to each player", () => {
      const playerNames = ["Player1", "Player2"];
      const gameState = initializeGame(playerNames);

      // Each player should have 7 cards (hand size for 2 players)
      expect(gameState.playerHands[0]).toHaveLength(7);
      expect(gameState.playerHands[1]).toHaveLength(7);

      // Deck should have remaining cards
      const totalCardsDealt =
        gameState.playerHands[0].length + gameState.playerHands[1].length;
      expect(gameState.deck.length).toBe(
        getTotalCardCount(2) - totalCardsDealt
      );
    });
  });

  describe("Turn Management", () => {
    test("should require minimum 2 cards before ending turn", () => {
      const playerNames = ["Player1", "Player2"];
      const gameState = initializeGame(playerNames);

      // Initially, turn should not be complete
      expect(gameState.turnComplete).toBe(false);
      expect(gameState.cardsPlayedThisTurn).toBe(0);

      // After playing 1 card, turn should not be complete
      const playResult1 = playCard(gameState, 0, 0, 0);
      expect(playResult1.success).toBe(true);
      const newGameState1 = playResult1.gameState;
      expect(newGameState1.turnComplete).toBe(false);

      // After playing 2 cards, turn should be complete
      const playResult2 = playCard(newGameState1, 0, 0, 1);
      expect(playResult2.success).toBe(true);
      const newGameState2 = playResult2.gameState;
      expect(newGameState2.turnComplete).toBe(true);
    });

    test("should advance to next player after ending turn", () => {
      const playerNames = ["Player1", "Player2", "Player3"];
      const gameState = initializeGame(playerNames);

      expect(gameState.currentPlayer).toBe(0);

      // End turn for player 0
      const endTurnResult = endTurn(gameState);
      expect(endTurnResult.success).toBe(true);
      const newGameState = endTurnResult.gameState;
      expect(newGameState.currentPlayer).toBe(1);
      expect(newGameState.cardsPlayedThisTurn).toBe(0);
      expect(newGameState.turnComplete).toBe(false);
    });

    test("should wrap around to first player after last player", () => {
      const playerNames = ["Player1", "Player2"];
      const gameState = initializeGame(playerNames);

      // End turn for player 0 (should go to player 1)
      let endResult = endTurn(gameState);
      expect(endResult.success).toBe(true);
      let newGameState = endResult.gameState;
      expect(newGameState.currentPlayer).toBe(1);

      // End turn for player 1 (should wrap to player 0)
      endResult = endTurn(newGameState);
      expect(endResult.success).toBe(true);
      newGameState = endResult.gameState;
      expect(newGameState.currentPlayer).toBe(0);
    });
  });

  describe("Game Win Condition", () => {
    test("should detect game win when all piles have cards", () => {
      const discardPiles = [
        [1, 2, 3, 4, 5], // Ascending pile 1
        [1, 2, 3, 4, 5], // Ascending pile 2
        [100, 99, 98, 97, 96], // Descending pile 1
        [100, 99, 98, 97, 96], // Descending pile 2
      ];

      const total = discardPiles.reduce((sum, pile) => sum + pile.length, 0);
      expect(isGameWon(discardPiles, total)).toBe(true);
    });

    test("should not detect game win with empty piles", () => {
      const discardPiles = [[], [], [], []];
      expect(isGameWon(discardPiles, 98)).toBe(false);
    });

    test("should not detect game win with partially filled piles", () => {
      const discardPiles = [
        [1, 2, 3],
        [1, 2, 3],
        [100, 99, 98],
        [100, 99, 98],
      ];

      expect(
        isGameWon(
          discardPiles,
          discardPiles.reduce((sum, pile) => sum + pile.length, 0) + 10
        )
      ).toBe(false);
    });
  });

  describe("Turn Order", () => {
    test("should maintain turn order based on player index", () => {
      const playerNames = ["Player1", "Player2", "Player3"];
      const gameState = initializeGame(playerNames);

      // Turn order should be 0, 1, 2, 0, 1, 2...
      expect(gameState.currentPlayer).toBe(0);

      let endResult = endTurn(gameState);
      expect(endResult.success).toBe(true);
      let currentState = endResult.gameState;
      expect(currentState.currentPlayer).toBe(1);

      endResult = endTurn(currentState);
      expect(endResult.success).toBe(true);
      currentState = endResult.gameState;
      expect(currentState.currentPlayer).toBe(2);

      endResult = endTurn(currentState);
      expect(endResult.success).toBe(true);
      currentState = endResult.gameState;
      expect(currentState.currentPlayer).toBe(0);
    });
  });

  describe("Card Playing Validation", () => {
    test("should validate card can be played before allowing play", () => {
      const playerNames = ["Player1", "Player2"];
      const gameState = initializeGame(playerNames);

      // Get a card from player's hand
      const playerHand = gameState.playerHands[0];
      const cardToPlay = playerHand[0];
      const pileIndex = 0; // Ascending pile
      const pile = gameState.discardPiles[pileIndex];

      // Check if card can be played
      const canPlay = canPlayCard(cardToPlay, pile, "ascending");

      if (canPlay) {
        const playResult = playCard(gameState, 0, 0, pileIndex);
        expect(playResult.success).toBe(true);
        const newGameState = playResult.gameState;
        expect(newGameState.discardPiles[pileIndex]).toContain(cardToPlay);
        expect(newGameState.playerHands[0]).not.toContain(cardToPlay);
      }
    });
  });
});
