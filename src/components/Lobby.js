import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useSocket from "../hooks/useSocket";
import "./Lobby.css";

const Lobby = () => {
  const navigate = useNavigate();
  const { socket, isConnected, error, emit, on, off } = useSocket();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [roomList, setRoomList] = useState([]);
  const [showRoomList, setShowRoomList] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Listen for room creation success
    const handleRoomCreated = (data) => {
      console.log("Room created:", data);
      setIsCreating(false);
      navigate(
        `/multiplayer/${data.roomCode}?playerName=${encodeURIComponent(
          playerName
        )}`
      );
    };

    // Listen for room join success
    const handleRoomJoined = (data) => {
      console.log("Room joined:", data);
      setIsJoining(false);
      navigate(
        `/multiplayer/${data.roomCode}?playerName=${encodeURIComponent(
          playerName
        )}`
      );
    };

    // Listen for room list updates
    const handleRoomList = (rooms) => {
      setRoomList(rooms);
    };

    // Listen for errors
    const handleError = (data) => {
      console.error("Lobby error:", data);
      setIsCreating(false);
      setIsJoining(false);
      alert(data.message || "An error occurred");
    };

    on("room-created", handleRoomCreated);
    on("room-joined", handleRoomJoined);
    on("room-list", handleRoomList);
    on("error", handleError);

    return () => {
      off("room-created", handleRoomCreated);
      off("room-joined", handleRoomJoined);
      off("room-list", handleRoomList);
      off("error", handleError);
    };
  }, [socket, playerName, navigate, on, off]);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }
    if (!isConnected) {
      alert("Not connected to server");
      return;
    }

    setIsCreating(true);
    emit("create-room", { playerName: playerName.trim() });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }
    if (!roomCode.trim()) {
      alert("Please enter a room code");
      return;
    }
    if (!isConnected) {
      alert("Not connected to server");
      return;
    }

    setIsJoining(true);
    emit("join-room", {
      roomCode: roomCode.trim().toUpperCase(),
      playerName: playerName.trim(),
    });
  };

  const handleJoinRoomFromList = (roomCode) => {
    if (!playerName.trim()) {
      alert("Please enter your name first");
      return;
    }
    if (!isConnected) {
      alert("Not connected to server");
      return;
    }

    setIsJoining(true);
    emit("join-room", {
      roomCode: roomCode,
      playerName: playerName.trim(),
    });
  };

  const loadRoomList = () => {
    if (isConnected) {
      emit("get-room-list");
      setShowRoomList(true);
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

        <div className="player-name-section">
          <label htmlFor="playerName">Your Name:</label>
          <input
            id="playerName"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            disabled={isCreating || isJoining}
          />
        </div>

        <div className="lobby-actions">
          <div className="create-room-section">
            <h3>Create New Room</h3>
            <form onSubmit={handleCreateRoom}>
              <button
                type="submit"
                disabled={!playerName.trim() || isCreating || isJoining}
                className="create-room-btn"
              >
                {isCreating ? "Creating..." : "Create Room"}
              </button>
            </form>
          </div>

          <div className="join-room-section">
            <h3>Join Existing Room</h3>
            <form onSubmit={handleJoinRoom}>
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
                  !playerName.trim() ||
                  !roomCode.trim() ||
                  isCreating ||
                  isJoining
                }
                className="join-room-btn"
              >
                {isJoining ? "Joining..." : "Join Room"}
              </button>
            </form>
          </div>

          <div className="room-list-section">
            <button
              onClick={loadRoomList}
              disabled={isCreating || isJoining}
              className="load-rooms-btn"
            >
              {showRoomList ? "Refresh Room List" : "Show Available Rooms"}
            </button>

            {showRoomList && roomList.length > 0 && (
              <div className="room-list">
                <h4>Available Rooms:</h4>
                {roomList.map((room) => (
                  <div key={room.code} className="room-item">
                    <div className="room-info">
                      <span className="room-code">{room.code}</span>
                      <span className="room-players">
                        {room.playerCount} player
                        {room.playerCount !== 1 ? "s" : ""}
                        {room.spectatorCount > 0 &&
                          `, ${room.spectatorCount} spectator${
                            room.spectatorCount !== 1 ? "s" : ""
                          }`}
                      </span>
                      {room.hasGame && (
                        <span className="game-status">Game in progress</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleJoinRoomFromList(room.code)}
                      disabled={!playerName.trim() || isCreating || isJoining}
                      className="join-room-from-list-btn"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showRoomList && roomList.length === 0 && (
              <div className="no-rooms">
                <p>No rooms available</p>
              </div>
            )}
          </div>
        </div>

        <div className="lobby-info">
          <h4>How to Play:</h4>
          <ul>
            <li>Create a room and share the code with friends</li>
            <li>Or join an existing room with a room code</li>
            <li>Up to 5 players can join a room</li>
            <li>Players who join after the room is full become spectators</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
