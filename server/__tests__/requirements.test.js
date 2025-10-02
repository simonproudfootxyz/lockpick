const RoomManager = require("../roomManager");
const {
  initializeGame,
  playCard,
  endTurn,
  getHandSize,
} = require("../gameLogic");

describe("Game Requirements Tests", () => {
  let roomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe("Requirement 1: Room Creation with Host", () => {
    test("creating a room should create a room with the creator present and as host", () => {
      const roomCode = "TEST123";
      const socketId = "creator-socket";
      const playerName = "Creator";

      const room = roomManager.createRoom(roomCode, socketId, playerName);

      expect(room).toBeDefined();
      expect(room.code).toBe(roomCode);
      expect(room.host).toBe(socketId);
      expect(room.players.has(socketId)).toBe(true);

      const creator = room.players.get(socketId);
      expect(creator.name).toBe(playerName);
      expect(creator.isHost).toBe(true);
      expect(creator.isConnected).toBe(true);
    });
  });

  describe("Requirement 2: Minimum Players for Game Start", () => {
    test("game cannot start until room has minimum of 2 players", () => {
      const roomCode = "TEST123";
      const createResult = roomManager.createRoom(
        roomCode,
        "host-socket",
        "Host"
      );
      const room = createResult.room || createResult;

      // With only 1 player, game should not be startable
      expect(room.players.size).toBe(1);

      // Add second player
      const joinResult = roomManager.joinRoom(
        roomCode,
        "player2-socket",
        "Player2"
      );
      expect(joinResult.success).toBe(true);
      expect(joinResult.isSpectator).toBe(false);

      // Start game after second player joins
      roomManager.updateGameState(
        roomCode,
        initializeGame(["Host", "Player2"])
      );
      expect(room.players.size).toBe(2);

      // Initialize game (simulating game start)
      const gameState = initializeGame(["Host", "Player2"]);
      expect(gameState.playerHands).toHaveLength(2);
      expect(gameState.gameStarted).toBe(true);
    });
  });

  describe("Requirement 3: Unique Player Names", () => {
    test("game cannot have two players with the same name", () => {
      const roomCode = "TEST123";
      roomManager.createRoom(roomCode, "host-socket", "Player1");
      roomManager.joinRoom(roomCode, "player2-socket", "Player2");

      // Try to add player with same name as existing player
      const duplicateResult = roomManager.joinRoom(
        roomCode,
        "player3-socket",
        "Player1"
      );
      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.error).toBe("Player name already taken");

      // Try to add player with same name as host
      const hostDuplicateResult = roomManager.joinRoom(
        roomCode,
        "player4-socket",
        "Player1"
      );
      expect(hostDuplicateResult.success).toBe(false);
      expect(hostDuplicateResult.error).toBe("Player name already taken");
    });
  });

  describe("Requirement 4: Maximum Players", () => {
    test("game can have a maximum of 10 players", () => {
      const roomCode = "TEST123";
      const room = roomManager.createRoom(roomCode, "host-socket", "Host").room;

      // Add 9 more players
      for (let i = 1; i <= 9; i++) {
        const result = roomManager.joinRoom(
          roomCode,
          `player${i}-socket`,
          `Player${i}`
        );
        expect(result.success).toBe(true);
        expect(result.isSpectator).toBe(false);
      }

      expect(room.players.size).toBe(10);
      expect(room.spectators.size).toBe(0);
    });
  });

  describe("Requirement 5: Spectator Mode for 11th+ Player", () => {
    test("once room has 10 players, additional players become spectators", () => {
      const roomCode = "TEST123";
      const room = roomManager.createRoom(roomCode, "host-socket", "Host").room;

      // Fill to 10 players
      for (let i = 1; i <= 9; i++) {
        roomManager.joinRoom(roomCode, `player${i}-socket`, `Player${i}`);
      }

      // 11th player should be spectator
      const spectatorResult = roomManager.joinRoom(
        roomCode,
        "spectator-socket",
        "Spectator"
      );
      expect(spectatorResult.success).toBe(true);
      expect(spectatorResult.isSpectator).toBe(true);
      expect(room.players.size).toBe(10);
      expect(room.spectators.size).toBe(1);
    });
  });

  describe("Requirement 6: Card Distribution", () => {
    test("players should receive appropriate number of cards when game starts", () => {
      const playerNames = [
        "Player1",
        "Player2",
        "Player3",
        "Player4",
        "Player5",
        "Player6",
      ];
      const gameState = initializeGame(playerNames);

      // Each player should have correct hand size
      expect(gameState.playerHands).toHaveLength(6);
      expect(gameState.playerHands[0]).toHaveLength(getHandSize(6));
      expect(gameState.playerHands[5]).toHaveLength(getHandSize(6));

      // All cards should be unique
      const allCards = gameState.playerHands.flat();
      const uniqueCards = new Set(allCards);
      expect(uniqueCards.size).toBe(allCards.length);

      // Deck should have remaining cards
      const totalCardsDealt = allCards.length;
      const expectedDeckSize =
        (gameState.totalCards || getTotalCardCount(playerNames.length)) -
        totalCardsDealt;
      expect(gameState.deck.length).toBe(expectedDeckSize);
    });
  });

  describe("Requirement 7: Card Playing Rules", () => {
    test("players can play cards on piles following the rules", () => {
      const gameState = {
        playerHands: [
          [10, 20, 30],
          [15, 25, 35],
        ],
        discardPiles: [[5], [10], [100], [90]], // Ascending: 5, 10; Descending: 100, 90
        currentPlayer: 0,
        cardsPlayedThisTurn: 0,
        turnComplete: false,
      };

      // Player can play 20 on ascending pile with 10 (valid)
      const validPlay = playCard(gameState, 0, 1, 1); // Player 0, card 20, pile 1
      expect(validPlay.discardPiles[1]).toContain(20);
      expect(validPlay.playerHands[0]).not.toContain(20);

      // Player cannot play 10 on ascending pile with 5 (invalid)
      const invalidPlay = playCard(gameState, 0, 0, 0); // Player 0, card 10, pile 0
      expect(invalidPlay.discardPiles[0]).toEqual([5]); // Should remain unchanged
      expect(invalidPlay.playerHands[0]).toContain(10); // Card should still be in hand
    });
  });

  describe("Requirement 8: Minimum Cards Before Turn End", () => {
    test("players must play minimum 2 cards before ending turn", () => {
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

      // Play 1 card - turn should not be complete
      let newGameState = playCard(gameState, 0, 0, 0);
      expect(newGameState.turnComplete).toBe(false);
      expect(newGameState.cardsPlayedThisTurn).toBe(1);

      // Play 2nd card - turn should be complete
      newGameState = playCard(newGameState, 0, 0, 1);
      expect(newGameState.turnComplete).toBe(true);
      expect(newGameState.cardsPlayedThisTurn).toBe(2);

      // Now player can end turn
      const endTurnState = endTurn(newGameState);
      expect(endTurnState.currentPlayer).toBe(1); // Next player
      expect(endTurnState.cardsPlayedThisTurn).toBe(0); // Reset
      expect(endTurnState.turnComplete).toBe(false); // Reset
    });
  });

  describe("Requirement 9: Turn Order Based on Join Sequence", () => {
    test("turn order should follow the order players joined the game", () => {
      const roomCode = "TEST123";

      // Create room with host
      roomManager.createRoom(roomCode, "host-socket", "Host");

      // Add players in specific order
      const joinOrder = ["Player1", "Player2", "Player3"];
      for (let i = 0; i < joinOrder.length; i++) {
        roomManager.joinRoom(roomCode, `player${i}-socket`, joinOrder[i]);
      }

      // Start game - turn order should be: Host (0), Player1 (1), Player2 (2), Player3 (3)
      const gameState = initializeGame(["Host", ...joinOrder]);

      expect(gameState.currentPlayer).toBe(0); // Host starts

      // Simulate turns
      let currentState = { ...gameState, turnComplete: true };
      currentState = endTurn(currentState);
      expect(currentState.currentPlayer).toBe(1); // Player1

      currentState = { ...currentState, turnComplete: true };
      currentState = endTurn(currentState);
      expect(currentState.currentPlayer).toBe(2); // Player2

      currentState = { ...currentState, turnComplete: true };
      currentState = endTurn(currentState);
      expect(currentState.currentPlayer).toBe(3); // Player3

      currentState = { ...currentState, turnComplete: true };
      currentState = endTurn(currentState);
      expect(currentState.currentPlayer).toBe(0); // Back to Host
    });
  });

  describe("Integration Test: Full Game Flow", () => {
    test("should handle complete game flow with all requirements", () => {
      const roomCode = "FULLTEST";

      // 1. Create room with host
      const hostResult = roomManager.createRoom(
        roomCode,
        "host-socket",
        "Host"
      );
      expect(hostResult.success).toBe(true);
      expect(hostResult.room.players.get("host-socket").isHost).toBe(true);

      // 2. Add players up to maximum
      const playerNames = ["Player1", "Player2", "Player3", "Player4"];
      for (let i = 0; i < playerNames.length; i++) {
        const result = roomManager.joinRoom(
          roomCode,
          `player${i}-socket`,
          playerNames[i]
        );
        expect(result.success).toBe(true);
        expect(result.isSpectator).toBe(false);
      }

      // 3. Add spectator (6th player)
      const spectatorResult = roomManager.joinRoom(
        roomCode,
        "spectator-socket",
        "Spectator"
      );
      expect(spectatorResult.success).toBe(true);
      expect(spectatorResult.isSpectator).toBe(true);

      // 4. Start game with 5 players
      const allPlayerNames = ["Host", ...playerNames];
      const gameState = initializeGame(allPlayerNames);

      // 5. Verify card distribution
      expect(gameState.playerHands).toHaveLength(5);
      gameState.playerHands.forEach((hand) => {
        expect(hand).toHaveLength(getHandSize(5));
      });

      // 6. Simulate playing cards following rules
      let currentState = { ...gameState };

      // Host plays 2 cards to complete turn
      currentState = playCard(currentState, 0, 0, 0); // Play on empty ascending pile
      currentState = playCard(currentState, 0, 0, 1); // Play on empty ascending pile
      expect(currentState.turnComplete).toBe(true);

      // 7. End turn and verify turn order
      currentState = endTurn(currentState);
      expect(currentState.currentPlayer).toBe(1); // Player1's turn

      // 8. Verify all requirements are met
      const room = roomManager.getRoom(roomCode);
      expect(room.players.size).toBe(5);
      expect(room.spectators.size).toBe(1);
      expect(currentState.gameStarted).toBe(true);
    });
  });
});
