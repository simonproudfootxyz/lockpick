import React from "react";
import "./GameOverModal.css";

const GameOverModal = ({ isOpen, onClose, onNewGame, currentPlayer }) => {
  if (!isOpen) return null;

  return (
    <div className="game-over-modal-overlay">
      <div className="game-over-modal">
        <h2>Game Over!</h2>
        <p>
          Player {currentPlayer + 1} couldn't play a card and the game has
          ended.
        </p>
        <div className="game-over-actions">
          <button onClick={onNewGame} className="new-game-btn">
            Start New Game
          </button>
          <button onClick={onClose} className="close-modal-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
