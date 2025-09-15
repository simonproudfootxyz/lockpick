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
}) => {
  const handleClick = () => {
    if (isClickable && onClick) {
      onClick(value);
    }
  };

  return (
    <div
      className={`card ${isSelected ? "selected" : ""} ${
        isPlayable ? "playable" : ""
      } ${!isClickable ? "disabled" : ""} ${isPreview ? "preview" : ""} ${
        isPreview && pileType ? `preview-${pileType}` : ""
      }`}
      onClick={handleClick}
    >
      <div className="card-value">{value}</div>
    </div>
  );
};

export default Card;
