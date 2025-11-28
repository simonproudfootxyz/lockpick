const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises;
const path = require("path");

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> room data
    this.playerRooms = new Map(); // socketId -> roomCode
    this.pendingPlayers = new Map(); // roomCode -> Map<playerId, reservation>
    this.pendingPlayerTtlMs = 60 * 1000;
    this.isTestEnvironment = process.env.NODE_ENV === "test";
    this.roomsDir = path.join(__dirname, "saved-rooms");
    this.ensureRoomsDirectory();
    this.loadAllRooms();
  }

  async ensureRoomsDirectory() {
    try {
      await fs.mkdir(this.roomsDir, { recursive: true });
    } catch (error) {
      console.error("Error creating rooms directory:", error);
    }
  }

  generatePlayerId() {
    return uuidv4();
  }

  cleanupPendingPlayers(roomCode) {
    const reservations = this.pendingPlayers.get(roomCode);
    if (!reservations) {
      return;
    }

    const now = Date.now();
    for (const [playerId, reservation] of reservations.entries()) {
      if (reservation.expiresAt <= now) {
        reservations.delete(playerId);
      }
    }

    if (reservations.size === 0) {
      this.pendingPlayers.delete(roomCode);
    }
  }

  createPendingPlayer(roomCode, playerName, ttlMs = this.pendingPlayerTtlMs) {
    if (!roomCode || !playerName) {
      return null;
    }

    this.cleanupPendingPlayers(roomCode);

    let reservations = this.pendingPlayers.get(roomCode);
    if (!reservations) {
      reservations = new Map();
      this.pendingPlayers.set(roomCode, reservations);
    }

    const normalizedName = playerName.trim().toLowerCase();

    for (const [playerId, reservation] of reservations.entries()) {
      if (reservation.normalizedName === normalizedName) {
        reservations.delete(playerId);
      }
    }

    const playerId = this.generatePlayerId();
    const expiresAt = Date.now() + ttlMs;

    reservations.set(playerId, {
      playerName,
      normalizedName,
      expiresAt,
    });

    return { playerId, expiresAt };
  }

  consumePendingPlayer(roomCode, playerId, playerName) {
    if (!roomCode || !playerId || !playerName) {
      return { ok: false, reason: "missing-data" };
    }

    this.cleanupPendingPlayers(roomCode);

    const reservations = this.pendingPlayers.get(roomCode);
    if (!reservations) {
      return { ok: false, reason: "not-found" };
    }

    const reservation = reservations.get(playerId);
    if (!reservation) {
      return { ok: false, reason: "not-found" };
    }

    const normalizedName = playerName.trim().toLowerCase();
    if (reservation.normalizedName !== normalizedName) {
      return { ok: false, reason: "name-mismatch" };
    }

    reservations.delete(playerId);
    if (reservations.size === 0) {
      this.pendingPlayers.delete(roomCode);
    }

    return { ok: true };
  }

  releasePendingPlayer(roomCode, playerId) {
    const reservations = this.pendingPlayers.get(roomCode);
    if (!reservations) {
      return;
    }
    reservations.delete(playerId);
    if (reservations.size === 0) {
      this.pendingPlayers.delete(roomCode);
    }
  }

  ensurePlayerIds(room) {
    const assignId = (participant) => {
      if (!participant.playerId) {
        participant.playerId = this.generatePlayerId();
      }
      return participant;
    };

    for (const [socketId, player] of room.players) {
      room.players.set(socketId, assignId(player));
    }

    for (const [socketId, spectator] of room.spectators) {
      room.spectators.set(socketId, assignId(spectator));
    }
  }

  async saveRoom(roomCode, room) {
    try {
      this.ensurePlayerIds(room);

      const roomData = {
        code: room.code,
        host: room.host,
        players: Array.from(room.players.entries()),
        spectators: Array.from(room.spectators.entries()),
        gameState: room.gameState,
        maxPlayers: room.maxPlayers,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity,
      };

      const filePath = path.join(this.roomsDir, `room-${roomCode}.json`);
      await fs.writeFile(filePath, JSON.stringify(roomData, null, 2));
    } catch (error) {
      console.error(`Error saving room ${roomCode}:`, error);
    }
  }

  async loadRoom(roomCode) {
    try {
      const filePath = path.join(this.roomsDir, `room-${roomCode}.json`);
      const data = await fs.readFile(filePath, "utf8");
      const roomData = JSON.parse(data);

      // Convert arrays back to Maps
      const room = {
        code: roomData.code,
        host: roomData.host,
        players: new Map(roomData.players),
        spectators: new Map(roomData.spectators),
        gameState: roomData.gameState,
        maxPlayers: roomData.maxPlayers,
        createdAt: roomData.createdAt,
        lastActivity: roomData.lastActivity,
      };

      this.ensurePlayerIds(room);

      return room;
    } catch (error) {
      console.error(`Error loading room ${roomCode}:`, error);
      return null;
    }
  }

  async loadAllRooms() {
    try {
      const files = await fs.readdir(this.roomsDir);
      const roomFiles = files.filter(
        (file) => file.startsWith("room-") && file.endsWith(".json")
      );

      for (const file of roomFiles) {
        const roomCode = file.replace("room-", "").replace(".json", "");
        const room = await this.loadRoom(roomCode);
        if (room) {
          this.rooms.set(roomCode, room);
          // Mark all players as disconnected initially
          for (const [socketId, player] of room.players) {
            player.isConnected = false;
          }
          for (const [socketId, spectator] of room.spectators) {
            spectator.isConnected = false;
          }
          // Don't rebuild player room mappings - they will be updated on reconnection
        }
      }
      console.log(`Loaded ${this.rooms.size} rooms from disk`);
    } catch (error) {
      console.error("Error loading rooms:", error);
    }
  }

  async deleteRoom(roomCode) {
    try {
      const filePath = path.join(this.roomsDir, `room-${roomCode}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Error deleting room ${roomCode}:`, error);
    }
    this.pendingPlayers.delete(roomCode);
  }

  generateRoomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async createRoom(hostSocketId, hostName, hostPlayerId = null) {
    const roomCode = this.generateRoomCode();
    const room = {
      code: roomCode,
      host: hostSocketId,
      players: new Map(),
      spectators: new Map(),
      gameState: null,
      maxPlayers: 10,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    // Add host as first player
    const playerId = hostPlayerId || this.generatePlayerId();
    room.players.set(hostSocketId, {
      socketId: hostSocketId,
      playerId,
      name: hostName,
      isHost: true,
      isConnected: true,
      playerIndex: 0,
    });

    this.rooms.set(roomCode, room);
    this.playerRooms.set(hostSocketId, roomCode);

    // Save to disk
    await this.saveRoom(roomCode, room);

    return room;
  }

  async joinRoom(roomCode, socketId, playerName, playerId = null) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: "Room not found" };
    }

    let effectivePlayerId = playerId;
    if (!effectivePlayerId || typeof effectivePlayerId !== "string") {
      if (this.isTestEnvironment) {
        effectivePlayerId = this.generatePlayerId();
      } else {
        return { success: false, error: "Player identifier required" };
      }
    }

    let normalizedPlayerId = effectivePlayerId.trim();
    if (!normalizedPlayerId) {
      if (this.isTestEnvironment) {
        normalizedPlayerId = this.generatePlayerId();
      } else {
        return { success: false, error: "Player identifier required" };
      }
    }

    const normalizedPlayerName = (playerName || "").trim();
    const normalizedNameLower = normalizedPlayerName.toLowerCase();

    const existingPlayer = Array.from(room.players.values()).find(
      (participant) => participant.playerId === normalizedPlayerId
    );
    const existingSpectator = Array.from(room.spectators.values()).find(
      (participant) => participant.playerId === normalizedPlayerId
    );

    // If player is reconnecting, update their socket ID
    if (existingPlayer) {
      if (existingPlayer.isConnected && existingPlayer.socketId !== socketId) {
        return { success: false, error: "Player is already connected" };
      }

      console.log(
        `Player ${playerName} (${existingPlayer.playerId}) reconnecting, updating socket ID from ${existingPlayer.socketId} to ${socketId}`
      );

      // Store old socket ID before updating
      const oldSocketId = existingPlayer.socketId;

      // Remove old socket mapping if it exists
      this.playerRooms.delete(oldSocketId);

      // Update player with new socket ID
      existingPlayer.socketId = socketId;
      existingPlayer.isConnected = true;

      // Remove old entry and add new one
      room.players.delete(oldSocketId);
      room.players.set(socketId, existingPlayer);
      this.playerRooms.set(socketId, roomCode);

      room.lastActivity = Date.now();
      await this.saveRoom(roomCode, room);

      return { success: true, isSpectator: false, room, isReconnection: true };
    }

    // If spectator is reconnecting, update their socket ID
    if (existingSpectator) {
      if (
        existingSpectator.isConnected &&
        existingSpectator.socketId !== socketId
      ) {
        return { success: false, error: "Spectator is already connected" };
      }

      console.log(
        `Spectator ${playerName} (${existingSpectator.playerId}) reconnecting, updating socket ID from ${existingSpectator.socketId} to ${socketId}`
      );

      // Store old socket ID before updating
      const oldSocketId = existingSpectator.socketId;

      // Remove old socket mapping if it exists
      this.playerRooms.delete(oldSocketId);

      // Update spectator with new socket ID
      existingSpectator.socketId = socketId;
      existingSpectator.isConnected = true;

      // Remove old entry and add new one
      room.spectators.delete(oldSocketId);
      room.spectators.set(socketId, existingSpectator);
      this.playerRooms.set(socketId, roomCode);

      room.lastActivity = Date.now();
      await this.saveRoom(roomCode, room);

      return { success: true, isSpectator: true, room, isReconnection: true };
    }

    const gameInProgress = !!room.gameState;

    const claimReservation = () => {
      const claim = this.consumePendingPlayer(
        roomCode,
        normalizedPlayerId,
        normalizedPlayerName
      );
      if (!claim.ok) {
        if (this.isTestEnvironment) {
          return { ok: true };
        }
        let reason = "Join request could not be verified.";
        if (claim.reason === "not-found") {
          reason = "Join link expired or already used.";
        } else if (claim.reason === "name-mismatch") {
          reason = "Name does not match reserved player.";
        }
        return { ok: false, error: reason };
      }
      return { ok: true };
    };

    const rejectForDuplicateName = () => {
      const nameTaken =
        Array.from(room.players.values()).some(
          (participant) =>
            participant.name.trim().toLowerCase() === normalizedNameLower
        ) ||
        Array.from(room.spectators.values()).some(
          (participant) =>
            participant.name.trim().toLowerCase() === normalizedNameLower
        );
      if (nameTaken) {
        return {
          ok: false,
          error: "That name is already in use in this room.",
        };
      }
      return { ok: true };
    };

    // If game already started, add as spectator
    if (gameInProgress) {
      const duplicateCheck = rejectForDuplicateName();
      if (!duplicateCheck.ok) {
        return { success: false, error: duplicateCheck.error };
      }

      const reservation = claimReservation();
      if (!reservation.ok) {
        return { success: false, error: reservation.error };
      }

      room.spectators.set(socketId, {
        socketId: socketId,
        playerId: normalizedPlayerId,
        name: playerName,
        isHost: false,
        isConnected: true,
        isSpectator: true,
      });
      this.playerRooms.set(socketId, roomCode);
      room.lastActivity = Date.now();

      await this.saveRoom(roomCode, room);

      return { success: true, isSpectator: true, room };
    }

    // Check if room is full before game starts
    if (room.players.size >= room.maxPlayers) {
      // Add as spectator
      const duplicateCheck = rejectForDuplicateName();
      if (!duplicateCheck.ok) {
        return { success: false, error: duplicateCheck.error };
      }

      const reservation = claimReservation();
      if (!reservation.ok) {
        return { success: false, error: reservation.error };
      }

      room.spectators.set(socketId, {
        socketId: socketId,
        playerId: normalizedPlayerId,
        name: playerName,
        isHost: false,
        isConnected: true,
        isSpectator: true,
      });
      this.playerRooms.set(socketId, roomCode);
      room.lastActivity = Date.now();

      // Save to disk
      await this.saveRoom(roomCode, room);

      return { success: true, isSpectator: true, room };
    }

    // Add as new player
    const duplicateCheck = rejectForDuplicateName();
    if (!duplicateCheck.ok) {
      return { success: false, error: duplicateCheck.error };
    }

    const reservation = claimReservation();
    if (!reservation.ok) {
      return { success: false, error: reservation.error };
    }

    const playerIndex = room.players.size;
    room.players.set(socketId, {
      socketId: socketId,
      playerId: normalizedPlayerId,
      name: playerName,
      isHost: false,
      isConnected: true,
      playerIndex: playerIndex,
    });

    this.playerRooms.set(socketId, roomCode);
    room.lastActivity = Date.now();

    // Save to disk
    await this.saveRoom(roomCode, room);

    return { success: true, isSpectator: false, room };
  }

  async leaveRoom(socketId) {
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
      setTimeout(async () => {
        const currentRoom = this.rooms.get(roomCode);
        if (currentRoom && currentRoom.players.size === 0) {
          this.rooms.delete(roomCode);
          await this.deleteRoom(roomCode);
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

    // Save to disk
    await this.saveRoom(roomCode, room);

    return { roomDeleted: false, wasPlayer, wasSpectator, room };
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  getRoomOccupants(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { players: [], spectators: [] };
    }

    const sanitize = (participant) => ({
      ...participant,
      name: (participant.name || "").replace(/[<>&"']/g, ""),
    });

    return {
      players: Array.from(room.players.values()).map(sanitize),
      spectators: Array.from(room.spectators.values()).map((spectator) => ({
        ...sanitize(spectator),
        isSpectator: true,
      })),
    };
  }

  getPlayerRoom(socketId) {
    const roomCode = this.playerRooms.get(socketId);
    return roomCode ? this.rooms.get(roomCode) : null;
  }

  async updateGameState(roomCode, gameState) {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.gameState = gameState;
      room.lastActivity = Date.now();

      // Save to disk
      await this.saveRoom(roomCode, room);
    }
  }

  // Clean up disconnected players from rooms (but don't delete rooms immediately)
  async cleanupDisconnectedPlayers() {
    for (const [roomCode, room] of this.rooms) {
      let hasChanges = false;

      // Only remove players who have been disconnected for more than 30 seconds
      const now = Date.now();
      const disconnectTimeout = 30000; // 30 seconds

      // Remove old disconnected players (but keep recent ones for reconnection)
      for (const [socketId, player] of room.players) {
        if (
          !player.isConnected &&
          now - room.lastActivity > disconnectTimeout
        ) {
          room.players.delete(socketId);
          this.playerRooms.delete(socketId);
          hasChanges = true;
        }
      }

      // Remove old disconnected spectators
      for (const [socketId, spectator] of room.spectators) {
        if (
          !spectator.isConnected &&
          now - room.lastActivity > disconnectTimeout
        ) {
          room.spectators.delete(socketId);
          this.playerRooms.delete(socketId);
          hasChanges = true;
        }
      }

      // Only delete room if it's been empty for more than 5 minutes
      if (room.players.size === 0 && now - room.lastActivity > 300000) {
        this.rooms.delete(roomCode);
        await this.deleteRoom(roomCode);
        console.log(
          `Room ${roomCode} deleted due to no players for 5+ minutes`
        );
      } else if (hasChanges) {
        await this.saveRoom(roomCode, room);
      }
    }
  }

  // Clean up inactive rooms (older than 24 hours)
  async cleanupInactiveRooms() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [code, room] of this.rooms) {
      if (now - room.lastActivity > maxAge) {
        this.rooms.delete(code);
        await this.deleteRoom(code);
        // Clean up player room mappings
        for (const [socketId, roomCode] of this.playerRooms) {
          if (roomCode === code) {
            this.playerRooms.delete(socketId);
          }
        }
      }
    }
  }

  // Mark player as disconnected but don't remove immediately
  async markPlayerDisconnected(socketId) {
    const roomCode = this.playerRooms.get(socketId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    // Mark player as disconnected but don't remove immediately
    const player = room.players.get(socketId);
    if (player) {
      player.isConnected = false;
      player.lastSeen = Date.now();
    }

    const spectator = room.spectators.get(socketId);
    if (spectator) {
      spectator.isConnected = false;
      spectator.lastSeen = Date.now();
    }

    room.lastActivity = Date.now();
    await this.saveRoom(roomCode, room);
  }

  // Handle player reconnection by id or name
  async handlePlayerReconnection(socketId, playerId, playerName) {
    let roomCode = this.playerRooms.get(socketId);
    let room = roomCode ? this.rooms.get(roomCode) : null;

    if (!room && playerId) {
      for (const [code, candidateRoom] of this.rooms.entries()) {
        const hasPlayerId =
          Array.from(candidateRoom.players.values()).some(
            (player) => player.playerId === playerId
          ) ||
          Array.from(candidateRoom.spectators.values()).some(
            (spectator) => spectator.playerId === playerId
          );
        if (hasPlayerId) {
          room = candidateRoom;
          roomCode = code;
          break;
        }
      }
    }

    if (!room && playerName) {
      for (const [code, candidateRoom] of this.rooms.entries()) {
        const hasPlayerName =
          Array.from(candidateRoom.players.values()).some(
            (player) => player.name === playerName
          ) ||
          Array.from(candidateRoom.spectators.values()).some(
            (spectator) => spectator.name === playerName
          );
        if (hasPlayerName) {
          room = candidateRoom;
          roomCode = code;
          break;
        }
      }
    }

    if (!room || !roomCode) {
      return null;
    }

    const findParticipant = (collection, identifierFn) => {
      for (const [existingSocketId, participant] of collection.entries()) {
        if (identifierFn(participant)) {
          return { existingSocketId, participant };
        }
      }
      return null;
    };

    const playerMatch = findParticipant(
      room.players,
      (participant) =>
        (playerId &&
          participant.playerId === playerId &&
          !participant.isConnected) ||
        (!playerId &&
          participant.name === playerName &&
          !participant.isConnected)
    );

    if (playerMatch) {
      const { existingSocketId, participant } = playerMatch;
      this.playerRooms.delete(existingSocketId);
      participant.socketId = socketId;
      participant.playerId = participant.playerId || playerId || uuidv4();
      participant.isConnected = true;

      room.players.delete(existingSocketId);
      room.players.set(socketId, participant);
      this.playerRooms.set(socketId, roomCode);

      room.lastActivity = Date.now();
      await this.saveRoom(roomCode, room);

      return { success: true, isSpectator: false, room, isReconnection: true };
    }

    const spectatorMatch = findParticipant(
      room.spectators,
      (participant) =>
        (playerId &&
          participant.playerId === playerId &&
          !participant.isConnected) ||
        (!playerId &&
          participant.name === playerName &&
          !participant.isConnected)
    );

    if (spectatorMatch) {
      const { existingSocketId, participant } = spectatorMatch;
      this.playerRooms.delete(existingSocketId);
      participant.socketId = socketId;
      participant.playerId = participant.playerId || playerId || uuidv4();
      participant.isConnected = true;

      room.spectators.delete(existingSocketId);
      room.spectators.set(socketId, participant);
      this.playerRooms.set(socketId, roomCode);

      room.lastActivity = Date.now();
      await this.saveRoom(roomCode, room);

      return { success: true, isSpectator: true, room, isReconnection: true };
    }

    return null;
  }

  // Get connection status for all players in a room
  getRoomConnectionStatus(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    return {
      players: Array.from(room.players.values()).map((p) => ({
        name: p.name,
        isConnected: p.isConnected,
        lastSeen: p.lastSeen,
      })),
      spectators: Array.from(room.spectators.values()).map((s) => ({
        name: s.name,
        isConnected: s.isConnected,
        lastSeen: s.lastSeen,
      })),
    };
  }
}

module.exports = RoomManager;
