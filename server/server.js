const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const path = require("path");
const validator = require("validator");

const RoomManager = require("./roomManager");
const GamePersistence = require("./persistence");
const {
  initializeGame,
  playCard,
  endTurn,
  handleCantPlay,
  getGameStatus,
  sortCurrentPlayerHand,
} = require("./gameLogic");

const app = express();

if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] === "https") {
      return next();
    }
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  });
}

const server = http.createServer(app);

const devOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
const allowedOrigins = Array.from(
  new Set(
    (process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(",") : [])
      .map((origin) => origin.trim())
      .filter(Boolean)
      .concat(process.env.NODE_ENV === "production" ? [] : devOrigins)
  )
);

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: Number(process.env.SOCKET_PING_TIMEOUT_MS) || 30000,
  pingInterval: Number(process.env.SOCKET_PING_INTERVAL_MS) || 10000,
});

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(compression());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "64kb" }));

const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000;
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || 120;

if (process.env.NODE_ENV !== "test") {
  console.log(
    `Rate limiting configured: window=${rateLimitWindowMs}ms, max=${rateLimitMax}`
  );
}

const limiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Initialize managers
const roomManager = new RoomManager();
const persistence = new GamePersistence();

// Clean up disconnected players on startup (DISABLED - too aggressive)
// setTimeout(async () => {
//   await roomManager.cleanupDisconnectedPlayers();
// }, 1000);

// Clean up inactive rooms every hour
setInterval(async () => {
  await roomManager.cleanupInactiveRooms();
  await persistence.cleanupOldGames();
}, 60 * 60 * 1000);

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id} at ${new Date().toISOString()}`);

  // Add connection event listeners for debugging
  socket.on("disconnect", (reason) => {
    console.log(
      `Player ${
        socket.id
      } disconnected: ${reason} at ${new Date().toISOString()}`
    );
  });

  // Handle ping/pong for connection health
  socket.on("ping", () => {
    socket.emit("pong");
  });

  socket.on("pong", () => {
    // Client responded to ping - connection is healthy
  });

  // Create a new room
  socket.on("create-room", async (data = {}) => {
    try {
      const { playerName } = data;
      if (!isValidPlayerName(playerName)) {
        socket.emit("error", { message: "Player name is required" });
        return;
      }

      // Check if player is already in a room
      const existingRoom = roomManager.getPlayerRoom(socket.id);
      if (existingRoom) {
        console.log(`Player ${socket.id} already in room ${existingRoom.code}`);
        socket.emit("room-created", {
          roomCode: existingRoom.code,
          isHost: existingRoom.players.get(socket.id)?.isHost || false,
          players: Array.from(existingRoom.players.values()),
          spectators: Array.from(existingRoom.spectators.values()),
        });
        return;
      }

      const room = await roomManager.createRoom(
        socket.id,
        sanitizeName(playerName)
      );
      console.log(`Room created: ${room.code} by ${playerName}`);

      socket.emit("room-created", {
        roomCode: room.code,
        isHost: true,
        players: Array.from(room.players.values()),
        spectators: Array.from(room.spectators.values()),
      });

      socket.join(room.code);
    } catch (error) {
      console.error("Error creating room:", error);
      socket.emit("error", { message: "Failed to create room" });
    }
  });

  // Join an existing room
  socket.on("join-room", async (data = {}) => {
    try {
      const { roomCode, playerName } = data;
      console.log(`Attempting to join room: ${roomCode} by ${playerName}`);

      if (!isValidRoomCode(roomCode) || !isValidPlayerName(playerName)) {
        socket.emit("error", {
          message: "Room code and player name are required",
        });
        return;
      }

      // Check if player is already in a room (but allow reconnections)
      const existingRoom = roomManager.getPlayerRoom(socket.id);
      if (existingRoom && existingRoom.code === normalizeRoomCode(roomCode)) {
        console.log(
          `Player ${socket.id} already in room ${existingRoom.code}, ignoring join request`
        );
        return;
      }

      // First try to handle reconnection
      const reconnectionResult = await roomManager.handlePlayerReconnection(
        socket.id,
        sanitizeName(playerName)
      );

      let result;
      if (reconnectionResult) {
        result = reconnectionResult;
      } else {
        result = await roomManager.joinRoom(
          normalizeRoomCode(roomCode),
          socket.id,
          sanitizeName(playerName)
        );
      }

      console.log(`Join room result:`, result);

      if (!result.success) {
        console.log(`Failed to join room: ${result.error}`);
        socket.emit("error", { message: result.error });
        return;
      }

      const { room, isSpectator, isReconnection } = result;
      console.log(
        `${playerName} ${
          isReconnection ? "reconnected to" : "joined"
        } room ${roomCode} as ${isSpectator ? "spectator" : "player"}`
      );

      const normalizedCode = normalizeRoomCode(roomCode);
      socket.join(normalizedCode);

      // Load existing game if it exists
      if (room.gameState) {
        persistence.loadGame(normalizedCode).then(async (savedGameState) => {
          if (savedGameState) {
            room.gameState = savedGameState;
            await roomManager.updateGameState(normalizedCode, savedGameState);
          }
        });
      }

      socket.emit("room-joined", {
        roomCode: normalizedCode,
        isHost: room.players.get(socket.id)?.isHost || false,
        isSpectator,
        players: Array.from(room.players.values()).map(sanitizeParticipant),
        spectators: Array.from(room.spectators.values()).map(
          sanitizeParticipant
        ),
        gameState: room.gameState,
      });

      // Notify other players in the room
      socket.to(normalizedCode).emit("player-joined", {
        player: sanitizeParticipant(
          room.players.get(socket.id) || room.spectators.get(socket.id)
        ),
        isSpectator,
        players: Array.from(room.players.values()).map(sanitizeParticipant),
        spectators: Array.from(room.spectators.values()).map(
          sanitizeParticipant
        ),
      });
    } catch (error) {
      console.error("Error joining room:", error);
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  // Start a new game
  socket.on("start-game", async (data) => {
    try {
      const { roomCode } = data;
      const normalizedCode = normalizeRoomCode(roomCode);
      const room = roomManager.getRoom(normalizedCode);

      if (!room) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      const player = room.players.get(socket.id);
      if (!player || !player.isHost) {
        socket.emit("error", { message: "Only the host can start the game" });
        return;
      }

      if (room.players.size < 2) {
        socket.emit("error", {
          message: "At least 2 players are required to start the game",
        });
        return;
      }

      const gameState = initializeGame(room.players.size);
      room.gameState = gameState;
      await roomManager.updateGameState(normalizedCode, gameState);

      // Save game state
      persistence.saveGame(normalizedCode, gameState);

      console.log(
        `Game started in room ${normalizedCode} with ${room.players.size} players`
      );

      io.to(normalizedCode).emit("game-started", {
        gameState,
        status: getGameStatus(gameState),
      });
    } catch (error) {
      console.error("Error starting game:", error);
      socket.emit("error", { message: "Failed to start game" });
    }
  });

  // Play a card
  socket.on("play-card", async (data) => {
    try {
      const { roomCode, card, pileIndex } = data;
      const normalizedCode = normalizeRoomCode(roomCode);
      const room = roomManager.getRoom(normalizedCode);

      if (!room || !room.gameState) {
        socket.emit("error", { message: "Game not found or not started" });
        return;
      }

      const player = room.players.get(socket.id);
      if (!player) {
        socket.emit("error", { message: "You are not a player in this game" });
        return;
      }

      if (room.gameState.currentPlayer !== player.playerIndex) {
        socket.emit("error", { message: "It is not your turn" });
        return;
      }

      const result = playCard(room.gameState, card, pileIndex);

      if (!result.success) {
        socket.emit("error", { message: result.error });
        return;
      }

      room.gameState = result.gameState;
      await roomManager.updateGameState(normalizedCode, result.gameState);

      // Save game state
      persistence.saveGame(normalizedCode, result.gameState);

      console.log(
        `Player ${player.name} played card ${card} on pile ${
          pileIndex + 1
        } in room ${roomCode}`
      );

      io.to(normalizedCode).emit("card-played", {
        gameState: result.gameState,
        status: getGameStatus(result.gameState),
        playerName: sanitizeName(player.name),
        card,
        pileIndex,
      });
    } catch (error) {
      console.error("Error playing card:", error);
      socket.emit("error", { message: "Failed to play card" });
    }
  });

  // End turn
  socket.on("end-turn", async (data) => {
    try {
      const { roomCode } = data;
      const normalizedCode = normalizeRoomCode(roomCode);
      const room = roomManager.getRoom(normalizedCode);

      if (!room || !room.gameState) {
        socket.emit("error", { message: "Game not found or not started" });
        return;
      }

      const player = room.players.get(socket.id);
      if (!player) {
        socket.emit("error", { message: "You are not a player in this game" });
        return;
      }

      if (room.gameState.currentPlayer !== player.playerIndex) {
        socket.emit("error", { message: "It is not your turn" });
        return;
      }

      const result = endTurn(room.gameState);

      if (!result.success) {
        socket.emit("error", { message: result.error });
        return;
      }

      room.gameState = result.gameState;
      await roomManager.updateGameState(normalizedCode, result.gameState);

      // Save game state
      persistence.saveGame(normalizedCode, result.gameState);

      console.log(`Player ${player.name} ended their turn in room ${roomCode}`);

      io.to(normalizedCode).emit("turn-ended", {
        gameState: result.gameState,
        status: getGameStatus(result.gameState),
        playerName: sanitizeName(player.name),
      });
    } catch (error) {
      console.error("Error ending turn:", error);
      socket.emit("error", { message: "Failed to end turn" });
    }
  });

  // Handle "can't play" scenario
  socket.on("cant-play", async (data) => {
    try {
      const { roomCode } = data;
      const normalizedCode = normalizeRoomCode(roomCode);
      const room = roomManager.getRoom(normalizedCode);

      if (!room || !room.gameState) {
        socket.emit("error", { message: "Game not found or not started" });
        return;
      }

      const player = room.players.get(socket.id);
      if (!player) {
        socket.emit("error", { message: "You are not a player in this game" });
        return;
      }

      if (room.gameState.currentPlayer !== player.playerIndex) {
        socket.emit("error", { message: "It is not your turn" });
        return;
      }

      const result = handleCantPlay(room.gameState);
      room.gameState = result.gameState;
      await roomManager.updateGameState(normalizedCode, result.gameState);

      // Save game state
      persistence.saveGame(normalizedCode, result.gameState);

      console.log(`Player ${player.name} cannot play in room ${roomCode}`);

      io.to(normalizedCode).emit("cant-play", {
        gameState: result.gameState,
        status: getGameStatus(result.gameState),
        playerName: sanitizeName(player.name),
      });
    } catch (error) {
      console.error("Error handling cant play:", error);
      socket.emit("error", { message: "Failed to handle cant play" });
    }
  });

  socket.on("sort-hand", async (data) => {
    try {
      const { roomCode } = data;
      const normalizedCode = normalizeRoomCode(roomCode);
      const room = roomManager.getRoom(normalizedCode);

      if (!room || !room.gameState) {
        socket.emit("error", { message: "Game not found or not started" });
        return;
      }

      const player = room.players.get(socket.id);
      if (!player) {
        socket.emit("error", { message: "You are not a player in this game" });
        return;
      }

      if (room.gameState.currentPlayer !== player.playerIndex) {
        socket.emit("error", { message: "It is not your turn" });
        return;
      }

      const result = sortCurrentPlayerHand(room.gameState);

      if (!result.success) {
        socket.emit("error", {
          message: result.error || "Failed to sort hand",
        });
        return;
      }

      room.gameState = result.gameState;
      await roomManager.updateGameState(normalizedCode, result.gameState);

      persistence.saveGame(normalizedCode, result.gameState);

      io.to(normalizedCode).emit("hand-sorted", {
        gameState: result.gameState,
        status: getGameStatus(result.gameState),
        playerName: sanitizeName(player.name),
      });
    } catch (error) {
      console.error("Error sorting hand:", error);
      socket.emit("error", { message: "Failed to sort hand" });
    }
  });

  // Handle disconnection
  socket.on("disconnect", async (reason) => {
    console.log(`Player ${socket.id} disconnected: ${reason}`);

    // Mark as disconnected but don't remove immediately for network issues
    await roomManager.markPlayerDisconnected(socket.id);

    // Only remove after delay for network issues (not intentional disconnects)
    if (
      reason !== "io server disconnect" &&
      reason !== "io client disconnect"
    ) {
      setTimeout(async () => {
        const result = await roomManager.leaveRoom(socket.id);
        console.log(`Leave room result:`, result);

        if (result) {
          const { roomDeleted, wasPlayer, wasSpectator, room } = result;

          if (roomDeleted) {
            console.log(`Room ${room?.code} deleted due to no players`);
            // Clean up saved game
            if (room?.code) {
              persistence.deleteGame(room.code);
            }
          } else if (room && room.code) {
            // Notify remaining players
            console.log(
              `Notifying players in room ${room.code} about player leaving`
            );
            socket.to(room.code).emit("player-left", {
              wasPlayer,
              wasSpectator,
              players: Array.from(room.players.values()).map(
                sanitizeParticipant
              ),
              spectators: Array.from(room.spectators.values()).map(
                sanitizeParticipant
              ),
            });
          } else {
            console.log(`No room found for disconnected player ${socket.id}`);
          }
        }
      }, 10000); // 10 second delay for reconnection
    } else {
      // Immediate removal for intentional disconnects
      const result = await roomManager.leaveRoom(socket.id);
      console.log(`Leave room result:`, result);

      if (result) {
        const { roomDeleted, wasPlayer, wasSpectator, room } = result;

        if (roomDeleted) {
          console.log(`Room ${room?.code} deleted due to no players`);
          // Clean up saved game
          if (room?.code) {
            persistence.deleteGame(room.code);
          }
        } else if (room && room.code) {
          // Notify remaining players
          console.log(
            `Notifying players in room ${room.code} about player leaving`
          );
          socket.to(room.code).emit("player-left", {
            wasPlayer,
            wasSpectator,
            players: Array.from(room.players.values()).map(sanitizeParticipant),
            spectators: Array.from(room.spectators.values()).map(
              sanitizeParticipant
            ),
          });
        } else {
          console.log(`No room found for disconnected player ${socket.id}`);
        }
      }
    }
  });

  socket.on("validate-name", (data = {}, callback) => {
    try {
      const { roomCode, playerName } = data;
      if (!isValidRoomCode(roomCode) || !isValidPlayerName(playerName)) {
        callback({ ok: false, error: "Room code and player name required" });
        return;
      }

      const room = roomManager.getRoom(normalizeRoomCode(roomCode));
      if (!room) {
        callback({ ok: false, error: "Room not found" });
        return;
      }

      const nameLower = playerName.trim().toLowerCase();
      const players = Array.from(room.players.values());
      const spectators = Array.from(room.spectators.values());
      const isTaken = [...players, ...spectators].some(
        (participant) => participant.name.trim().toLowerCase() === nameLower
      );

      callback({ ok: true, isTaken });
    } catch (error) {
      console.error("Error validating name:", error);
      callback({ ok: false, error: "Failed to validate name" });
    }
  });
});

// API endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: Date.now() });
});

app.get("/api/connection-status", (req, res) => {
  const roomCode = req.query.room;
  if (roomCode) {
    const status = roomManager.getRoomConnectionStatus(roomCode);
    res.json({ roomCode, status });
  } else {
    res.json({
      totalRooms: roomManager.rooms.size,
      totalConnections: io.engine.clientsCount,
      timestamp: Date.now(),
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../build/index.html"));
  });
}

// Helper utilities
function isValidPlayerName(name) {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= 32 &&
    validator.isWhitelisted(
      trimmed,
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '-_"
    )
  );
}

function isValidRoomCode(code) {
  if (typeof code !== "string") return false;
  const trimmed = code.trim();
  return trimmed.length === 6 && validator.isAlphanumeric(trimmed);
}

function sanitizeName(name) {
  return validator.escape((name || "").trim()).slice(0, 32);
}

function normalizeRoomCode(code) {
  return code.trim().toUpperCase();
}

function sanitizeParticipant(participant) {
  if (!participant) return participant;
  return {
    ...participant,
    name: sanitizeName(participant.name || ""),
  };
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Lockpick server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
