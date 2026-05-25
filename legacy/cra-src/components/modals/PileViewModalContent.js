import React from "react";
import Card from "../../Card";
import "./PileViewModalContent.css";

const PileViewModalContent = ({ pile = [] }) => {
  if (!pile || pile.length === 0) {
    return <p className="pile-view-empty">This pile is empty.</p>;
  }

  return (
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
        <p>
          <strong>Total cards:</strong> {pile.length}
        </p>
        <p>Top card: {pile[pile.length - 1]}</p>
        <p>Bottom card: {pile[0]}</p>
      </div>
    </div>
  );
};

export default PileViewModalContent;
