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
});




