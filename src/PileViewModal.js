import React from "react";
import Card from "./Card";
import "./PileViewModal.css";

const PileViewModal = ({ pile, pileType, pileNumber, onClose }) => {
  if (!pile || pile.length === 0) return null;

  const getPileTitle = () => {
    const type = pileType === "ascending" ? "Ascending" : "Descending";
    return `${type} Pile ${pileNumber}`;
  };

  return (
    <div className="pile-view-overlay" onClick={onClose}>
      <div className="pile-view-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pile-view-header">
          <h3>{getPileTitle()}</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="pile-view-content">
          <div className="pile-cards-list">
            {pile.map((card, index) => (
              <div key={`${card}-${index}`} className="pile-card-item">
                <div className="card-position">{index + 1}.</div>
                <Card value={card} isClickable={false} />
              </div>
            ))}
          </div>
          <div className="pile-summary">
            <p>Total cards: {pile.length}</p>
            <p>Top card: {pile[pile.length - 1]}</p>
            <p>Bottom card: {pile[0]}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PileViewModal;
