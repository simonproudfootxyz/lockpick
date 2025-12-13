import React from "react";
import { useNavigate } from "react-router-dom";
import "./GameSetup.css";
import RulesContent from "./RulesContent";

const DEFAULT_PLAYER_COUNT = 1;

const GameSetup = () => {
  const navigate = useNavigate();

  const generateGameId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const handleStartGame = () => {
    const gameId = generateGameId();
    navigate(`/game/${gameId}?players=${DEFAULT_PLAYER_COUNT}`);
  };

  return (
    <div className="game-setup">
      <div className="setup-container">
        <h1>Lockpick Card Game</h1>

        <div className="setup-options">
          <button className="start-game-btn" onClick={handleStartGame}>
            Start Single Player Game
          </button>

          <div className="multiplayer-section">
            <h3>Multiplayer</h3>
            <p>Play with friends online!</p>
            <button
              className="multiplayer-btn"
              onClick={() => navigate("/lobby")}
            >
              Join Multiplayer Lobby
            </button>
          </div>
        </div>
        <div className="rules-summary">
          <RulesContent className="setup-rules-content" />
        </div>
      </div>
    </div>
  );
};

export default GameSetup;
