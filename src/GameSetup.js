import React from "react";
import { useNavigate } from "react-router-dom";
import "./GameSetup.css";

const GameSetup = () => {
  const navigate = useNavigate();

  const generateGameId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const handleStartGame = () => {
    const gameId = generateGameId();
    navigate(`/game/${gameId}?players=1`);
  };

  return (
    <div className="game-setup">
      <div className="setup-container">
        <h1>Lockpick Card Game</h1>
        <div className="game-description">
          <p>
            Try to discard all 98 cards in the deck onto four discard piles to
            win!
          </p>
          <ul>
            <li>
              Two piles go in ascending order (1 ↑) - each card must be higher
              than the previous
            </li>
            <li>
              Two piles go in descending order (100 ↓) - each card must be lower
              than the previous
            </li>
            <li>Select and play cards from your hand</li>
            <li>
              Special reverse rule: Play a card exactly 10 less on ascending
              piles (e.g., 27 on 37)
            </li>
            <li>
              Special reverse rule: Play a card exactly 10 more on descending
              piles (e.g., 98 on 88)
            </li>
            <li>Play all 98 cards to win!</li>
          </ul>
        </div>

        <div className="setup-options">
          <button className="start-game-btn" onClick={handleStartGame}>
            Start Game
          </button>
          <button className="join-game-btn" onClick={() => navigate("/join")}>
            Join Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;
