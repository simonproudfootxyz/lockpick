import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./JoinGame.css";

const JoinGame = () => {
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleJoinGame = () => {
    if (!inviteCode.trim()) {
      setError("Please enter an invite code");
      return;
    }

    // Validate invite code format (should be a game ID)
    if (inviteCode.length < 6) {
      setError("Invalid invite code format");
      return;
    }

    // Navigate to the game with the invite code
    navigate(`/game/${inviteCode}?players=1`);
  };

  const handleInputChange = (e) => {
    setInviteCode(e.target.value);
    setError(""); // Clear error when user types
  };

  return (
    <div className="join-game">
      <div className="join-container">
        <h1>Join Game</h1>
        <div className="join-description">
          <p>
            Enter the invite code provided by the game host to join their game.
          </p>
        </div>

        <div className="join-form">
          <div className="input-group">
            <label htmlFor="inviteCode">Invite Code:</label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={handleInputChange}
              placeholder="Enter invite code"
              className={error ? "error" : ""}
            />
            {error && <div className="error-message">{error}</div>}
          </div>

          <button onClick={handleJoinGame} className="join-btn">
            Join Game
          </button>
        </div>

        <div className="join-footer">
          <button onClick={() => navigate("/")} className="back-to-home-btn">
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinGame;
