import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NamePromptModal from "./NamePromptModal";
import useSocket from "../hooks/useSocket";
import "./Lobby.css";

const Lobby = () => {
  const navigate = useNavigate();
  const { socket, isConnected, error, emit, on, off } = useSocket();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copySuccess, setCopySuccess] = useState("");
  const [lastCreatedRoom, setLastCreatedRoom] = useState(null);
  const [isNamePromptOpen, setIsNamePromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingRoomCode, setPendingRoomCode] = useState("");
  const [pendingName, setPendingName] = useState("");
  const [isSubmittingName, setIsSubmittingName] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (!socket) return;

    // Listen for room creation success
    const handleRoomCreated = (data) => {
      console.log("Room created:", data);
      setIsCreating(false);
      setLastCreatedRoom(data.roomCode);
      navigate(
        `/multiplayer/${data.roomCode}?playerName=${encodeURIComponent(
          playerName
        )}`,
        { replace: true, state: { playerName } }
      );
    };

    // Listen for room join success
    const handleRoomJoined = (data) => {
      console.log("Room joined:", data);
      setIsJoining(false);
      navigate(
        `/multiplayer/${data.roomCode}?playerName=${encodeURIComponent(
          playerName
        )}`,
        { replace: true, state: { playerName } }
      );
    };

    // Listen for errors
    const handleError = (data) => {
      console.error("Lobby error:", data);
      setIsCreating(false);
      setIsJoining(false);
      setIsSubmittingName(false);
      setNameError(data.message || "An error occurred");
    };

    on("room-created", handleRoomCreated);
    on("room-joined", handleRoomJoined);
    on("error", handleError);

    return () => {
      off("room-created", handleRoomCreated);
      off("room-joined", handleRoomJoined);
      off("error", handleError);
    };
  }, [socket, playerName, navigate, on, off]);

  const openNamePrompt = (action, code = "") => {
    setPendingAction(action);
    setPendingRoomCode(code);
    setPendingName(playerName.trim());
    setNameError("");
    setIsNamePromptOpen(true);
  };

  const closeNamePrompt = () => {
    if (isSubmittingName) return;
    setIsNamePromptOpen(false);
    setPendingAction(null);
    setPendingRoomCode("");
    setNameError("");
  };

  const handleCreateRoomClick = (e) => {
    e.preventDefault();
    if (!isConnected) {
      alert("Not connected to server");
      return;
    }
    openNamePrompt("create");
  };

  const handleJoinRoomClick = (e) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      alert("Please enter a room code");
      return;
    }
    if (!isConnected) {
      alert("Not connected to server");
      return;
    }
    openNamePrompt("join", roomCode.trim().toUpperCase());
  };

  const submitName = async (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Please enter your name");
      return;
    }
    if (!socket || !isConnected || !pendingAction) {
      setNameError("Connection lost. Please try again.");
      return;
    }

    setIsSubmittingName(true);
    setNameError("");
    setPlayerName(trimmedName);
    setPendingName(trimmedName);

    if (pendingAction === "create") {
      setIsCreating(true);
      emit("create-room", { playerName: trimmedName });
    } else if (pendingAction === "join") {
      if (!pendingRoomCode) {
        setNameError("Missing room code");
        setIsSubmittingName(false);
        return;
      }
      setIsJoining(true);
      emit("join-room", {
        roomCode: pendingRoomCode,
        playerName: trimmedName,
      });
    }

    setIsSubmittingName(false);
    setIsNamePromptOpen(false);
    setPendingAction(null);
    setPendingRoomCode("");
  };

  const handleRoomListJoin = (code) => {
    if (!isConnected) {
      alert("Not connected to server");
      return;
    }
    setRoomCode(code);
    openNamePrompt("join", code);
  };

  const buildInviteLink = (code) => {
    const origin = window.location.origin;
    return `${origin}/join/${code}`;
  };

  const handleCopyInviteLink = async (code) => {
    const link = buildInviteLink(code);
    try {
      await navigator.clipboard.writeText(link);
      setCopySuccess("Invite link copied!");
      setTimeout(() => setCopySuccess(""), 3000);
    } catch (err) {
      console.error("Failed to copy invite link", err);
      setCopySuccess("Copy failed. Please copy manually from the link below.");
    }
  };

  if (!isConnected) {
    return (
      <div className="lobby">
        <div className="lobby-container">
          <h1>Lockpick Multiplayer</h1>
          <div className="connection-status">
            <div className="status-indicator disconnected"></div>
            <span>Connecting to server...</span>
          </div>
          {error && (
            <div className="error-message">
              <p>Connection Error: {error}</p>
              <p>Make sure the server is running on port 3001</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="lobby">
      <div className="lobby-container">
        <h1>Lockpick Multiplayer</h1>

        <div className="connection-status">
          <div className="status-indicator connected"></div>
          <span>Connected to server</span>
        </div>

        <div className="lobby-actions">
          <div className="create-room-section">
            <h3>Create New Room</h3>
            <form onSubmit={handleCreateRoomClick}>
              <button
                type="submit"
                disabled={isCreating || isJoining}
                className="create-room-btn"
              >
                {isCreating ? "Creating..." : "Create Room"}
              </button>
            </form>
          </div>

          <div className="join-room-section">
            <h3>Join Existing Room</h3>
            <form onSubmit={handleJoinRoomClick}>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code (6 characters)"
                maxLength={6}
                disabled={isCreating || isJoining}
              />
              <button
                type="submit"
                disabled={!roomCode.trim() || isCreating || isJoining}
                className="join-room-btn"
              >
                {isJoining ? "Joining..." : "Join Room"}
              </button>
            </form>
          </div>
        </div>

        <div className="lobby-info">
          <h4>How to Play:</h4>
          <ul>
            <li>Create a room and share the code with friends</li>
            <li>Or join an existing room with a room code</li>
            <li>Up to 10 players can join a room</li>
            <li>Players who join after the player limit become spectators</li>
          </ul>
          {lastCreatedRoom && (
            <div className="invite-link-section">
              <h5>Invite friends quickly</h5>
              <button
                onClick={() => handleCopyInviteLink(lastCreatedRoom)}
                className="copy-invite-btn"
              >
                Copy Invite Link
              </button>
              {copySuccess && <p className="copy-feedback">{copySuccess}</p>}
              <p className="invite-tip">
                Shareable link: <code>{buildInviteLink(lastCreatedRoom)}</code>
              </p>
            </div>
          )}
        </div>
      </div>
      <NamePromptModal
        isOpen={isNamePromptOpen}
        initialValue={pendingName}
        isSubmitting={isSubmittingName || isCreating || isJoining}
        error={nameError}
        onSubmit={submitName}
        onCancel={closeNamePrompt}
        pendingAction={pendingAction}
        roomCode={pendingRoomCode}
      />
    </div>
  );
};

export default Lobby;
