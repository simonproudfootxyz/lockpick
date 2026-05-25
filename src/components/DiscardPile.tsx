"use client";

import { useState, useCallback, type DragEvent } from "react";
import Card from "@/components/Card";
import { PrimaryInvertButton, TextButton } from "@/components/Button";
import useWindowSize from "@/hooks/useWindowSize";
import MagnifyingGlass from "@/assets/MagnifyingGlass.svg";
import ArrowUp from "@/assets/ArrowUp.svg";
import ArrowDown from "@/assets/ArrowDown.svg";
import type { PileType } from "@/lib/game/gameTypes";
import "../DiscardPile.css";

type DiscardPileProps = {
  pile: number[];
  pileType: PileType;
  pileNumber: number;
  onViewPile: (pile: number[], pileType: PileType, pileNumber: number) => void;
  onSelectPile?: (pileNumber: number) => void;
  onPlayCard: (pileIndex: number) => void;
  isSelected: boolean;
  isSelectable: boolean;
  maxCard?: number;
  onCardDrop?: (card: number, pileIndex: number) => void;
};

const DiscardPile = ({
  pile,
  pileType,
  pileNumber,
  onViewPile,
  onPlayCard,
  isSelected,
  isSelectable,
  maxCard,
  onCardDrop,
}: DiscardPileProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const canAcceptDrag = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!onCardDrop) return false;
      if (!event.dataTransfer) return false;
      const types = Array.from(event.dataTransfer.types || []);
      return (
        types.includes("application/lockpick-card") ||
        types.includes("text/plain") ||
        types.includes("text")
      );
    },
    [onCardDrop],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!canAcceptDrag(event)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    [canAcceptDrag],
  );

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!canAcceptDrag(event)) {
        return;
      }
      event.preventDefault();
      setIsDragOver(true);
    },
    [canAcceptDrag],
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!onCardDrop || !canAcceptDrag(event)) {
        return;
      }
      event.preventDefault();
      setIsDragOver(false);

      let cardValue: number | null = null;
      const payload = event.dataTransfer.getData("application/lockpick-card");
      if (payload) {
        try {
          const parsed = JSON.parse(payload) as { card?: number };
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
    [canAcceptDrag, onCardDrop, pileNumber],
  );

  const windowSize = useWindowSize();
  const isMobiletDown = windowSize?.width !== undefined && windowSize.width < 680;

  return (
    <div
      className={`discard-pile ${isDragOver ? "drag-over" : ""}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <TextButton
        onClick={() => onViewPile(pile, pileType, pileNumber)}
        className="discard-pile__view-pile-button"
        title="View all cards in this pile"
        disabled={pile.length === 0}
        mini
      >
        {pile.length} {pile.length > 1 || pile.length === 0 ? "Cards" : "Card"}
        <img
          className="discard-pile__view-pile-icon"
          height={10}
          width={10}
          src={MagnifyingGlass.src}
          alt="View Pile"
        />
      </TextButton>
      <div className="pile-cards">
        <img
          className="discard-pile__direction-icon"
          height={13}
          width={12}
          src={pileType === "ascending" ? ArrowUp.src : ArrowDown.src}
          alt="View Pile"
        />
        <div
          className={`pile-display ${pile.length > 1 ? "pile--multiple" : ""}`}
        >
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
      <PrimaryInvertButton
        className={`discard-pile__play-button ${isSelected ? "selected" : ""}`}
        onClick={() => onPlayCard(pileNumber - 1)}
        disabled={!isSelectable}
        mini
      >
        Play
      </PrimaryInvertButton>
    </div>
  );
};

export default DiscardPile;
