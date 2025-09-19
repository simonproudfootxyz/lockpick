const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// Enable CORS for all origins
app.use(cors());

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Store game states in memory (in production, use Redis or a database)
const gameStates = new Map();
const gamePlayers = new Map(); // Track players in each game

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinGame", ({ gameId }) => {
    console.log(`User ${socket.id} joining game ${gameId}`);

    // Join the socket to the game room
    socket.join(gameId);

    // Track player in game
    if (!gamePlayers.has(gameId)) {
      gamePlayers.set(gameId, new Set());
    }
    gamePlayers.get(gameId).add(socket.id);

    // Send current game state to the new player
    if (gameStates.has(gameId)) {
      socket.emit("gameStateUpdate", gameStates.get(gameId));
    }

    // Notify other players that someone joined
    socket.to(gameId).emit("playerJoined", {
      playerId: socket.id,
      gameId: gameId,
    });

    console.log(
      `Game ${gameId} now has ${gamePlayers.get(gameId).size} players`
    );
  });

  socket.on("leaveGame", ({ gameId }) => {
    console.log(`User ${socket.id} leaving game ${gameId}`);

    socket.leave(gameId);

    // Remove player from game tracking
    if (gamePlayers.has(gameId)) {
      gamePlayers.get(gameId).delete(socket.id);

      // If no players left, clean up game state
      if (gamePlayers.get(gameId).size === 0) {
        gameStates.delete(gameId);
        gamePlayers.delete(gameId);
        console.log(`Game ${gameId} cleaned up - no players remaining`);
      } else {
        // Notify remaining players that someone left
        socket.to(gameId).emit("playerLeft", {
          playerId: socket.id,
          gameId: gameId,
        });
      }
    }
  });

  socket.on("updateGameState", ({ gameId, gameState }) => {
    console.log(`Game state updated for game ${gameId}`);

    // Store the updated game state
    gameStates.set(gameId, gameState);

    // Broadcast the update to all players in the game (except sender)
    socket.to(gameId).emit("gameStateUpdate", gameState);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Find and remove player from all games
    for (const [gameId, players] of gamePlayers.entries()) {
      if (players.has(socket.id)) {
        players.delete(socket.id);

        // If no players left, clean up
        if (players.size === 0) {
          gameStates.delete(gameId);
          gamePlayers.delete(gameId);
          console.log(`Game ${gameId} cleaned up - no players remaining`);
        } else {
          // Notify remaining players
          socket.to(gameId).emit("playerLeft", {
            playerId: socket.id,
            gameId: gameId,
          });
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});
