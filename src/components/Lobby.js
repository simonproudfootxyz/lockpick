import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NamePromptModal from "./NamePromptModal";
import useSocket from "../hooks/useSocket";
import "./Lobby.css";
import { storePlayerIdentity } from "../utils/playerIdentity";

const Lobby = () => {
  const navigate = useNavigate();
  const { socket, isConnected, error, emit, on, off } = useSocket();
  const [playerName, setPlayerName] = useState("");
  const [playerId, setPlayerId] = useState("");
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
  const [roomPreview, setRoomPreview] = useState(null);
  const [pendingJoinAsPlayer, setPendingJoinAsPlayer] = useState(true);
  const [canChooseJoinRole, setCanChooseJoinRole] = useState(true);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Listen for room creation success
    const handleRoomCreated = (data) => {
      console.log("Room created:", data);
      setIsCreating(false);
      setLastCreatedRoom(data.roomCode);
      const effectivePlayerId = data.playerId || playerId;
      if (!effectivePlayerId) {
        console.error("Missing playerId for created room");
        setNameError("Failed to create room. Please try again.");
        return;
      }
      storePlayerIdentity(effectivePlayerId, playerName);
      navigate(
        `/multiplayer/${data.roomCode}?playerId=${encodeURIComponent(
          effectivePlayerId
        )}`,
        {
          replace: true,
          state: {
            playerId: effectivePlayerId,
            playerName,
            joinAsPlayer: true,
          },
        }
      );
    };

    // Listen for room join success
    const handleRoomJoined = (data) => {
      console.log("Room joined:", data);
      setIsJoining(false);
      const effectivePlayerId = data.playerId || playerId;
      if (!effectivePlayerId) {
        console.error("Missing playerId after joining room");
        setNameError("Failed to join room. Please try again.");
        return;
      }
      storePlayerIdentity(effectivePlayerId, playerName);
      navigate(
        `/multiplayer/${data.roomCode}?playerId=${encodeURIComponent(
          effectivePlayerId
        )}`,
        {
          replace: true,
          state: {
            playerId: effectivePlayerId,
            playerName,
            joinAsPlayer: !data.isSpectator,
          },
        }
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
  }, [socket, playerName, playerId, navigate, on, off]);

  const openNamePrompt = (action, code = "") => {
    setPendingAction(action);
    setPendingRoomCode(code);
    setPendingName(playerName.trim());
    setNameError("");
    if (action === "join" && code) {
      if (!socket || !isConnected) {
        setNameError("Connection lost. Please try again.");
        return;
      }
      setIsFetchingPreview(true);
      socket.emit("room-preview", { roomCode: code }, (response) => {
        setIsFetchingPreview(false);
        if (!response?.ok) {
          setRoomPreview(null);
          setCanChooseJoinRole(true);
          setPendingJoinAsPlayer(true);
          setNameError(response?.error || "Unable to fetch room details.");
        } else {
          setRoomPreview(response);
          setCanChooseJoinRole(response.canJoinAsPlayer);
          setPendingJoinAsPlayer(response.canJoinAsPlayer);
          setNameError("");
        }
        setIsNamePromptOpen(true);
      });
      return;
    }
    setRoomPreview(null);
    setCanChooseJoinRole(true);
    setPendingJoinAsPlayer(true);
    setIsNamePromptOpen(true);
  };

  const closeNamePrompt = () => {
    if (isSubmittingName) return;
    setIsNamePromptOpen(false);
    setPendingAction(null);
    setPendingRoomCode("");
    setNameError("");
    setRoomPreview(null);
    setPendingJoinAsPlayer(true);
    setCanChooseJoinRole(true);
    setIsFetchingPreview(false);
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

  const submitName = async (submission) => {
    const rawName =
      typeof submission === "string" ? submission : submission?.name ?? "";
    const requestedJoinFlag =
      typeof submission === "object" && submission !== null
        ? submission.joinAsPlayer
        : undefined;

    const trimmedName = rawName.trim();
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

    const action = pendingAction === "create" ? "create" : "join";
    let requestedJoinAsPlayer = true;
    if (action === "join") {
      if (!canChooseJoinRole) {
        requestedJoinAsPlayer = false;
      } else if (requestedJoinFlag === false) {
        requestedJoinAsPlayer = false;
      }
    }

    const payload = {
      action,
      playerName: trimmedName,
    };
    if (action === "join") {
      if (!pendingRoomCode) {
        setNameError("Missing room code");
        setIsSubmittingName(false);
        return;
      }
      payload.roomCode = pendingRoomCode;
      payload.joinAsPlayer = requestedJoinAsPlayer;
    }

    socket.emit("validate-name", payload, (response) => {
      if (!response?.ok) {
        setNameError(response?.error || "Failed to validate name.");
        setIsSubmittingName(false);
        return;
      }

      if (response.isTaken) {
        setNameError(
          `${trimmedName} is already taken, please choose another name`
        );
        setIsSubmittingName(false);
        return;
      }

      if (!response.playerId) {
        setNameError("Failed to reserve player identity. Please try again.");
        setIsSubmittingName(false);
        return;
      }

      const reservedPlayerId = response.playerId;
      setPlayerId(reservedPlayerId);
      storePlayerIdentity(reservedPlayerId, trimmedName);

      let finalJoinAsPlayer = requestedJoinAsPlayer;
      if (response.roomStatus) {
        setRoomPreview(response.roomStatus);
        setCanChooseJoinRole(response.roomStatus.canJoinAsPlayer);
        if (!response.roomStatus.canJoinAsPlayer) {
          finalJoinAsPlayer = false;
        }
      }
      setPendingJoinAsPlayer(finalJoinAsPlayer);

      if (action === "create") {
        setIsCreating(true);
        emit("create-room", {
          playerName: trimmedName,
          playerId: reservedPlayerId,
        });
      } else {
        setIsJoining(true);
        emit("join-room", {
          roomCode: pendingRoomCode,
          playerName: trimmedName,
          playerId: reservedPlayerId,
          joinAsPlayer: finalJoinAsPlayer,
        });
      }

      setIsSubmittingName(false);
      setIsNamePromptOpen(false);
      setPendingAction(null);
      setPendingRoomCode("");
      setRoomPreview(null);
      setPendingJoinAsPlayer(true);
      setCanChooseJoinRole(true);
    });
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
                disabled={
                  !roomCode.trim() ||
                  isCreating ||
                  isJoining ||
                  isFetchingPreview
                }
                className="join-room-btn"
              >
                {isJoining
                  ? "Joining..."
                  : isFetchingPreview
                  ? "Preparing..."
                  : "Join Room"}
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
        isSubmitting={
          isSubmittingName || isCreating || isJoining || isFetchingPreview
        }
        error={nameError}
        onSubmit={submitName}
        onCancel={closeNamePrompt}
        pendingAction={pendingAction}
        roomCode={pendingRoomCode}
        canChooseRole={pendingAction === "join" && canChooseJoinRole}
        initialJoinAsPlayer={pendingJoinAsPlayer}
        onJoinModeChange={setPendingJoinAsPlayer}
      />
    </div>
  );
};

export default Lobby;
