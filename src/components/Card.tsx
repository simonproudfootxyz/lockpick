"use client";

import type { PileType } from "@/lib/game/gameTypes";
import "../Card.css";

type CardProps = {
  value: number;
  isSelected?: boolean;
  onClick?: (value: number) => void;
  isPlayable?: boolean;
  isClickable?: boolean;
  isPreview?: boolean;
  pileType?: PileType | null;
  discardPile?: boolean;
  lastCard?: boolean;
  hasMultipleInPile?: boolean;
};

const Card = ({
  value,
  isSelected,
  onClick,
  isPlayable,
  isClickable = true,
  isPreview = false,
  pileType = null,
  discardPile = false,
  lastCard = false,
}: CardProps) => {
  const handleClick = () => {
    if (isClickable && onClick) {
      onClick(value);
    }
  };

  const propClasses = `
  ${discardPile ? "card--discard" : ""} ${lastCard ? "card--last" : ""} ${
    isSelected ? "selected" : ""
  } ${isPlayable ? "playable" : ""} ${!isClickable ? "disabled" : ""} ${
    isPreview ? "preview" : ""
  } ${isPreview && pileType ? `preview-${pileType}` : ""}`;

  return (
    <div className={`card ${propClasses}`} onClick={handleClick}>
      <div className="card-value">{value}</div>
    </div>
  );
};

export default Card;
