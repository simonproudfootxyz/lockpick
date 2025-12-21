import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useSocket from "../hooks/useSocket";
import NamePromptModal from "./NamePromptModal";
import "./JoinViaLink.css";
import { storePlayerIdentity } from "../utils/playerIdentity";

const JoinViaLink = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  const normalizedRoomCode = useMemo(
    () => (roomCode ? roomCode.trim().toUpperCase() : ""),
    [roomCode]
  );

  const [isPromptOpen, setIsPromptOpen] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canChooseRole, setCanChooseRole] = useState(true);
  const [pendingJoinAsPlayer, setPendingJoinAsPlayer] = useState(true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handleCancel = useCallback(() => {
    if (isSubmitting) return;
    setIsPromptOpen(false);
    navigate("/lobby", { replace: true });
  }, [isSubmitting, navigate]);

  const handleSubmit = useCallback(
    (submission) => {
      const rawName =
        typeof submission === "string" ? submission : submission?.name ?? "";
      const joinPreference =
        typeof submission === "object" && submission !== null
          ? submission.joinAsPlayer
          : undefined;
      const trimmedName = rawName.trim();
      if (!trimmedName) {
        setError("Please enter your name to join the room.");
        return;
      }
      if (!isConnected || !socket) {
        setError("Still connecting to the server. Please try again.");
        return;
      }
      if (!normalizedRoomCode) {
        setError("Room code missing.");
        return;
      }

      let requestedJoinAsPlayer = true;
      if (!canChooseRole) {
        requestedJoinAsPlayer = false;
      } else if (joinPreference === false) {
        requestedJoinAsPlayer = false;
      }

      setIsSubmitting(true);
      setError("");
      socket.emit(
        "validate-name",
        {
          action: "join",
          roomCode: normalizedRoomCode,
          playerName: trimmedName,
          joinAsPlayer: requestedJoinAsPlayer,
        },
        (response) => {
          if (!response?.ok) {
            setError(response?.error || "Failed to validate name.");
            setIsSubmitting(false);
            return;
          }

          if (response.isTaken) {
            setError(
              `${trimmedName} is already taken, please choose another name`
            );
            setIsSubmitting(false);
            return;
          }

          if (!response.playerId) {
            setError("Failed to reserve player identity. Please try again.");
            setIsSubmitting(false);
            return;
          }

          const playerId = response.playerId;
          let finalJoinAsPlayer = requestedJoinAsPlayer;

          if (response.roomStatus) {
            const canJoin = response.roomStatus.canJoinAsPlayer;
            setCanChooseRole(canJoin);
            if (!canJoin) {
              finalJoinAsPlayer = false;
            } else {
              finalJoinAsPlayer = finalJoinAsPlayer && canJoin;
            }
          }

          setPendingJoinAsPlayer(finalJoinAsPlayer);

          setIsSubmitting(false);
          storePlayerIdentity(playerId, trimmedName);

          navigate(
            `/multiplayer/${normalizedRoomCode}?playerId=${encodeURIComponent(
              playerId
            )}`,
            {
              replace: true,
              state: {
                playerId,
                playerName: trimmedName,
                joinAsPlayer: finalJoinAsPlayer,
              },
            }
          );
        }
      );
    },
    [isConnected, socket, normalizedRoomCode, navigate, canChooseRole]
  );

  useEffect(() => {
    if (!normalizedRoomCode || !socket || !isConnected) {
      return;
    }

    let cancelled = false;
    setIsPreviewLoading(true);
    socket.emit(
      "room-preview",
      { roomCode: normalizedRoomCode },
      (response) => {
        if (cancelled) {
          return;
        }

        setIsPreviewLoading(false);

        if (!response?.ok) {
          setError(response?.error || "Unable to fetch room details.");
          setCanChooseRole(true);
          setPendingJoinAsPlayer(true);
          return;
        }

        const canJoin = response.canJoinAsPlayer;
        setError("");
        setCanChooseRole(canJoin);
        setPendingJoinAsPlayer((prev) =>
          prev === false && canJoin ? prev : canJoin
        );
      }
    );

    return () => {
      cancelled = true;
    };
  }, [normalizedRoomCode, socket, isConnected]);

  useEffect(() => {
    if (!normalizedRoomCode) {
      navigate("/lobby", { replace: true });
    }
  }, [normalizedRoomCode, navigate]);

  return (
    <div className="join-link">
      <div className="join-link-container">
        <h1>Join Room {normalizedRoomCode}</h1>
        <p className="join-link-description">
          Enter your display name to join the multiplayer room.
        </p>
        {!isConnected && (
          <div className="join-link-error">
            Connecting to server, please wait...
          </div>
        )}
        <p className="join-link-footer">
          You were invited to room <span>{normalizedRoomCode}</span>. Have fun!
        </p>
      </div>
      <NamePromptModal
        isOpen={isPromptOpen}
        initialValue=""
        isSubmitting={isSubmitting || isPreviewLoading}
        error={error}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        pendingAction="join"
        roomCode={normalizedRoomCode}
        canChooseRole={canChooseRole}
        initialJoinAsPlayer={pendingJoinAsPlayer}
        onJoinModeChange={setPendingJoinAsPlayer}
      />
    </div>
  );
};

export default JoinViaLink;
