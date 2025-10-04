import React from "react";
import "./PlayerList.css";

const PlayerList = ({
  players,
  spectators,
  currentPlayerIndex,
  localPlayerIndex,
  isHost,
  onStartGame,
  gameStarted,
}) => {
  return (
    <div className="player-list">
      <div className="player-list-header">
        <h3>
          Players ({players.length}/{10})
        </h3>
        {isHost && !gameStarted && (
          <button
            className="start-game-btn"
            onClick={onStartGame}
            disabled={players.length < 2}
            title="Need at least 2 players"
          >
            {players.length < 2 ? "Need 2 more players" : "Start Game"}
          </button>
        )}
      </div>
      <div className="players-container">
        {players.map((player) => {
          const isCurrentTurn = currentPlayerIndex === player.playerIndex;
          const isYou = localPlayerIndex === player.playerIndex;
          return (
            <div
              key={player.socketId || player.name}
              className={`player-list-item ${isCurrentTurn ? "current" : ""}`}
            >
              <div className="player-info">
                <span className="player-name">
                  {player.name}
                  {player.isHost && <span className="host-badge">Host</span>}
                  {isYou && <span className="you-badge">You</span>}
                  {isCurrentTurn && <span className="current-badge">Turn</span>}
                </span>
                <span className="player-role">
                  {player.isHost ? "Host" : "Player"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {spectators.length > 0 && (
        <div className="spectators-section">
          <h4>Spectators ({spectators.length})</h4>
          <ul>
            {spectators.map((spectator) => (
              <li key={spectator.socketId || spectator.name}>
                {spectator.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PlayerList;
