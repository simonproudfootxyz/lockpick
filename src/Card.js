import React from "react";
import "./Card.css";

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
}) => {
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
