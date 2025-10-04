// Simple test to verify basic functionality
const RoomManager = require("../roomManager");

describe("Basic RoomManager Tests", () => {
  let roomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  test("should create a room", () => {
    const room = roomManager.createRoom("socket1", "Player1");

    expect(room).toBeDefined();
    expect(room.code).toBeDefined();
    expect(room.host).toBe("socket1");
    expect(room.players.size).toBe(1);
  });

  test("should join a room", () => {
    const room = roomManager.createRoom("socket1", "Player1");
    const roomCode = room.code;

    const result = roomManager.joinRoom(roomCode, "socket2", "Player2");

    expect(result.success).toBe(true);
    expect(result.isSpectator).toBe(false);
    expect(room.players.size).toBe(2);
  });

  test("should handle invalid room code", () => {
    const result = roomManager.joinRoom("INVALID", "socket1", "Player1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Room not found");
  });

  test("should prevent duplicate player names", () => {
    const room = roomManager.createRoom("socket1", "Player1");
    const roomCode = room.code;

    roomManager.joinRoom(roomCode, "socket2", "Player2");

    const result = roomManager.joinRoom(roomCode, "socket3", "Player1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Player name already taken");
  });

  test("should make 6th player a spectator", () => {
    const room = roomManager.createRoom("socket1", "Player1");
    const roomCode = room.code;

    // Add 4 more players (total 5)
    for (let i = 2; i <= 5; i++) {
      roomManager.joinRoom(roomCode, `socket${i}`, `Player${i}`);
    }

    // 6th player should be spectator
    const result = roomManager.joinRoom(roomCode, "socket6", "Player6");

    expect(result.success).toBe(true);
    expect(result.isSpectator).toBe(true);
    expect(room.players.size).toBe(5);
    expect(room.spectators.size).toBe(1);
  });
});







