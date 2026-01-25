import React from "react";
import { useNavigate } from "react-router-dom";
import "./GameSetup.css";
import RulesContent from "./RulesContent";
import Button from "./components/Button";
import LockpickLogo from "./assets/LockpickLogo.svg";

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
        <h1>
          <img src={LockpickLogo} alt="Multiplayer" />
        </h1>

        <div className="setup-options">
          <Button onClick={handleStartGame}>Start Single Player Game</Button>

          <div className="multiplayer-section">
            <h3>Multiplayer</h3>
            <Button onClick={() => navigate("/lobby")}>
              Join Multiplayer Lobby
            </Button>
            <p>Play with friends online!</p>
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
