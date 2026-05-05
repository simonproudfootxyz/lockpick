import React from "react";
import Button from "../Button";
import "./GameOverModalContent.css";

const GameOverModalContent = ({
  message,
  summaryItems = [],
  actionLabel = "Start New Game",
  onAction,
  close,
}) => {
  const handleAction = () => {
    if (onAction) {
      onAction();
    }
    if (close) {
      close();
    }
  };

  return (
    <div className="game-over-content">
      {message && <p className="game-over-content__message">{message}</p>}
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
        <Button onClick={handleAction}>{actionLabel}</Button>
      </div>
    </div>
  );
};

export default GameOverModalContent;
