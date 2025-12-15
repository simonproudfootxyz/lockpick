const RoomManager = require("../roomManager");
const { initializeGame, playCard, endTurn } = require("../gameLogic");

describe("Multiplayer Game Integration", () => {
  let roomManager;

  const stubRoomLoading = () => {
    jest
      .spyOn(RoomManager.prototype, "loadAllRooms")
      .mockImplementation(async () => {});
  };

  beforeEach(async () => {
    stubRoomLoading();
    roomManager = new RoomManager();
    await roomManager.loadAllRooms();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Full Game Flow", () => {
    test("should complete a full game cycle with multiple players", async () => {
      const room = await roomManager.createRoom("host-socket", "Host");
      const roomCode = room.code;

      const reservation = roomManager.createPendingPlayer(roomCode, "Player2");
      const player2Result = await roomManager.joinRoom(
        roomCode,
        "player2-socket",
        "Player2",
        reservation.playerId
      );
      expect(player2Result.success).toBe(true);
      expect(player2Result.isSpectator).toBe(false);

      let currentState = initializeGame(["Host", "Player2"]);
      await roomManager.updateGameState(roomCode, currentState);

      expect(currentState.playerHands).toHaveLength(2);
      expect(currentState.currentPlayer).toBe(0);
      expect(currentState.turnComplete).toBe(false);

      const firstCard = currentState.playerHands[0][0];
      const firstPlay = playCard(currentState, firstCard, 0);
      expect(firstPlay.success).toBe(true);
      currentState = firstPlay.gameState;
      expect(currentState.discardPiles[0]).toContain(firstCard);

      const secondCard = currentState.playerHands[0][0];
      const secondPlay = playCard(currentState, secondCard, 0);
      expect(secondPlay.success).toBe(true);
      currentState = secondPlay.gameState;
      expect(currentState.turnComplete).toBe(true);

      const endTurnResult = endTurn(currentState);
      expect(endTurnResult.success).toBe(true);
      currentState = endTurnResult.gameState;
      expect(currentState.currentPlayer).toBe(1);
      expect(currentState.cardsPlayedThisTurn).toBe(0);
    });

    test("should handle spectator joining after game starts", async () => {
      const room = await roomManager.createRoom("host-socket", "Host");
      const roomCode = room.code;

      for (let i = 1; i <= 9; i++) {
        const reservation = roomManager.createPendingPlayer(
          roomCode,
          `Player${i}`
        );
        await roomManager.joinRoom(
          roomCode,
          `player${i}-socket`,
          `Player${i}`,
          reservation.playerId
        );
      }

      const gameState = initializeGame([
        "Host",
        "Player1",
        "Player2",
        "Player3",
        "Player4",
      ]);
      await roomManager.updateGameState(roomCode, gameState);

      const spectatorReservation = roomManager.createPendingPlayer(
        roomCode,
        "Spectator"
      );
      const spectatorResult = await roomManager.joinRoom(
        roomCode,
        "spectator-socket",
        "Spectator",
        spectatorReservation.playerId
      );
      expect(spectatorResult.success).toBe(true);
      expect(spectatorResult.isSpectator).toBe(true);

      const updatedRoom = roomManager.getRoom(roomCode);
      expect(updatedRoom.players.size).toBe(10);
      expect(updatedRoom.spectators.size).toBe(1);
    });
  });

  describe("Game State Persistence", () => {
    test("should maintain game state across player disconnections", async () => {
      const room = await roomManager.createRoom("host-socket", "Host");
      const roomCode = room.code;

      const reservation = roomManager.createPendingPlayer(roomCode, "Player2");
      await roomManager.joinRoom(
        roomCode,
        "player2-socket",
        "Player2",
        reservation.playerId
      );

      let gameState = initializeGame(["Host", "Player2"]);
      await roomManager.updateGameState(roomCode, gameState);

      const playResult = playCard(gameState, gameState.playerHands[0][0], 0);
      expect(playResult.success).toBe(true);
      gameState = playResult.gameState;
      await roomManager.updateGameState(roomCode, gameState);

      await roomManager.leaveRoom("player2-socket");
      const rejoinReservation = roomManager.createPendingPlayer(
        roomCode,
        "Player2"
      );
      const rejoinResult = await roomManager.joinRoom(
        roomCode,
        "player2-socket",
        "Player2",
        rejoinReservation.playerId
      );

      expect(rejoinResult.success).toBe(true);

      const updatedRoom = roomManager.getRoom(roomCode);
      expect(updatedRoom.gameState).toBeDefined();
      expect(updatedRoom.gameState.discardPiles[0].length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid room codes gracefully", async () => {
      const result = await roomManager.joinRoom(
        "INVALID",
        "socket1",
        "Player1",
        "test-player-id"
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Room not found");
    });

    test("should handle duplicate player names", async () => {
      const room = await roomManager.createRoom("host-socket", "Host");
      const roomCode = room.code;
      await roomManager.joinRoom(roomCode, "player2-socket", "Player2", "id-2");

      const duplicateResult = await roomManager.joinRoom(
        roomCode,
        "player3-socket",
        "Player2",
        "id-3"
      );
      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.error).toBe("That name is already in use in this room.");
    });

    test("should handle full room correctly", async () => {
      const room = await roomManager.createRoom("host-socket", "Host");
      const roomCode = room.code;

      for (let i = 1; i <= 9; i++) {
        await roomManager.joinRoom(
          roomCode,
          `player${i}-socket`,
          `Player${i}`,
          `id-${i}`
        );
      }

      const spectatorResult = await roomManager.joinRoom(
        roomCode,
        "spectator-socket",
        "Spectator",
        "spectator-id"
      );
      expect(spectatorResult.success).toBe(true);
      expect(spectatorResult.isSpectator).toBe(true);
      const updatedRoom = roomManager.getRoom(roomCode);
      expect(updatedRoom.players.size).toBe(10);
      expect(updatedRoom.spectators.size).toBe(1);
    });
  });

  describe("Turn Order Validation", () => {
    test("should maintain correct turn order based on join sequence", async () => {
      const room = await roomManager.createRoom("host-socket", "Host");
      const roomCode = room.code;

      const joinOrder = ["Player1", "Player2", "Player3"];
      for (let i = 0; i < joinOrder.length; i++) {
        await roomManager.joinRoom(
          roomCode,
          `player${i}-socket`,
          joinOrder[i],
          `id-${i}`
        );
      }

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

      expect(currentState.currentPlayer).toBe(0);
      currentState = advanceTurn(currentState);
      expect(currentState.currentPlayer).toBe(1);
      currentState = advanceTurn(currentState);
      expect(currentState.currentPlayer).toBe(2);
      currentState = advanceTurn(currentState);
      expect(currentState.currentPlayer).toBe(3);
      currentState = advanceTurn(currentState);
      expect(currentState.currentPlayer).toBe(0);
    });
  });

  describe("Minimum Cards Requirement", () => {
    test("should enforce minimum 2 cards before turn completion", () => {
      const gameState = {
        playerHands: [
          [20, 30, 40],
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

      const firstPlay = playCard(gameState, 20, 0);
      expect(firstPlay.success).toBe(true);
      expect(firstPlay.gameState.turnComplete).toBe(false);
      expect(firstPlay.gameState.cardsPlayedThisTurn).toBe(1);

      const secondPlay = playCard(firstPlay.gameState, 30, 1);
      expect(secondPlay.success).toBe(true);
      expect(secondPlay.gameState.turnComplete).toBe(true);
      expect(secondPlay.gameState.cardsPlayedThisTurn).toBe(2);
    });

    test("should reset cards played count after ending turn", () => {
      let gameState = {
        playerHands: [
          [20, 30, 40],
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

      const firstPlay = playCard(gameState, 20, 0);
      expect(firstPlay.success).toBe(true);
      const secondPlay = playCard(firstPlay.gameState, 30, 1);
      expect(secondPlay.success).toBe(true);

      const endTurnResult = endTurn({
        ...secondPlay.gameState,
        deck: [...secondPlay.gameState.deck],
        playerHands: secondPlay.gameState.playerHands.map((hand) => [...hand]),
      });
      expect(endTurnResult.success).toBe(true);
      gameState = endTurnResult.gameState;
      expect(gameState.cardsPlayedThisTurn).toBe(0);
      expect(gameState.turnComplete).toBe(false);
    });
  });
});










