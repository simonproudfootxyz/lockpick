const { v4: uuidv4 } = require("uuid");

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> room data
    this.playerRooms = new Map(); // socketId -> roomCode
  }

  generateRoomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  createRoom(hostSocketId, hostName) {
    const roomCode = this.generateRoomCode();
    const room = {
      code: roomCode,
      host: hostSocketId,
      players: new Map(),
      spectators: new Map(),
      gameState: null,
      maxPlayers: 5,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    // Add host as first player
    room.players.set(hostSocketId, {
      socketId: hostSocketId,
      name: hostName,
      isHost: true,
      isConnected: true,
      playerIndex: 0,
    });

    this.rooms.set(roomCode, room);
    this.playerRooms.set(hostSocketId, roomCode);

    return room;
  }

  joinRoom(roomCode, socketId, playerName) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: "Room not found" };
    }

    // Check if room is full
    if (room.players.size >= room.maxPlayers) {
      // Add as spectator
      room.spectators.set(socketId, {
        socketId: socketId,
        name: playerName,
        isHost: false,
        isConnected: true,
        isSpectator: true,
      });
      this.playerRooms.set(socketId, roomCode);
      return { success: true, isSpectator: true, room };
    }

    // Add as player
    const playerIndex = room.players.size;
    room.players.set(socketId, {
      socketId: socketId,
      name: playerName,
      isHost: false,
      isConnected: true,
      playerIndex: playerIndex,
    });

    this.playerRooms.set(socketId, roomCode);
    room.lastActivity = Date.now();

    return { success: true, isSpectator: false, room };
  }

  leaveRoom(socketId) {
    const roomCode = this.playerRooms.get(socketId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    // Remove from players or spectators
    const wasPlayer = room.players.has(socketId);
    const wasSpectator = room.spectators.has(socketId);

    room.players.delete(socketId);
    room.spectators.delete(socketId);
    this.playerRooms.delete(socketId);

    // If no players left, delete room after a short delay
    if (room.players.size === 0) {
      // Add a 5-second delay before deleting the room to allow for reconnections
      setTimeout(() => {
        const currentRoom = this.rooms.get(roomCode);
        if (currentRoom && currentRoom.players.size === 0) {
          this.rooms.delete(roomCode);
          console.log(`Room ${roomCode} deleted after delay due to no players`);
        }
      }, 5000);
      return { roomDeleted: false, wasPlayer, wasSpectator, room };
    }

    // If host left, assign new host
    if (wasPlayer && room.players.size > 0) {
      const newHost = room.players.values().next().value;
      newHost.isHost = true;
    }

    room.lastActivity = Date.now();
    return { roomDeleted: false, wasPlayer, wasSpectator, room };
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  getPlayerRoom(socketId) {
    const roomCode = this.playerRooms.get(socketId);
    return roomCode ? this.rooms.get(roomCode) : null;
  }

  updateGameState(roomCode, gameState) {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.gameState = gameState;
      room.lastActivity = Date.now();
    }
  }

  getRoomList() {
    const roomList = [];
    for (const [code, room] of this.rooms) {
      roomList.push({
        code,
        playerCount: room.players.size,
        spectatorCount: room.spectators.size,
        hasGame: !!room.gameState,
        createdAt: room.createdAt,
      });
    }
    return roomList;
  }

  // Clean up inactive rooms (older than 24 hours)
  cleanupInactiveRooms() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [code, room] of this.rooms) {
      if (now - room.lastActivity > maxAge) {
        this.rooms.delete(code);
        // Clean up player room mappings
        for (const [socketId, roomCode] of this.playerRooms) {
          if (roomCode === code) {
            this.playerRooms.delete(socketId);
          }
        }
      }
    }
  }
}

module.exports = RoomManager;
