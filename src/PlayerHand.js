import React, { useState } from "react";
import Card from "./Card";
import { canPlayCard } from "./gameLogic";
import "./PlayerHand.css";

const PlayerHand = ({
  hand,
  selectedCard,
  onCardSelect,
  onHandReorder,
  isCurrentPlayer,
  discardPiles = [],
}) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const isCardPlayable = (card) => {
    if (!isCurrentPlayer || discardPiles.length === 0) return false;

    // Check if card can be played on any discard pile
    for (let i = 0; i < discardPiles.length; i++) {
      const pile = discardPiles[i];
      const pileType = i < 2 ? "ascending" : "descending";
      if (canPlayCard(card, pile, pileType)) {
        return true;
      }
    }
    return false;
  };

  const handleDragStart = (e, index) => {
    if (!isCurrentPlayer) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.target.outerHTML);
  };

  const handleDragOver = (e, index) => {
    if (!isCurrentPlayer) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    if (!isCurrentPlayer || draggedIndex === null) return;
    e.preventDefault();

    if (draggedIndex !== dropIndex) {
      const newHand = [...hand];
      const draggedCard = newHand[draggedIndex];
      newHand.splice(draggedIndex, 1);
      newHand.splice(dropIndex, 0, draggedCard);
      onHandReorder(newHand);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="player-hand">
      <div className="hand-cards">
        {hand.map((card, index) => (
          <div
            key={`${card}-${index}`}
            className={`card-container ${
              draggedIndex === index ? "dragging" : ""
            } ${dragOverIndex === index ? "drag-over" : ""}`}
            draggable={isCurrentPlayer}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <Card
              value={card}
              isSelected={selectedCard === card}
              onClick={onCardSelect}
              isPlayable={isCardPlayable(card)}
              isClickable={isCurrentPlayer}
            />
          </div>
        ))}
      </div>
      <div className="hand-info">
        {hand.length} cards in hand
        {isCurrentPlayer && (
          <div className="selection-info">
            {selectedCard
              ? `Card ${selectedCard} selected`
              : "No card selected"}
            <div className="reorder-hint">Drag cards to reorder</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerHand;
