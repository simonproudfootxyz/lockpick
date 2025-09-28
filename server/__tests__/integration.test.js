const RoomManager = require("../roomManager");
const { initializeGame, playCard, endTurn } = require("../gameLogic");

describe("Multiplayer Game Integration", () => {
  let roomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe("Full Game Flow", () => {
    test("should complete a full game cycle with multiple players", () => {
      // Create room with host
      const roomCode = "TEST123";
      const hostResult = roomManager.createRoom(
        roomCode,
        "host-socket",
        "Host"
      );
      expect(hostResult.success).toBe(true);

      // Add second player
      const player2Result = roomManager.joinRoom(
        roomCode,
        "player2-socket",
        "Player2"
      );
      expect(player2Result.success).toBe(true);
      expect(player2Result.isSpectator).toBe(false);

      // Start game
      const room = roomManager.getRoom(roomCode);
      const gameState = initializeGame(["Host", "Player2"]);
      roomManager.updateGameState(roomCode, gameState);

      // Verify game state
      expect(gameState.playerHands).toHaveLength(2);
      expect(gameState.currentPlayer).toBe(0);
      expect(gameState.turnComplete).toBe(false);

      // Host plays first card
      const cardToPlay = gameState.playerHands[0][0];
      const newGameState = playCard(gameState, 0, 0, 0);
      expect(newGameState.discardPiles[0]).toContain(cardToPlay);
      expect(newGameState.playerHands[0]).not.toContain(cardToPlay);

      // Host plays second card
      const cardToPlay2 = newGameState.playerHands[0][0];
      const finalGameState = playCard(newGameState, 0, 0, 1);
      expect(finalGameState.turnComplete).toBe(true);

      // End turn
      const nextTurnState = endTurn(finalGameState);
      expect(nextTurnState.currentPlayer).toBe(1);
      expect(nextTurnState.cardsPlayedThisTurn).toBe(0);
    });

    test("should handle spectator joining after game starts", () => {
      const roomCode = "TEST123";

      // Create room and add 5 players
      roomManager.createRoom(roomCode, "host-socket", "Host");
      for (let i = 1; i <= 5; i++) {
        roomManager.joinRoom(roomCode, `player${i}-socket`, `Player${i}`);
      }

      // Start game
      const room = roomManager.getRoom(roomCode);
      const gameState = initializeGame([
        "Host",
        "Player1",
        "Player2",
        "Player3",
        "Player4",
      ]);
      roomManager.updateGameState(roomCode, gameState);

      // 6th player should be spectator
      const spectatorResult = roomManager.joinRoom(
        roomCode,
        "spectator-socket",
        "Spectator"
      );
      expect(spectatorResult.success).toBe(true);
      expect(spectatorResult.isSpectator).toBe(true);

      const updatedRoom = roomManager.getRoom(roomCode);
      expect(updatedRoom.players.size).toBe(5);
      expect(updatedRoom.spectators.size).toBe(1);
    });
  });

  describe("Game State Persistence", () => {
    test("should maintain game state across player disconnections", () => {
      const roomCode = "TEST123";

      // Create room and start game
      roomManager.createRoom(roomCode, "host-socket", "Host");
      roomManager.joinRoom(roomCode, "player2-socket", "Player2");

      const room = roomManager.getRoom(roomCode);
      const gameState = initializeGame(["Host", "Player2"]);
      roomManager.updateGameState(roomCode, gameState);

      // Simulate player playing cards
      const newGameState = playCard(gameState, 0, 0, 0);
      roomManager.updateGameState(roomCode, newGameState);

      // Player disconnects and reconnects
      roomManager.leaveRoom("player2-socket");
      const rejoinResult = roomManager.joinRoom(
        roomCode,
        "player2-socket",
        "Player2"
      );

      expect(rejoinResult.success).toBe(true);

      const updatedRoom = roomManager.getRoom(roomCode);
      expect(updatedRoom.gameState).toBeDefined();
      expect(updatedRoom.gameState.discardPiles[0]).toHaveLength(1);
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid room codes gracefully", () => {
      const result = roomManager.joinRoom("INVALID", "socket1", "Player1");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Room not found");
    });

    test("should handle duplicate player names", () => {
      const roomCode = "TEST123";
      roomManager.createRoom(roomCode, "host-socket", "Host");
      roomManager.joinRoom(roomCode, "player2-socket", "Player2");

      const duplicateResult = roomManager.joinRoom(
        roomCode,
        "player3-socket",
        "Player2"
      );
      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.error).toBe("Player name already taken");
    });

    test("should handle full room correctly", () => {
      const roomCode = "TEST123";
      roomManager.createRoom(roomCode, "host-socket", "Host");

      // Add 4 more players (total 5)
      for (let i = 1; i <= 4; i++) {
        const result = roomManager.joinRoom(
          roomCode,
          `player${i}-socket`,
          `Player${i}`
        );
        expect(result.success).toBe(true);
        expect(result.isSpectator).toBe(false);
      }

      // 6th player should be spectator
      const spectatorResult = roomManager.joinRoom(
        roomCode,
        "spectator-socket",
        "Spectator"
      );
      expect(spectatorResult.success).toBe(true);
      expect(spectatorResult.isSpectator).toBe(true);
    });
  });

  describe("Turn Order Validation", () => {
    test("should maintain correct turn order based on join sequence", () => {
      const roomCode = "TEST123";

      // Create room with host
      roomManager.createRoom(roomCode, "host-socket", "Host");

      // Add players in specific order
      const joinOrder = ["Player1", "Player2", "Player3"];
      for (let i = 0; i < joinOrder.length; i++) {
        roomManager.joinRoom(roomCode, `player${i}-socket`, joinOrder[i]);
      }

      // Start game
      const room = roomManager.getRoom(roomCode);
      const gameState = initializeGame(["Host", ...joinOrder]);

      // Turn order should be: Host (0), Player1 (1), Player2 (2), Player3 (3)
      expect(gameState.currentPlayer).toBe(0); // Host starts

      let currentState = endTurn(gameState);
      expect(currentState.currentPlayer).toBe(1); // Player1

      currentState = endTurn(currentState);
      expect(currentState.currentPlayer).toBe(2); // Player2

      currentState = endTurn(currentState);
      expect(currentState.currentPlayer).toBe(3); // Player3

      currentState = endTurn(currentState);
      expect(currentState.currentPlayer).toBe(0); // Back to Host
    });
  });

  describe("Minimum Cards Requirement", () => {
    test("should enforce minimum 2 cards before turn completion", () => {
      const playerNames = ["Player1", "Player2"];
      const gameState = initializeGame(playerNames);

      // Play 1 card - turn should not be complete
      const afterOneCard = playCard(gameState, 0, 0, 0);
      expect(afterOneCard.turnComplete).toBe(false);
      expect(afterOneCard.cardsPlayedThisTurn).toBe(1);

      // Play 2nd card - turn should be complete
      const afterTwoCards = playCard(afterOneCard, 0, 0, 1);
      expect(afterTwoCards.turnComplete).toBe(true);
      expect(afterTwoCards.cardsPlayedThisTurn).toBe(2);
    });

    test("should reset cards played count after ending turn", () => {
      const playerNames = ["Player1", "Player2"];
      let gameState = initializeGame(playerNames);

      // Play 2 cards to complete turn
      gameState = playCard(gameState, 0, 0, 0);
      gameState = playCard(gameState, 0, 0, 1);
      expect(gameState.turnComplete).toBe(true);

      // End turn
      gameState = endTurn(gameState);
      expect(gameState.cardsPlayedThisTurn).toBe(0);
      expect(gameState.turnComplete).toBe(false);
    });
  });
});

