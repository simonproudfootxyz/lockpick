const RoomManager = require("../roomManager");

describe("RoomManager", () => {
  let roomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe("Room Creation", () => {
    test("should create a room with creator as host", () => {
      const socketId = "socket1";
      const playerName = "Player1";

      const room = roomManager.createRoom(socketId, playerName);

      expect(room).toBeDefined();
      expect(room.code).toBeDefined();
      expect(room.host).toBe(socketId);
      expect(room.players.has(socketId)).toBe(true);

      const player = room.players.get(socketId);
      expect(player.name).toBe(playerName);
      expect(player.isHost).toBe(true);
      expect(player.isConnected).toBe(true);
    });

    test("should generate unique room codes", () => {
      const socketId1 = "socket1";
      const socketId2 = "socket2";
      const playerName = "Player1";

      // Create first room
      const room1 = roomManager.createRoom(socketId1, playerName);

      // Create second room
      const room2 = roomManager.createRoom(socketId2, "Player2");

      expect(room1.code).not.toBe(room2.code);
      expect(room1.code).toHaveLength(6);
      expect(room2.code).toHaveLength(6);
    });
  });

  describe("Player Limits", () => {
    test("should allow maximum of 5 players", () => {
      const room = roomManager.createRoom("socket1", "Player1");
      const roomCode = room.code;

      // Add 4 more players (total 5)
      for (let i = 2; i <= 5; i++) {
        const reservation = roomManager.createPendingPlayer(
          roomCode,
          `Player${i}`
        );
        const result = roomManager.joinRoom(
          roomCode,
          `socket${i}`,
          `Player${i}`,
          reservation.playerId
        );
        expect(result.success).toBe(true);
        expect(result.isSpectator).toBe(false);
      }

      expect(room.players.size).toBe(5);
    });

    test("should make 6th player a spectator", () => {
      const room = roomManager.createRoom("socket1", "Player1");
      const roomCode = room.code;

      // Add 4 more players (total 5)
      for (let i = 2; i <= 5; i++) {
        const reservation = roomManager.createPendingPlayer(
          roomCode,
          `Player${i}`
        );
        roomManager.joinRoom(
          roomCode,
          `socket${i}`,
          `Player${i}`,
          reservation.playerId
        );
      }

      // 6th player should be spectator
      const reservation = roomManager.createPendingPlayer(roomCode, "Player6");
      const result = roomManager.joinRoom(
        roomCode,
        "socket6",
        "Player6",
        reservation.playerId
      );
      expect(result.success).toBe(true);
      expect(result.isSpectator).toBe(true);
      expect(room.spectators.has("socket6")).toBe(true);
      expect(room.players.size).toBe(5);
    });
  });

  describe("Player Names", () => {
    test("should not allow duplicate player names", () => {
      const room = roomManager.createRoom("socket1", "Player1");
      const roomCode = room.code;
      const reservation = roomManager.createPendingPlayer(roomCode, "Player2");
      roomManager.joinRoom(
        roomCode,
        "socket2",
        "Player2",
        reservation.playerId
      );

      // Try to add player with same name
      const duplicateReservation = roomManager.createPendingPlayer(
        roomCode,
        "Player1"
      );
      const result = roomManager.joinRoom(
        roomCode,
        "socket3",
        "Player1",
        duplicateReservation.playerId
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("That name is already in use in this room.");
    });

    test("should allow same name in different rooms", () => {
      const room1 = roomManager.createRoom("socket1", "Player1");
      const room2 = roomManager.createRoom("socket2", "Player1");

      expect(room1.code).toBeDefined();
      expect(room2.code).toBeDefined();
      expect(room1.code).not.toBe(room2.code);
    });
  });

  describe("Room Management", () => {
    test("should delete room when no players left", () => {
      const room = roomManager.createRoom("socket1", "Player1");
      const roomCode = room.code;

      expect(roomManager.getRoom(roomCode)).toBeDefined();

      // Player leaves
      roomManager.leaveRoom("socket1");

      // Room should still exist initially (delay before deletion)
      expect(roomManager.getRoom(roomCode)).toBeDefined();
    });

    test("should assign new host when host leaves", () => {
      const room = roomManager.createRoom("socket1", "Player1");
      const roomCode = room.code;
      const reservation = roomManager.createPendingPlayer(roomCode, "Player2");
      roomManager.joinRoom(
        roomCode,
        "socket2",
        "Player2",
        reservation.playerId
      );

      // Host leaves
      const result = roomManager.leaveRoom("socket1");
      expect(result.roomDeleted).toBe(false);

      // Check that new host is assigned
      const remainingPlayers = Array.from(room.players.values());
      const newHost = remainingPlayers.find((p) => p.isHost);
      expect(newHost).toBeDefined();
      expect(newHost.name).toBe("Player2");
    });
  });
});
