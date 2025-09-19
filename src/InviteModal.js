import React from "react";
import "./InviteModal.css";

const InviteModal = ({ isOpen, onClose, gameId }) => {
  if (!isOpen) return null;

  const copyInviteCode = () => {
    navigator.clipboard
      .writeText(gameId)
      .then(() => {
        alert("Invite code copied to clipboard!");
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = gameId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert("Invite code copied to clipboard!");
      });
  };

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/join`;
    navigator.clipboard
      .writeText(inviteLink)
      .then(() => {
        alert("Invite link copied to clipboard!");
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = inviteLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert("Invite link copied to clipboard!");
      });
  };

  return (
    <div className="invite-modal-overlay">
      <div className="invite-modal">
        <div className="invite-modal-header">
          <h2>Invite Players</h2>
          <button onClick={onClose} className="close-invite-btn">
            ×
          </button>
        </div>
        <div className="invite-content">
          <p>
            Share this invite code with other players so they can join your
            game:
          </p>

          <div className="invite-code-section">
            <h3>Invite Code</h3>
            <div className="invite-code-display">
              <span className="invite-code">{gameId}</span>
              <button onClick={copyInviteCode} className="copy-btn">
                Copy Code
              </button>
            </div>
          </div>

          <div className="invite-link-section">
            <h3>Or share this link</h3>
            <div className="invite-link-display">
              <span className="invite-link">{window.location.origin}/join</span>
              <button onClick={copyInviteLink} className="copy-btn">
                Copy Link
              </button>
            </div>
          </div>

          <div className="invite-instructions">
            <h3>How to join:</h3>
            <ol>
              <li>Share the invite code or link with other players</li>
              <li>They visit the join page and enter the invite code</li>
              <li>They'll be added to your game session</li>
            </ol>
          </div>
        </div>
        <div className="invite-modal-footer">
          <button onClick={onClose} className="close-modal-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
