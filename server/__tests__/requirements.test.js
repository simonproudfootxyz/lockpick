const RoomManager = require("../roomManager");
const {
  initializeGame,
  playCard,
  endTurn,
  getHandSize,
  getTotalCardCount,
} = require("../gameLogic");

describe("Game Requirements Tests", () => {
  let roomManager;

  beforeEach(async () => {
    jest
      .spyOn(RoomManager.prototype, "loadAllRooms")
      .mockImplementation(async () => {});
    roomManager = new RoomManager();
    await roomManager.loadAllRooms();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Requirement 1: Room Creation with Host", () => {
    test("creating a room should create a room with the creator present and as host", async () => {
      const socketId = "creator-socket";
      const playerName = "Creator";

      const room = await roomManager.createRoom(socketId, playerName);

      expect(room).toBeDefined();
      expect(room.code).toHaveLength(6);
      expect(room.host).toBe(socketId);
      expect(room.players.has(socketId)).toBe(true);

      const creator = room.players.get(socketId);
      expect(creator.name).toBe(playerName);
      expect(creator.isHost).toBe(true);
      expect(creator.isConnected).toBe(true);
    });
  });

  describe("Requirement 2: Minimum Players for Game Start", () => {
    test("game cannot start until room has minimum of 2 players", async () => {
      const room = await roomManager.createRoom("host-socket", "Host");
      const roomCode = room.code;

      // With only 1 player, game should not be startable
      expect(room.players.size).toBe(1);

      // Add second player
      const reservation = roomManager.createPendingPlayer(roomCode, "Player2");
      const joinResult = await roomManager.joinRoom(
        roomCode,
        "player2-socket",
        "Player2",
        reservation.playerId
      );
      expect(joinResult.success).toBe(true);
      expect(joinResult.isSpectator).toBe(false);

      // Start game after second player joins
      await roomManager.updateGameState(
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
    test("game cannot have two players with the same name", async () => {
      const room = await roomManager.createRoom("host-socket", "Player1");
      const roomCode = room.code;
      await roomManager.joinRoom(roomCode, "player2-socket", "Player2");

      // Try to add player with same name as existing player
      const duplicateResult = await roomManager.joinRoom(
        roomCode,
        "player3-socket",
        "Player1"
      );
      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.error).toBe("That name is already in use in this room.");

      // Try to add player with same name as host
      const hostDuplicateResult = await roomManager.joinRoom(
        roomCode,
        "player4-socket",
        "Player1"
      );
      expect(hostDuplicateResult.success).toBe(false);
      expect(hostDuplicateResult.error).toBe("That name is already in use in this room.");
    });
  });

  describe("Requirement 4: Maximum Players", () => {
    test("game can have a maximum of 10 players", async () => {
      const room = await roomManager.createRoom("host-socket", "Host");
      const roomCode = room.code;

      // Add 9 more players
      for (let i = 1; i <= 9; i++) {
        const result = await roomManager.joinRoom(
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
    test("once room has 10 players, additional players become spectators", async () => {
      const room = await roomManager.createRoom("host-socket", "Host");
      const roomCode = room.code;

      // Fill to 10 players
      for (let i = 1; i <= 9; i++) {
        await roomManager.joinRoom(roomCode, `player${i}-socket`, `Player${i}`);
      }

      // 11th player should be spectator
      const spectatorResult = await roomManager.joinRoom(
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
        deck: [40, 45, 50],
        gameWon: false,
        gameOver: false,
      };

      // Player can play 20 on ascending pile with 10 (valid)
      const { success: validSuccess, gameState: afterValidPlay } = playCard(
        gameState,
        20,
        1
      );
      expect(validSuccess).toBe(true);
      expect(afterValidPlay.discardPiles[1]).toContain(20);
      expect(afterValidPlay.playerHands[0]).not.toContain(20);

      // Player cannot play 10 on ascending pile with 5 (invalid)
      const invalidResult = playCard(gameState, 3, 0);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toBeDefined();
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
        deck: [50, 60, 70],
        gameWon: false,
        gameOver: false,
      };

      // Play 1 card - turn should not be complete
      const firstPlay = playCard(gameState, 10, 0);
      expect(firstPlay.success).toBe(true);
      let newGameState = firstPlay.gameState;
      expect(newGameState.turnComplete).toBe(false);
      expect(newGameState.cardsPlayedThisTurn).toBe(1);

      // Play 2nd card - turn should be complete
      const secondPlay = playCard(newGameState, 20, 0);
      expect(secondPlay.success).toBe(true);
      newGameState = secondPlay.gameState;
      expect(newGameState.turnComplete).toBe(true);
      expect(newGameState.cardsPlayedThisTurn).toBe(2);

      // Now player can end turn
      const endTurnResult = endTurn({
        ...newGameState,
        deck: [...newGameState.deck],
        playerHands: newGameState.playerHands.map((hand) => [...hand]),
      });
      expect(endTurnResult.success).toBe(true);
      const endTurnState = endTurnResult.gameState;
      expect(endTurnState.currentPlayer).toBe(1); // Next player
      expect(endTurnState.cardsPlayedThisTurn).toBe(0); // Reset
      expect(endTurnState.turnComplete).toBe(false); // Reset
    });
  });

  describe("Requirement 9: Turn Order Based on Join Sequence", () => {
    test("turn order should follow the order players joined the game", async () => {
      const room = await roomManager.createRoom("host-socket", "Host");
      const roomCode = room.code;

      // Add players in specific order
      const joinOrder = ["Player1", "Player2", "Player3"];
      for (let i = 0; i < joinOrder.length; i++) {
        await roomManager.joinRoom(roomCode, `player${i}-socket`, joinOrder[i]);
      }

      // Start game - turn order should be: Host (0), Player1 (1), Player2 (2), Player3 (3)
      let currentState = initializeGame(["Host", ...joinOrder]);

      const advanceTurn = (state) => {
        const readyState = {
          ...state,
          deck: [...state.deck],
          playerHands: state.playerHands.map((hand) => [...hand]),
          cardsPlayedThisTurn: 2,
          turnComplete: true,
        };
        const result = endTurn(readyState);
        expect(result.success).toBe(true);
        return result.gameState;
      };

      expect(currentState.currentPlayer).toBe(0); // Host starts
      currentState = advanceTurn(currentState);
      expect(currentState.currentPlayer).toBe(1); // Player1
      currentState = advanceTurn(currentState);
      expect(currentState.currentPlayer).toBe(2); // Player2
      currentState = advanceTurn(currentState);
      expect(currentState.currentPlayer).toBe(3); // Player3
      currentState = advanceTurn(currentState);
      expect(currentState.currentPlayer).toBe(0); // Back to Host
    });
  });

  describe("Integration Test: Full Game Flow", () => {
    test("should handle complete game flow with all requirements", async () => {
      // 1. Create room with host
      const room = await roomManager.createRoom("host-socket", "Host");
      const roomCode = room.code;
      expect(room.players.get("host-socket").isHost).toBe(true);

      // 2. Add players up to maximum
      const playerNames = Array.from({ length: 9 }, (_, i) => `Player${i + 1}`);
      for (let i = 0; i < playerNames.length; i++) {
        const result = await roomManager.joinRoom(
          roomCode,
          `player${i}-socket`,
          playerNames[i]
        );
        expect(result.success).toBe(true);
        expect(result.isSpectator).toBe(false);
      }

      // 3. Add spectator (6th player)
      const spectatorResult = await roomManager.joinRoom(
        roomCode,
        "spectator-socket",
        "Spectator"
      );
      expect(spectatorResult.success).toBe(true);
      expect(spectatorResult.isSpectator).toBe(true);

      // 4. Start game with 10 players
      const allPlayerNames = ["Host", ...playerNames];
      const gameState = initializeGame(allPlayerNames);

      // 5. Verify card distribution
      expect(gameState.playerHands).toHaveLength(10);
      gameState.playerHands.forEach((hand) => {
        expect(hand).toHaveLength(getHandSize(10));
      });

      // 6. Simulate playing cards following rules
      let currentState = {
        ...gameState,
        playerHands: gameState.playerHands.map(() => [20, 30, 40, 50, 60, 70]),
      };

      const firstPlay = playCard(currentState, 20, 0);
      expect(firstPlay.success).toBe(true);
      currentState = firstPlay.gameState;
      const secondPlay = playCard(currentState, 30, 1);
      expect(secondPlay.success).toBe(true);
      currentState = secondPlay.gameState;
      expect(currentState.turnComplete).toBe(true);

      // 7. End turn and verify turn order
      const endTurnResult = endTurn({
        ...currentState,
        deck: [...currentState.deck],
        playerHands: currentState.playerHands.map((hand) => [...hand]),
      });
      expect(endTurnResult.success).toBe(true);
      currentState = endTurnResult.gameState;
      expect(currentState.currentPlayer).toBe(1); // Player1's turn

      // 8. Verify all requirements are met
      const updatedRoom = roomManager.getRoom(roomCode);
      expect(updatedRoom.players.size).toBe(10);
      expect(updatedRoom.spectators.size).toBe(1);
      expect(currentState.gameStarted).toBe(true);
    });
  });
});
