import React, { useEffect, useRef, useState } from "react";
import "./NamePromptModal.css";
import Button, { InvertButton } from "./Button";

const MAX_NAME_LENGTH = 12;

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
  const [name, setName] = useState(() =>
    (initialValue || "").slice(0, MAX_NAME_LENGTH)
  );
  const [joinAsPlayer, setJoinAsPlayer] = useState(initialJoinAsPlayer);
  const [validationError, setValidationError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName((initialValue || "").slice(0, MAX_NAME_LENGTH));
      setValidationError("");
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
    const trimmedName = name.trim();
    if (trimmedName.length > MAX_NAME_LENGTH) {
      setValidationError(
        `Name must be ${MAX_NAME_LENGTH} characters or fewer.`
      );
      return;
    }
    setValidationError("");
    onSubmit?.({ name, joinAsPlayer: canChooseRole ? joinAsPlayer : false });
  };

  const handleNameChange = (event) => {
    const nextValue = event.target.value.slice(0, MAX_NAME_LENGTH);
    setName(nextValue);
    if (validationError) {
      setValidationError("");
    }
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
            maxLength={MAX_NAME_LENGTH}
            placeholder="Your name"
            value={name}
            disabled={isSubmitting}
            onChange={handleNameChange}
            aria-describedby="player-name-counter"
            aria-invalid={validationError ? "true" : "false"}
            data-testid="name-prompt-input"
          />
          <p id="player-name-counter" className="name-counter">
            {name.length}/{MAX_NAME_LENGTH}
          </p>
          {validationError && (
            <p className="error" role="alert">
              {validationError}
            </p>
          )}
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
            <InvertButton
              type="submit"
              disabled={
                isSubmitting ||
                !name.trim() ||
                name.trim().length > MAX_NAME_LENGTH
              }
            >
              {isSubmitting ? "Submitting..." : "Continue"}
            </InvertButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NamePromptModal;
