import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./GameSetup.css";

const GameSetup = () => {
  const [numPlayers, setNumPlayers] = useState(1);
  const navigate = useNavigate();

  const generateGameId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const handleStartGame = () => {
    const gameId = generateGameId();
    navigate(`/game/${gameId}?players=${numPlayers}`);
  };

  return (
    <div className="game-setup">
      <div className="setup-container">
        <h1>Lockpick Card Game</h1>
        <div className="game-description">
          <p>
            Try to discard the entire deck onto four discard piles to win! Deck
            size scales with player count (base cards 2-99, plus 10 for every
            player above 5).
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
              piles (e.g., play 27 on 37)
            </li>
            <li>
              Special reverse rule: Play a card exactly 10 more on descending
              piles (e.g., play 108 on 98 when max card is 109)
            </li>
            <li>
              Play every card in the deck to win! (Deck grows with more players)
            </li>
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
              <option value={6}>6 Players (5 cards each)</option>
              <option value={7}>7 Players (5 cards each)</option>
              <option value={8}>8 Players (5 cards each)</option>
              <option value={9}>9 Players (4 cards each)</option>
              <option value={10}>10 Players (4 cards each)</option>
            </select>
          </div>

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
      </div>
    </div>
  );
};

export default GameSetup;
