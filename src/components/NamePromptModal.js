import React, { useEffect, useRef, useState } from "react";
import "./NamePromptModal.css";

const NamePromptModal = ({
  isOpen,
  initialValue = "",
  isSubmitting = false,
  error = "",
  onSubmit,
  onCancel,
  pendingAction,
  roomCode,
}) => {
  const [name, setName] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialValue);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isOpen, initialValue]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    onSubmit?.(name);
  };

  if (!isOpen) {
    return null;
  }

  const actionLabel = pendingAction === "create" ? "Create Room" : "Join Room";
  const description =
    pendingAction === "create"
      ? "Enter your name to create a new room"
      : roomCode
      ? `Enter your name to join room ${roomCode}`
      : "Enter your name to join the room";

  return (
    <div className="name-prompt-backdrop" role="dialog" aria-modal="true">
      <div className="name-prompt-modal">
        <h2>{actionLabel}</h2>
        <p className="description">{description}</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="player-name-input">Name</label>
          <input
            id="player-name-input"
            ref={inputRef}
            type="text"
            maxLength={20}
            placeholder="Your name"
            value={name}
            disabled={isSubmitting}
            onChange={(event) => setName(event.target.value)}
            data-testid="name-prompt-input"
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button
              type="button"
              className="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Submitting..." : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NamePromptModal;
