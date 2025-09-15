import React from "react";
import Card from "./Card";
import "./DiscardPile.css";

const DiscardPile = ({
  pile,
  pileType,
  pileNumber,
  onViewPile,
  onSelectPile,
  isSelected,
  isSelectable,
}) => {
  const getPileLabel = () => {
    if (pileType === "ascending") {
      return pile.length === 0 ? "1 ↑" : `${pile[pile.length - 1]} ↑`;
    } else {
      return pile.length === 0 ? "100 ↓" : `${pile[pile.length - 1]} ↓`;
    }
  };

  return (
    <div className="discard-pile">
      <div className="pile-header">
        <div className="pile-label">{getPileLabel()}</div>
        {pile.length > 0 && (
          <button
            className="view-pile-btn"
            onClick={() => onViewPile(pile, pileType, pileNumber)}
            title="View all cards in this pile"
          >
            View
          </button>
        )}
      </div>
      <div className="pile-cards">
        {pile.length === 0 ? (
          <div className="empty-pile">
            <div className="no-cards-card">
              <div className="no-cards-text">No Cards</div>
            </div>
          </div>
        ) : (
          <div className="pile-stack">
            {pile.slice(-3).map((card, index) => (
              <div
                key={`${card}-${index}`}
                className="stacked-card"
                style={{
                  zIndex: index + 1,
                  transform: `translate(${index * 2}px, ${index * -2}px)`,
                }}
              >
                <Card value={card} isClickable={false} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="pile-count">{pile.length} cards</div>
      {isSelectable && (
        <button
          className={`select-pile-btn ${isSelected ? "selected" : ""}`}
          onClick={() => onSelectPile(pileNumber - 1)}
        >
          {isSelected ? "Selected" : "Select"}
        </button>
      )}
    </div>
  );
};

export default DiscardPile;
