import React from "react";
import "./RulesModal.css";
import RulesContent from "./RulesContent";
import Button from "./components/Button";

const RulesModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="rules-modal-overlay">
      <div className="rules-modal">
        <div className="rules-modal-header">
          <h2>Lockpick Game Rules</h2>
          <Button onClick={onClose} className="close-rules-btn">
            ✕
          </Button>
        </div>
        <RulesContent className="modal-rules-content" />
      </div>
    </div>
  );
};

export default RulesModal;
