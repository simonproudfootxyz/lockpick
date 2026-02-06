import React, { useState, useCallback } from "react";
import Card from "./Card";
import "./DiscardPile.css";
import Button, { InvertButton } from "./components/Button";
import useWindowSize from "./hooks/useWindowSize";

const DiscardPile = ({
  pile,
  pileType,
  pileNumber,
  onViewPile,
  onSelectPile,
  onPlayCard,
  isSelected,
  isSelectable,
  maxCard,
  onCardDrop,
}) => {
  const getPileLabel = () => {
    if (pileType === "ascending") {
      return pile.length === 0 ? "1 ↑" : `${pile[pile.length - 1]} ↑`;
    } else {
      const startingValue = maxCard && maxCard > 100 ? maxCard : 100;
      return pile.length === 0
        ? `${startingValue} ↓`
        : `${pile[pile.length - 1]} ↓`;
    }
  };

  const [isDragOver, setIsDragOver] = useState(false);

  const canAcceptDrag = useCallback(
    (event) => {
      if (!onCardDrop) return false;
      if (!event.dataTransfer) return false;
      const types = Array.from(event.dataTransfer.types || []);
      return (
        types.includes("application/lockpick-card") ||
        types.includes("text/plain") ||
        types.includes("text")
      );
    },
    [onCardDrop]
  );

  const handleDragOver = useCallback(
    (event) => {
      if (!canAcceptDrag(event)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    [canAcceptDrag]
  );

  const handleDragEnter = useCallback(
    (event) => {
      if (!canAcceptDrag(event)) {
        return;
      }
      event.preventDefault();
      setIsDragOver(true);
    },
    [canAcceptDrag]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event) => {
      if (!onCardDrop || !canAcceptDrag(event)) {
        return;
      }
      event.preventDefault();
      setIsDragOver(false);

      let cardValue = null;
      const payload = event.dataTransfer.getData("application/lockpick-card");
      if (payload) {
        try {
          const parsed = JSON.parse(payload);
          if (parsed && typeof parsed.card === "number") {
            cardValue = parsed.card;
          }
        } catch {
          cardValue = null;
        }
      }

      if (cardValue === null) {
        const fallback =
          event.dataTransfer.getData("text/plain") ||
          event.dataTransfer.getData("text");
        if (fallback && !Number.isNaN(Number(fallback))) {
          cardValue = Number(fallback);
        }
      }

      if (typeof cardValue === "number") {
        onCardDrop(cardValue, pileNumber - 1);
      }
    },
    [canAcceptDrag, onCardDrop, pileNumber]
  );

  const windowSize = useWindowSize();
  const isMobiletDown = windowSize?.width < 680;

  return (
    <div
      className={`discard-pile ${isDragOver ? "drag-over" : ""}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Desktop View Pile button */}
      <InvertButton
        className={`hidden--tablet-down`}
        onClick={() => onViewPile(pile, pileType, pileNumber)}
        title="View all cards in this pile"
        disabled={pile.length === 0}
        mini
      >
        {pile.length} {pile.length > 1 || pile.length === 0 ? "Cards" : "Card"}
      </InvertButton>
      {/* End Desktop View Pile button */}
      <div className="pile-cards">
        <div
          className={`pile-display ${pile.length > 1 ? "pile--multiple" : ""}`}
        >
          {/* Show starting card for empty piles */}
          {pile.length === 0 && (
            <div className="starting-card">
              <Card
                value={
                  pileType === "ascending"
                    ? 1
                    : maxCard && maxCard > 100
                    ? maxCard
                    : 100
                }
                isClickable={false}
                discardPile={true}
              />
            </div>
          )}
          {/* Show only the last played card */}
          {pile.length > 0 && (
            <Card
              value={pile[pile.length - 1]}
              isClickable={false}
              lastCard
              discardPile={true}
              hasMultipleInPile={pile.length > 1}
            />
          )}
        </div>
      </div>
      {/* Tablet Button Container */}
      <div className="tablet-button-container visible--tablet-down">
        <InvertButton
          onClick={() => onViewPile(pile, pileType, pileNumber)}
          title="View all cards in this pile"
          disabled={pile.length === 0}
          mini={isMobiletDown}
        >
          {pile.length}{" "}
          {pile.length > 1 || pile.length === 0 ? "Cards" : "Card"}
        </InvertButton>
        <InvertButton
          className={`${isSelected ? "selected" : ""} ${
            !isSelectable ? "disabled" : ""
          }`}
          onClick={() => onPlayCard(pileNumber - 1)}
          disabled={!isSelectable}
          mini={isMobiletDown}
        >
          Play
        </InvertButton>
      </div>
      {/* End Tablet Button Container */}
      {/* Desktop Play button */}
      <InvertButton
        className={`hidden--tablet-down ${isSelected ? "selected" : ""}`}
        onClick={() => onPlayCard(pileNumber - 1)}
        disabled={!isSelectable}
        mini
      >
        Play
      </InvertButton>
      {/* End Desktop Play button */}
    </div>
  );
};

export default DiscardPile;
