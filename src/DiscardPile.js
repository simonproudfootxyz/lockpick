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
      </div>
      <div className="pile-cards">
        <div className="pile-display">
          {/* Show starting card for empty piles */}
          {pile.length === 0 && (
            <div className="starting-card">
              <Card
                value={pileType === "ascending" ? 1 : 100}
                isClickable={false}
              />
            </div>
          )}
          {/* Show only the last played card */}
          {pile.length > 0 && (
            <div className="last-card">
              <Card value={pile[pile.length - 1]} isClickable={false} />
            </div>
          )}
        </div>
      </div>
      <div className="pile-count">{pile.length} cards</div>
      <button
        className={`view-pile-btn ${pile.length === 0 && "disabled"}`}
        onClick={() => onViewPile(pile, pileType, pileNumber)}
        title="View all cards in this pile"
        disabled={pile.length === 0}
      >
        View
      </button>
      <button
        className={`select-pile-btn ${isSelected ? "selected" : ""} ${
          !isSelectable ? "disabled" : ""
        }`}
        onClick={() => onSelectPile(pileNumber - 1)}
        disabled={!isSelectable}
      >
        {isSelected ? "Selected" : "Select"}
      </button>
    </div>
  );
};

export default DiscardPile;
