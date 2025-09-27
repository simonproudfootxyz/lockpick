const fs = require("fs").promises;
const path = require("path");

class GamePersistence {
  constructor() {
    this.gamesDir = path.join(__dirname, "saved-games");
    this.ensureGamesDirectory();
  }

  async ensureGamesDirectory() {
    try {
      await fs.mkdir(this.gamesDir, { recursive: true });
    } catch (error) {
      console.error("Error creating games directory:", error);
    }
  }

  getGameFilePath(roomCode) {
    return path.join(this.gamesDir, `game-${roomCode}.json`);
  }

  async saveGame(roomCode, gameState) {
    try {
      const gameData = {
        roomCode,
        gameState,
        savedAt: Date.now(),
        version: "1.0.0",
      };

      const filePath = this.getGameFilePath(roomCode);
      await fs.writeFile(filePath, JSON.stringify(gameData, null, 2));
      console.log(`Game saved for room ${roomCode}`);
    } catch (error) {
      console.error(`Error saving game for room ${roomCode}:`, error);
    }
  }

  async loadGame(roomCode) {
    try {
      const filePath = this.getGameFilePath(roomCode);
      const data = await fs.readFile(filePath, "utf8");
      const gameData = JSON.parse(data);

      console.log(`Game loaded for room ${roomCode}`);
      return gameData.gameState;
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log(`No saved game found for room ${roomCode}`);
        return null;
      }
      console.error(`Error loading game for room ${roomCode}:`, error);
      return null;
    }
  }

  async deleteGame(roomCode) {
    try {
      const filePath = this.getGameFilePath(roomCode);
      await fs.unlink(filePath);
      console.log(`Game deleted for room ${roomCode}`);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error(`Error deleting game for room ${roomCode}:`, error);
      }
    }
  }

  async cleanupOldGames(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.gamesDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      for (const file of files) {
        if (file.startsWith("game-") && file.endsWith(".json")) {
          const filePath = path.join(this.gamesDir, file);
          const stats = await fs.stat(filePath);

          if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            console.log(`Cleaned up old game file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error("Error cleaning up old games:", error);
    }
  }
}

module.exports = GamePersistence;
