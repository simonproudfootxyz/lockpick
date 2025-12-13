import React from "react";
import "./RulesModal.css";
import RulesContent from "./RulesContent";

const RulesModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="rules-modal-overlay">
      <div className="rules-modal">
        <div className="rules-modal-header">
          <h2>Lockpick Game Rules</h2>
          <button onClick={onClose} className="close-rules-btn">
            ×
          </button>
        </div>
        <RulesContent className="modal-rules-content" />
        <div className="rules-modal-footer">
          <button onClick={onClose} className="close-modal-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RulesModal;
