import React from "react";
import "./PlayerList.css";

const PlayerList = ({
  players = [],
  spectators = [],
  currentPlayerIndex,
  isHost,
  onStartGame,
  gameStarted,
}) => {
  const canStartGame = isHost && !gameStarted && players.length >= 2;

  return (
    <div className="player-list">
      <div className="player-list-header">
        <h3>Players ({players.length}/5)</h3>
        {isHost && !gameStarted && (
          <button
            onClick={onStartGame}
            disabled={!canStartGame}
            className="start-game-btn"
          >
            {players.length < 2
              ? `Need ${2 - players.length} more player${
                  2 - players.length === 1 ? "" : "s"
                }`
              : "Start Game"}
          </button>
        )}
      </div>

      <div className="players-container">
        {players.map((player, index) => (
          <div
            key={player.socketId}
            className={`player-item ${
              index === currentPlayerIndex ? "current-player" : ""
            } ${!player.isConnected ? "disconnected" : ""}`}
          >
            <div className="player-info">
              <div className="player-name">
                {player.name}
                {player.isHost && <span className="host-badge">Host</span>}
                {index === currentPlayerIndex && (
                  <span className="current-badge">Current</span>
                )}
              </div>
              <div className="player-status">
                {player.isConnected ? (
                  <span className="status-connected">● Connected</span>
                ) : (
                  <span className="status-disconnected">● Disconnected</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {spectators.length > 0 && (
        <div className="spectators-section">
          <h4>Spectators ({spectators.length})</h4>
          <div className="spectators-container">
            {spectators.map((spectator) => (
              <div
                key={spectator.socketId}
                className={`spectator-item ${
                  !spectator.isConnected ? "disconnected" : ""
                }`}
              >
                <div className="spectator-info">
                  <div className="spectator-name">
                    {spectator.name}
                    <span className="spectator-badge">Spectator</span>
                  </div>
                  <div className="spectator-status">
                    {spectator.isConnected ? (
                      <span className="status-connected">●</span>
                    ) : (
                      <span className="status-disconnected">●</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {players.length === 0 && (
        <div className="no-players">
          <p>No players in room yet</p>
        </div>
      )}
    </div>
  );
};

export default PlayerList;
