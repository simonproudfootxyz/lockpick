// Basic test without complex dependencies
describe("Basic Math Test", () => {
  test("should add numbers correctly", () => {
    expect(2 + 2).toBe(4);
  });

  test("should handle string operations", () => {
    expect("hello" + " " + "world").toBe("hello world");
  });
});

// Test the RoomManager without complex setup
const RoomManager = require("../roomManager");

describe("RoomManager Basic Tests", () => {
  let roomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  const reserveAndJoin = async (roomCode, socketId, playerName) => {
    const reservation = roomManager.createPendingPlayer(roomCode, playerName);
    return roomManager.joinRoom(
      roomCode,
      socketId,
      playerName,
      reservation?.playerId
    );
  };

  test("should create a room", async () => {
    const room = await roomManager.createRoom("socket1", "Player1");

    expect(room).toBeDefined();
    expect(room.code).toBeDefined();
    expect(room.host).toBe("socket1");
    expect(room.players.size).toBe(1);
  });

  test("should join a room before game starts", async () => {
    const room = await roomManager.createRoom("socket1", "Player1");
    const roomCode = room.code;

    const result = await reserveAndJoin(roomCode, "socket2", "Player2");

    expect(result.success).toBe(true);
    expect(result.isSpectator).toBe(false);
    expect(room.players.size).toBe(2);
  });

  test("should handle invalid room code", async () => {
    const result = await roomManager.joinRoom(
      "INVALID",
      "socket1",
      "Player1",
      "test-player-id"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Room not found");
  });

  test("late joiner after game start becomes spectator", async () => {
    const room = await roomManager.createRoom("socket1", "Host");
    const roomCode = room.code;

    await reserveAndJoin(roomCode, "socket2", "Player2");

    room.gameState = { playerHands: [[1], [2]], currentPlayer: 0 };
    await roomManager.updateGameState(roomCode, room.gameState);

    const result = await reserveAndJoin(roomCode, "socket3", "Latecomer");

    expect(result.success).toBe(true);
    expect(result.isSpectator).toBe(true);
    expect(room.players.size).toBe(2);
    expect(room.spectators.size).toBe(1);
    expect(room.spectators.get("socket3").name).toBe("Latecomer");
  });
});
