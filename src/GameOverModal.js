import React from "react";
import "./GameOverModal.css";

const GameOverModal = ({
  isOpen,
  title = "Game Over!",
  message,
  actionLabel = "Start New Game",
  onAction,
}) => {
  if (!isOpen) return null;

  return (
    <div className="game-over-modal-overlay">
      <div className="game-over-modal">
        {title && <h2>{title}</h2>}
        {message && <p>{message}</p>}
        <div className="game-over-actions">
          <button onClick={onAction} className="new-game-btn">
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
