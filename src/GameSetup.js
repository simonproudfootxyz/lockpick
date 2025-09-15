import React from "react";
import "./GameSetup.css";

const GameSetup = ({ numPlayers, setNumPlayers, onStartGame }) => {
  const handleStartGame = () => {
    onStartGame(numPlayers);
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
          <div className="player-selection">
            <label htmlFor="numPlayers">Number of Players:</label>
            <select
              id="numPlayers"
              value={numPlayers}
              onChange={(e) => setNumPlayers(parseInt(e.target.value))}
            >
              <option value={1}>1 Player (8 cards)</option>
              <option value={2}>2 Players (7 cards each)</option>
              <option value={3}>3 Players (6 cards each)</option>
              <option value={4}>4 Players (6 cards each)</option>
              <option value={5}>5 Players (6 cards each)</option>
            </select>
          </div>

          <button className="start-game-btn" onClick={handleStartGame}>
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;
