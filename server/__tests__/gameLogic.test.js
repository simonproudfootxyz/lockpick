const {
  createDeck,
  shuffleDeck,
  getHandSize,
  canPlayCard,
  isGameWon,
  isValidTurn,
  initializeGame,
  playCard,
  endTurn,
} = require("../gameLogic");

describe("Game Logic", () => {
  describe("Deck Creation and Shuffling", () => {
    test("should create a deck with 98 cards", () => {
      const deck = createDeck();
      expect(deck).toHaveLength(98);
    });

    test("should create cards from 1 to 98", () => {
      const deck = createDeck();
      const sortedDeck = [...deck].sort((a, b) => a - b);
      expect(sortedDeck[0]).toBe(1);
      expect(sortedDeck[97]).toBe(98);
    });

    test("should shuffle deck differently each time", () => {
      const deck1 = createDeck();
      const deck2 = createDeck();
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
      expect(getHandSize(4)).toBe(5);
      expect(getHandSize(5)).toBe(4);
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
      expect(gameState.deck.length).toBe(98 - totalCardsDealt);
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
      const newGameState1 = playCard(gameState, 0, 0, 0); // Player 0, card 0, pile 0
      expect(newGameState1.turnComplete).toBe(false);

      // After playing 2 cards, turn should be complete
      const newGameState2 = playCard(newGameState1, 0, 0, 1); // Player 0, card 0, pile 1
      expect(newGameState2.turnComplete).toBe(true);
    });

    test("should advance to next player after ending turn", () => {
      const playerNames = ["Player1", "Player2", "Player3"];
      const gameState = initializeGame(playerNames);

      expect(gameState.currentPlayer).toBe(0);

      // End turn for player 0
      const newGameState = endTurn(gameState);
      expect(newGameState.currentPlayer).toBe(1);
      expect(newGameState.cardsPlayedThisTurn).toBe(0);
      expect(newGameState.turnComplete).toBe(false);
    });

    test("should wrap around to first player after last player", () => {
      const playerNames = ["Player1", "Player2"];
      const gameState = initializeGame(playerNames);

      // End turn for player 0 (should go to player 1)
      let newGameState = endTurn(gameState);
      expect(newGameState.currentPlayer).toBe(1);

      // End turn for player 1 (should wrap to player 0)
      newGameState = endTurn(newGameState);
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

      expect(isGameWon(discardPiles)).toBe(true);
    });

    test("should not detect game win with empty piles", () => {
      const discardPiles = [[], [], [], []];
      expect(isGameWon(discardPiles)).toBe(false);
    });

    test("should not detect game win with partially filled piles", () => {
      const discardPiles = [
        [1, 2, 3],
        [1, 2, 3],
        [100, 99, 98],
        [100, 99, 98],
      ];

      expect(isGameWon(discardPiles)).toBe(false);
    });
  });

  describe("Turn Order", () => {
    test("should maintain turn order based on player index", () => {
      const playerNames = ["Player1", "Player2", "Player3"];
      const gameState = initializeGame(playerNames);

      // Turn order should be 0, 1, 2, 0, 1, 2...
      expect(gameState.currentPlayer).toBe(0);

      let currentState = endTurn(gameState);
      expect(currentState.currentPlayer).toBe(1);

      currentState = endTurn(currentState);
      expect(currentState.currentPlayer).toBe(2);

      currentState = endTurn(currentState);
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
        const newGameState = playCard(gameState, 0, 0, pileIndex);
        expect(newGameState.discardPiles[pileIndex]).toContain(cardToPlay);
        expect(newGameState.playerHands[0]).not.toContain(cardToPlay);
      }
    });
  });
});




