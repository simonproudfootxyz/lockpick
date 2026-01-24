import React, { useState } from "react";
import "./PlayerList.css";
import Button from "./Button";
import { useParams } from "react-router-dom";

const PlayerList = ({
  players,
  spectators,
  currentPlayerIndex,
  localPlayerIndex,
  isHost,
  onStartGame,
  gameStarted,
}) => {
  const [copySuccess, setCopySuccess] = useState("");
  const { gameId } = useParams();
  const buildInviteLink = () => {
    const origin = window.location.origin;
    return `${origin}/join/${gameId}`;
  };

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(buildInviteLink());
      setCopySuccess("Invite link copied!");
      setTimeout(() => setCopySuccess(""), 3000);
    } catch (err) {
      console.error("Failed to copy invite link", err);
      setCopySuccess("Copy failed. Please copy manually: " + buildInviteLink());
    }
  };
  return (
    <div className="player-list">
      <div className="player-list-header">
        <h3>Players ({players.length})</h3>
        {isHost && !gameStarted && (
          <button
            className="start-game-btn"
            onClick={onStartGame}
            disabled={players.length < 2}
            title="Need at least 2 players"
          >
            {players.length < 2 ? "Need more players" : "Start Game"}
          </button>
        )}
      </div>
      <div className="players-container">
        {players.map((player) => {
          const isCurrentTurn = currentPlayerIndex === player.playerIndex;
          return (
            <div
              key={player.socketId || player.name}
              className={`player-list-item ${isCurrentTurn ? "current" : ""}`}
            >
              <div className="player-info">
                <span className="player-name">{player.name}</span>
              </div>
            </div>
          );
        })}
      </div>
      <Button onClick={handleCopyInviteLink} mini fullWidth>
        Copy Invite Link
      </Button>
      {copySuccess && <p className="copy-feedback-floating">{copySuccess}</p>}
      {spectators.length > 0 && (
        <div className="spectators-section">
          <h3>Spectators</h3>
          <ul className="spectators-list">
            {spectators.map((spectator) => (
              <li
                className="spectators-list-item"
                key={spectator.socketId || spectator.name}
              >
                <span className="spectator-name">{spectator.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PlayerList;
