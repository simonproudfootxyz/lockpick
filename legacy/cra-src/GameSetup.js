import React from "react";
import { useNavigate } from "react-router-dom";
import "./GameSetup.css";
import RulesContent from "./RulesContent";
import Button from "./components/Button";
import LockpickLogo from "./assets/LockpickLogo.svg";

const GameSetup = () => {
  const navigate = useNavigate();

  const generateGameId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const handleStartGame = () => {
    const gameId = generateGameId();
    navigate(`/game/${gameId}`);
  };

  return (
    <div className="game-setup">
      <div className="setup-container">
        <h1>
          <img src={LockpickLogo} alt="Lockpick" />
        </h1>

        <div className="setup-options">
          <Button onClick={handleStartGame}>Start Game</Button>
        </div>
        <div className="rules-summary">
          <RulesContent className="setup-rules-content" />
        </div>
      </div>
    </div>
  );
};

export default GameSetup;
