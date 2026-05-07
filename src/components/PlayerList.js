import React, { useState } from "react";
import "./PlayerList.css";
import Button, { InvertButton, TextButton } from "./Button";
import { useParams } from "react-router-dom";
import PlayerMarker from "../assets/PlayerMarker.svg";
import CopyIcon from "../assets/CopyIcon.svg";
import Seth from "../assets/avatars/Seth.svg";
import TheSmoke from "../assets/avatars/TheSmoke.svg";
import Kimbap from "../assets/avatars/Kimbap.svg";
import Precious from "../assets/avatars/Precious.svg";
import useWindowSize from "../hooks/useWindowSize";

const PlayerList = ({
  players,
  spectators,
  currentPlayerIndex,
  localPlayerIndex,
  isHost,
  onStartGame,
  gameStarted,
  className,
}) => {
  const [copySuccess, setCopySuccess] = useState("");
  const { gameId } = useParams();
  const buildInviteLink = () => {
    const origin = window.location.origin;
    return `${origin}/join/${gameId}`;
  };
  const windowSize = useWindowSize();
  const isTabletDown = windowSize?.width < 768;
  const avatarSize = isTabletDown ? 30 : 40;

  const AVATAR_BY_NAME = {
    Seth,
    TheSmoke,
    Kimbap,
    Precious,
  };
  const FALLBACK_AVATAR = Seth;

  const getAvatar = (player) =>
    AVATAR_BY_NAME[player?.avatar] || FALLBACK_AVATAR;

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
    <div className={`player-list ${className}`}>
      <div className="player-list__actions">
        <p className="player-list__game-id">
          <strong>Room ID: </strong>
          <TextButton
            className="player-list__game-id-button"
            onClick={handleCopyInviteLink}
            mini
          >
            {gameId}
            <img width={12} height={12} src={CopyIcon} alt="Copy" />
          </TextButton>
        </p>
        {copySuccess && (
          <p className="player-list__copy-feedback">{copySuccess}</p>
        )}
        <p className="player-list__header visible--tablet-down">
          <strong>Players</strong>{" "}
          <span className="player-list-header__count">({players.length})</span>
        </p>
      </div>
      <p className="player-list__header hidden--tablet-down">
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
                  width={avatarSize}
                  height={avatarSize}
                  className="player-list__item-avatar"
                />
                <span className="player-list__item-name hidden--tablet-down">
                  {player.name}
                </span>
                {shouldShowCurrentTurnIndicator && (
                  <span className="player-list__item-current">Your turn!</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {spectators.length > 0 && (
        <div className="spectators-section hidden--tablet-down">
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
