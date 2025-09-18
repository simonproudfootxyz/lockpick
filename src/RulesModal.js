import React from "react";
import "./RulesModal.css";

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
        <div className="rules-content">
          <div className="game-objective">
            <h3>Objective</h3>
            <p>
              Try to discard all 98 cards in the deck onto four discard piles to
              win!
            </p>
          </div>

          <div className="pile-rules">
            <h3>Discard Piles</h3>
            <ul>
              <li>
                <strong>Two ascending piles (1 ↑):</strong> Each card must be
                higher than the previous card
              </li>
              <li>
                <strong>Two descending piles (100 ↓):</strong> Each card must be
                lower than the previous card
              </li>
            </ul>
          </div>

          <div className="special-rules">
            <h3>Special Reverse Rules</h3>
            <ul>
              <li>
                <strong>Ascending piles:</strong> Play a card exactly 10 less
                than the top card
                <br />
                <em>Example: Play 27 on 37</em>
              </li>
              <li>
                <strong>Descending piles:</strong> Play a card exactly 10 more
                than the top card
                <br />
                <em>Example: Play 98 on 88</em>
              </li>
            </ul>
          </div>

          <div className="gameplay-rules">
            <h3>How to Play</h3>
            <ul>
              <li>Select and play cards from your hand</li>
              <li>
                You must play at least 2 cards per turn (or 1 if the deck is
                empty)
              </li>
              <li>
                After playing your required cards, end your turn to draw new
                cards
              </li>
              <li>Play all 98 cards to win!</li>
              <li>
                If you can't play any cards, click "I can't play a card" to end
                the game
              </li>
            </ul>
          </div>

          <div className="hand-sizes">
            <h3>Hand Sizes</h3>
            <ul>
              <li>1 Player: 8 cards</li>
              <li>2 Players: 7 cards each</li>
              <li>3-5 Players: 6 cards each</li>
            </ul>
          </div>
        </div>
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
