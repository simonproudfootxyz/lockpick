// Simple test to verify basic functionality
const RoomManager = require("../roomManager");

describe("Basic RoomManager Tests", () => {
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
    expect(room.code).toHaveLength(6);
    expect(room.host).toBe("socket1");
    expect(room.players.size).toBe(1);
  });

  test("should join a room", async () => {
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

  test("should prevent duplicate player names", async () => {
    const room = await roomManager.createRoom("socket1", "Player1");
    const roomCode = room.code;

    await reserveAndJoin(roomCode, "socket2", "Player2");

    const result = await reserveAndJoin(roomCode, "socket3", "Player1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("That name is already in use in this room.");
  });

  test("should make player 11 a spectator", async () => {
    const room = await roomManager.createRoom("socket1", "Player1");
    const roomCode = room.code;

    for (let i = 2; i <= 10; i++) {
      await reserveAndJoin(roomCode, `socket${i}`, `Player${i}`);
    }

    const result = await reserveAndJoin(roomCode, "socket11", "Player11");

    expect(result.success).toBe(true);
    expect(result.isSpectator).toBe(true);
    expect(room.players.size).toBe(10);
    expect(room.spectators.size).toBe(1);
  });
});
