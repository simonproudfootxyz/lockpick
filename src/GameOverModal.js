import React from "react";
import "./GameOverModal.css";

const GameOverModal = ({
  isOpen,
  title = "Game Over!",
  message,
  actionLabel = "Start New Game",
  onAction,
  summaryItems = [],
}) => {
  if (!isOpen) return null;

  return (
    <div className="game-over-modal-overlay">
      <div className="game-over-modal">
        {title && <h2>{title}</h2>}
        {message && <p>{message}</p>}
        {Array.isArray(summaryItems) && summaryItems.length > 0 && (
          <div className="game-over-summary">
            <h3>Game Summary</h3>
            <ul>
              {summaryItems.map((item) => (
                <li key={item.label}>
                  <span className="summary-label">{item.label}</span>
                  <span className="summary-value">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
