import React, { useEffect, useRef, useState } from "react";
import "./NamePromptModal.css";
import Button, { InvertButton } from "./Button";

const NamePromptModal = ({
  isOpen,
  initialValue = "",
  isSubmitting = false,
  error = "",
  onSubmit,
  onCancel,
  pendingAction,
  roomCode,
  canChooseRole = true,
  initialJoinAsPlayer = true,
  onJoinModeChange,
}) => {
  const [name, setName] = useState(initialValue);
  const [joinAsPlayer, setJoinAsPlayer] = useState(initialJoinAsPlayer);
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
    if (isOpen) {
      setJoinAsPlayer(initialJoinAsPlayer);
    }
  }, [isOpen, initialJoinAsPlayer]);

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
    onSubmit?.({ name, joinAsPlayer: canChooseRole ? joinAsPlayer : false });
  };

  const handleJoinModeToggle = (event) => {
    const nextValue = event.target.checked;
    setJoinAsPlayer(nextValue);
    onJoinModeChange?.(nextValue);
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
          {pendingAction === "join" &&
            (canChooseRole ? (
              <label className="role-toggle">
                <input
                  type="checkbox"
                  checked={joinAsPlayer}
                  onChange={handleJoinModeToggle}
                  disabled={isSubmitting}
                  aria-label="Join as a player"
                />
                <div className="role-toggle-copy">
                  <span className="role-toggle-label">
                    {joinAsPlayer
                      ? "Joining as a player"
                      : "Joining as a spectator"}
                  </span>
                </div>
              </label>
            ) : (
              <p className="role-note">
                This room already has the maximum number of players. You’ll join
                as a spectator.
              </p>
            ))}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <Button
              className="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <InvertButton type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Submitting..." : "Continue"}
            </InvertButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NamePromptModal;
