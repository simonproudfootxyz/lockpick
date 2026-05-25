"use client";

import { useState, useEffect, type DragEvent } from "react";
import Card from "@/components/Card";
import { canPlayCard } from "@/lib/game/gameLogic";
import type { PileType } from "@/lib/game/gameTypes";
import "../PlayerHand.css";

type PlayerHandProps = {
  hand: number[];
  selectedCard: number | null;
  onCardSelect: (card: number) => void;
  onHandReorder: (hand: number[]) => void;
  isCurrentPlayer: boolean;
  discardPiles?: number[][];
  allowMultiplesOfTenReverse?: boolean;
  disabled?: boolean;
};

const PlayerHand = ({
  hand,
  selectedCard,
  onCardSelect,
  onHandReorder,
  isCurrentPlayer,
  discardPiles = [],
  allowMultiplesOfTenReverse = false,
  disabled = false,
}: PlayerHandProps) => {
  const canInteract = isCurrentPlayer && !disabled;
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showPlayableHints, setShowPlayableHints] = useState(false);

  const isCardPlayable = (card: number) => {
    if (!isCurrentPlayer || discardPiles.length === 0) return false;

    for (let i = 0; i < discardPiles.length; i++) {
      const pile = discardPiles[i];
      const pileType: PileType = i < 2 ? "ascending" : "descending";
      if (
        canPlayCard(card, pile, pileType, {
          allowMultiplesOfTenReverse,
        })
      ) {
        return true;
      }
    }
    return false;
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (!canInteract) return;
    setDraggedIndex(index);
    setShowPlayableHints(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", (e.target as HTMLElement).outerHTML);
    const cardValue = hand[index];
    if (typeof cardValue === "number") {
      try {
        e.dataTransfer.setData(
          "application/lockpick-card",
          JSON.stringify({
            card: cardValue,
            source: "player-hand",
          }),
        );
      } catch {
        e.dataTransfer.setData("text/plain", String(cardValue));
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (!canInteract) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, dropIndex: number) => {
    if (!canInteract || draggedIndex === null) return;
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
    setShowPlayableHints(false);
  };

  useEffect(() => {
    if (!selectedCard) {
      setShowPlayableHints(false);
    }
  }, [selectedCard]);

  useEffect(() => {
    setShowPlayableHints(false);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [hand]);

  return (
    <div className="player-hand">
      <div className="hand-cards">
        {hand.map((card, index) => (
          <div
            key={`${card}-${index}`}
            className={`card-container ${
              draggedIndex === index ? "dragging" : ""
            } ${dragOverIndex === index ? "drag-over" : ""}`}
            draggable={canInteract}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <Card
              value={card}
              isSelected={selectedCard === card}
              onClick={(value) => {
                onCardSelect(value);
                if (!showPlayableHints) {
                  setShowPlayableHints(true);
                }
              }}
              isPlayable={showPlayableHints && isCardPlayable(card)}
              isClickable={canInteract}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerHand;
