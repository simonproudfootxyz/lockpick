import React, { useState } from "react";
import "./PlayerList.css";
import Button, { InvertButton } from "./Button";
import { useParams } from "react-router-dom";
import PlayerMarker from "../assets/PlayerMarker.svg";
import Seth from "../assets/avatars/Seth.svg";
import TheSmoke from "../assets/avatars/TheSmoke.svg";
import Kimbap from "../assets/avatars/Kimbap.svg";
import Precious from "../assets/avatars/Precious.svg";

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

  const avatars = [Seth, TheSmoke, Kimbap, Precious];

  // Deterministically pick an avatar from a stable player identifier so the
  // same player always gets the same avatar across re-renders.
  const AVATAR_STORAGE_KEY = "lockpick:playerAvatars";

  const readAvatarStore = () => {
    try {
      const raw = window.localStorage.getItem(AVATAR_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const writeAvatarStore = (store) => {
    try {
      window.localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(store));
    } catch {
      // ignore quota / privacy-mode errors
    }
  };

  const getAvatar = (player) => {
    // Use the player's name (stable across socket reconnects) as the key.
    const key = String(player?.name ?? "");
    if (!key) return avatars[0];

    const store = readAvatarStore();
    if (typeof store[key] === "number" && avatars[store[key]]) {
      return avatars[store[key]];
    }

    // First time we've seen this player in this browser: pick a deterministic
    // index from the name hash so it stays stable even if storage is cleared.
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    const index = hash % avatars.length;
    store[key] = index;
    writeAvatarStore(store);
    return avatars[index];
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
      <div className="player-list__actions">
        <InvertButton onClick={handleCopyInviteLink} mini>
          Copy invite link
        </InvertButton>
      </div>
      {copySuccess && <p className="copy-feedback-floating">{copySuccess}</p>}
      <p className="player-list__header">
        <strong>Players</strong>{" "}
        <span className="player-list-header__count">({players.length})</span>
      </p>
      <ul className="player-list__players-container">
        {players.map((player) => {
          const isPlayerCurrentTurn = currentPlayerIndex === player.playerIndex;
          const isPlayerCurrentPlayer = localPlayerIndex === player.playerIndex;
          const shouldShowCurrentTurnIndicator =
            gameStarted && isPlayerCurrentTurn && isPlayerCurrentPlayer;
          return (
            <li
              key={player.socketId || player.name}
              className={`player-list__item ${isPlayerCurrentTurn ? "current" : ""}`}
            >
              <div className="player-list__item-info">
                {isPlayerCurrentTurn && (
                  <img
                    src={PlayerMarker}
                    alt={player.name}
                    className="player-list__item-marker"
                  />
                )}
                <img
                  src={getAvatar(player)}
                  alt={player.name}
                  width={40}
                  height={40}
                  className="player-list__item-avatar"
                />
                <span className="player-list__item-name">{player.name}</span>
                {shouldShowCurrentTurnIndicator && (
                  <span className="player-list__item-current">Your turn!</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {spectators.length > 0 && (
        <div className="spectators-section">
          <p>
            <strong>Spectators</strong>{" "}
            <span className="spectators-section__count">
              ({spectators.length})
            </span>
          </p>
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
