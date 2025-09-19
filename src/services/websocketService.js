import { io } from "socket.io-client";

class WebSocketService {
  constructor() {
    this.socket = null;
    this.gameId = null;
    this.listeners = new Map();
  }

  connect(gameId) {
    if (this.socket && this.gameId === gameId && this.socket.connected) {
      return; // Already connected to this game
    }

    // Disconnect from previous game if any
    if (this.socket) {
      this.socket.disconnect();
    }

    this.gameId = gameId;

    // Connect to WebSocket server
    // In development, this will connect to localhost:3001
    // In production, this should connect to your deployed WebSocket server
    const serverUrl =
      process.env.NODE_ENV === "production"
        ? "https://your-websocket-server.com"
        : "http://localhost:3001";

    this.socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      timeout: 5000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Connected to WebSocket server");
      this.emit("connected");
      this.joinGame(this.gameId);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected from WebSocket server:", reason);
      this.emit("disconnected", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      this.emit("connectionError", error);
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log(
        "Reconnected to WebSocket server after",
        attemptNumber,
        "attempts"
      );
      this.emit("reconnected", attemptNumber);
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("WebSocket reconnection error:", error);
      this.emit("reconnectionError", error);
    });

    this.socket.on("gameStateUpdate", (gameState) => {
      this.emit("gameStateUpdate", gameState);
    });

    this.socket.on("playerJoined", (playerInfo) => {
      this.emit("playerJoined", playerInfo);
    });

    this.socket.on("playerLeft", (playerInfo) => {
      this.emit("playerLeft", playerInfo);
    });

    this.socket.on("error", (error) => {
      console.error("WebSocket error:", error);
      this.emit("error", error);
    });
  }

  joinGame(gameId) {
    if (this.socket) {
      this.socket.emit("joinGame", { gameId });
    }
  }

  leaveGame() {
    if (this.socket && this.gameId) {
      this.socket.emit("leaveGame", { gameId: this.gameId });
    }
  }

  updateGameState(gameState) {
    if (this.socket && this.gameId) {
      this.socket.emit("updateGameState", {
        gameId: this.gameId,
        gameState,
      });
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.leaveGame();
      this.socket.disconnect();
      this.socket = null;
      this.gameId = null;
    }
    this.listeners.clear();
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }
}

// Create a singleton instance
const websocketService = new WebSocketService();

export default websocketService;
