import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import useSocket from "../hooks/useSocket";
import DiscardPile from "../DiscardPile";
import PlayerHand from "../PlayerHand";
import PlayerList from "./PlayerList";
import ConnectionStatus from "./ConnectionStatus";
import PileViewModal from "../PileViewModal";
import GameOverModal from "../GameOverModal";
import RulesModal from "../RulesModal";
import { getTotalCardCount, getDescendingStartValue } from "../gameLogic";
import "../Game.css";
import {
  getStoredPlayerName,
  storePlayerIdentity,
} from "../utils/playerIdentity";

const MultiplayerGame = () => {
  const { gameId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { socket, isConnected, error, emit, on, off, connectionQuality } =
    useSocket();

  const [gameState, setGameState] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedPile, setSelectedPile] = useState(null);
  const [viewingPile, setViewingPile] = useState(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [spectators, setSpectators] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameStatus, setGameStatus] = useState("");
  const [copySuccess, setCopySuccess] = useState("");

  const joinAttemptsRef = useRef(0);
  const hasJoinedRoom = useRef(false);
  const locationStateName = location.state?.playerName || "";
  const locationStatePlayerId = location.state?.playerId || "";
  const searchParamPlayerId = searchParams.get("playerId") || "";
  const playerId =
    (locationStatePlayerId && locationStatePlayerId.trim()) ||
    (searchParamPlayerId && searchParamPlayerId.trim()) ||
    "";
  const storedPlayerName = useMemo(
    () => getStoredPlayerName(playerId),
    [playerId]
  );
  const playerName =
    (locationStateName && locationStateName.trim()) ||
    storedPlayerName ||
    "Anonymous";

  const handleRoomJoined = useCallback(
    (data) => {
      console.log("Room joined:", data);
      setRoomData(data);
      setPlayers(data.players || []);
      setSpectators(data.spectators || []);
      setIsHost(data.isHost || false);
      setIsSpectator(data.isSpectator || false);
      hasJoinedRoom.current = true;

      if (playerId) {
        const selfParticipant =
          (data.players || []).find((p) => p.playerId === playerId) ||
          (data.spectators || []).find((s) => s.playerId === playerId);
        if (selfParticipant) {
          storePlayerIdentity(selfParticipant.playerId, selfParticipant.name);
        }
      }

      if (data.gameState) {
        setGameState(data.gameState);
        setGameStarted(true);
      }
    },
    [playerId]
  );

  useEffect(() => {
    if (!playerId && gameId) {
      navigate(`/join/${gameId}`, { replace: true });
    }
  }, [playerId, gameId, navigate]);

  const handlePlayerJoined = useCallback(
    (data) => {
      console.log("Player joined:", data);
      setPlayers(data.players || []);
      setSpectators(data.spectators || []);
      const currentPlayer = (data.players || []).find(
        (p) => p.socketId === socket?.id
      );
      const spectatorEntry = (data.spectators || []).find(
        (s) => s.socketId === socket?.id
      );
      setIsHost(currentPlayer?.isHost || false);
      setIsSpectator(!!spectatorEntry);
    },
    [socket?.id]
  );

  const handlePlayerLeft = useCallback(
    (data) => {
      console.log("Player left:", data);
      setPlayers(data.players || []);
      setSpectators(data.spectators || []);
      const currentPlayer = (data.players || []).find(
        (p) => p.socketId === socket?.id
      );
      setIsHost(currentPlayer?.isHost || false);
    },
    [socket?.id]
  );

  const handleGameStarted = useCallback((data) => {
    console.log("Game started:", data);
    setGameState(data.gameState);
    setGameStarted(true);
    setGameStatus(data.status);
    // If we joined after the game started, ensure spectator state aligns with current roster
    const spectatorEntry = (data.players || []).find(
      (p) => p.socketId === socket?.id && p.isSpectator
    );
    if (spectatorEntry) {
      setIsSpectator(true);
    }
  }, []);

  const handleCardPlayed = useCallback((data) => {
    console.log("Card played:", data);
    setGameState(data.gameState);
    setGameStatus(data.status);
    setSelectedCard(null);
    setSelectedPile(null);
  }, []);

  const handleHandSorted = useCallback((data) => {
    console.log("Hand sorted:", data);
    setGameState(data.gameState);
    setGameStatus(data.status);
  }, []);

  const handleTurnEnded = useCallback((data) => {
    console.log("Turn ended:", data);
    setGameState(data.gameState);
    setGameStatus(data.status);
    setSelectedCard(null);
    setSelectedPile(null);
  }, []);

  const handleCantPlay = useCallback((data) => {
    console.log("Cant play:", data);
    setGameState(data.gameState);
    setGameStatus(data.status);
  }, []);

  const handleError = useCallback((data) => {
    console.error("Game error:", data);
    alert(data.message || "An error occurred");
  }, []);

  const attemptJoinRoom = useCallback(() => {
    if (!socket || !isConnected || !gameId || hasJoinedRoom.current) {
      return;
    }

    if (joinAttemptsRef.current > 0) {
      console.log("Already attempted to join, waiting for server response...");
      return;
    }

    joinAttemptsRef.current += 1;
    console.log("Joining room:", gameId);

    if (!playerId) {
      console.error("Missing playerId, cannot join room");
      return;
    }

    emit("join-room", {
      roomCode: gameId,
      playerName,
      playerId,
    });
  }, [socket, isConnected, gameId, emit, playerName, playerId]);

  useEffect(() => {
    if (!socket) return;

    on("room-joined", handleRoomJoined);
    on("player-joined", handlePlayerJoined);
    on("player-left", handlePlayerLeft);
    on("game-started", handleGameStarted);
    on("card-played", handleCardPlayed);
    on("turn-ended", handleTurnEnded);
    on("cant-play", handleCantPlay);
    on("hand-sorted", handleHandSorted);
    on("error", handleError);

    return () => {
      off("room-joined", handleRoomJoined);
      off("player-joined", handlePlayerJoined);
      off("player-left", handlePlayerLeft);
      off("game-started", handleGameStarted);
      off("card-played", handleCardPlayed);
      off("turn-ended", handleTurnEnded);
      off("cant-play", handleCantPlay);
      off("hand-sorted", handleHandSorted);
      off("error", handleError);
    };
  }, [
    socket,
    on,
    off,
    handleRoomJoined,
    handlePlayerJoined,
    handlePlayerLeft,
    handleGameStarted,
    handleCardPlayed,
    handleTurnEnded,
    handleCantPlay,
    handleHandSorted,
    handleError,
  ]);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log("Socket connected, attempting to join room");
      hasJoinedRoom.current = false;
      joinAttemptsRef.current = 0;
      attemptJoinRoom();
    };

    const handleDisconnect = () => {
      console.log("Socket disconnected, will retry join on reconnect");
      hasJoinedRoom.current = false;
      joinAttemptsRef.current = 0;
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket, attemptJoinRoom]);

  const handleCardSelect = (card, playerIndex) => {
    if (!gameState || gameState.gameWon || isSpectator) return;
    if (playerIndex !== gameState.currentPlayer) return;

    if (selectedCard === card) {
      setSelectedCard(null);
      setSelectedPile(null);
    } else {
      setSelectedCard(card);
      setSelectedPile(null);
    }
  };

  const handlePlayCard = (pileIndex) => {
    if (!selectedCard || !gameState || isSpectator) return;

    emit("play-card", {
      roomCode: gameId,
      card: selectedCard,
      pileIndex,
    });
  };

  const handleEndTurn = () => {
    if (!gameState || isSpectator) return;

    emit("end-turn", {
      roomCode: gameId,
    });
  };

  const handleCantPlayCard = () => {
    if (!gameState || isSpectator) return;

    emit("cant-play", {
      roomCode: gameId,
    });
  };

  const handleStartGame = () => {
    console.log("Start game clicked:", {
      isHost,
      gameStarted,
      players: players.length,
      socketId: socket?.id,
    });

    if (!isHost) {
      alert("Only the host can start the game");
      return;
    }

    if (gameStarted) {
      alert("Game has already started");
      return;
    }

    if (players.length < 2) {
      alert("Need at least 2 players to start the game");
      return;
    }

    emit("start-game", {
      roomCode: gameId,
    });
  };

  const handleViewPile = (pile, pileType, pileNumber) => {
    setViewingPile({ pile, pileType, pileNumber });
  };

  const closePileView = () => {
    setViewingPile(null);
  };

  const handleSortHand = (playerIndex) => {
    if (!gameState || isSpectator) return;
    if (playerIndex !== gameState.currentPlayer) return;

    emit("sort-hand", {
      roomCode: gameId,
    });
  };

  const getPlayerName = useCallback(
    (playerIndex) => {
      const player = players.find((p) => p.playerIndex === playerIndex);
      return player?.name || `Player ${playerIndex + 1}`;
    },
    [players]
  );

  const localPlayerIndex = useMemo(() => {
    const entry = players.find((p) => p.socketId === socket?.id);
    if (typeof entry?.playerIndex === "number") {
      return entry.playerIndex;
    }
    return typeof players[0]?.playerIndex === "number"
      ? players[0].playerIndex
      : 0;
  }, [players, socket?.id]);

  const closeGameOverModal = () => {
    setShowGameOverModal(false);
  };

  const startNewGame = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const buildInviteLink = () => {
    const origin = window.location.origin;
    return `${origin}/join/${gameId}`;
  };

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(buildInviteLink());
      setCopySuccess("Invite link copied!");
      setTimeout(() => setCopySuccess(""), 3000);
    } catch (err) {
      console.error("Failed to copy invite link", err);
      setCopySuccess("Copy failed. Please copy manually: " + buildInviteLink());
    }
  };

  const openRulesModal = () => {
    setShowRulesModal(true);
  };

  const closeRulesModal = () => {
    setShowRulesModal(false);
  };

  if (!isConnected) {
    return (
      <div className="game">
        <div className="game-header">
          <h1>Lockpick Multiplayer</h1>
          <ConnectionStatus isConnected={isConnected} error={error} />
        </div>
        <div className="reconnection-overlay">
          <div className="reconnection-message">
            <h3>Connection Lost</h3>
            <p>Waiting for server...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="game">
        <div className="game-header">
          <h1>Lockpick Multiplayer</h1>
          <ConnectionStatus isConnected={isConnected} error={error} />
          <div className="game-status">Joining room...</div>
        </div>
      </div>
    );
  }

  const totalCardsTarget = gameState
    ? gameState.totalCards || getTotalCardCount(gameState.playerHands.length)
    : 0;
  const descendingStart = gameState
    ? gameState.descendingStart ||
      (gameState.maxCard && gameState.maxCard > 100
        ? gameState.maxCard + 1
        : 100)
    : 100;

  console.log("MultiplayerGame render:", {
    isHost,
    gameStarted,
    players: players.length,
    gameState: !!gameState,
    roomData: !!roomData,
    socketId: socket?.id,
    playerDetails: players.map((p) => ({
      name: p.name,
      socketId: p.socketId,
      isHost: p.isHost,
    })),
  });

  return (
    <div className="game">
      <div className="game-header">
        <h1>Lockpick Multiplayer</h1>
        <div className="game-id">Room: {gameId}</div>
        <button onClick={startNewGame} className="new-game-btn">
          Leave Room
        </button>
        <ConnectionStatus isConnected={isConnected} error={error} />
        <div className="connection-quality">
          Connection:{" "}
          {connectionQuality === "good"
            ? "🟢"
            : connectionQuality === "fair"
            ? "🟡"
            : "🔴"}{" "}
          {connectionQuality}
        </div>
        <div className="game-status">
          {gameStatus || "Waiting for game to start..."}
        </div>
      </div>

      <div className="game-layout">
        <div className="game-main">
          {isHost && !gameStarted && (
            <div className="start-game-section">
              <button
                onClick={handleStartGame}
                disabled={players.length < 2}
                className="start-game-main-btn"
              >
                {players.length < 2
                  ? `Need ${2 - players.length} more player${
                      2 - players.length === 1 ? "" : "s"
                    } to start`
                  : "Start Game"}
              </button>
            </div>
          )}

          {gameState && (
            <>
              <div className="discard-piles">
                <div className="pile-group">
                  <h3>Ascending (1)</h3>
                  <div className="piles-row">
                    <DiscardPile
                      pile={gameState.discardPiles[0]}
                      pileType="ascending"
                      pileNumber={1}
                      maxCard={descendingStart}
                      onViewPile={handleViewPile}
                      onSelectPile={() => {}}
                      onPlayCard={handlePlayCard}
                      isSelected={selectedPile === 0}
                      isSelectable={!!selectedCard && !isSpectator}
                    />
                    <DiscardPile
                      pile={gameState.discardPiles[1]}
                      pileType="ascending"
                      pileNumber={2}
                      maxCard={descendingStart}
                      onViewPile={handleViewPile}
                      onSelectPile={() => {}}
                      onPlayCard={handlePlayCard}
                      isSelected={selectedPile === 1}
                      isSelectable={!!selectedCard && !isSpectator}
                    />
                  </div>
                </div>
                <div className="pile-group">
                  <h3>Descending ({descendingStart})</h3>
                  <div className="piles-row">
                    <DiscardPile
                      pile={gameState.discardPiles[2]}
                      pileType="descending"
                      pileNumber={3}
                      maxCard={descendingStart}
                      onViewPile={handleViewPile}
                      onSelectPile={() => {}}
                      onPlayCard={handlePlayCard}
                      isSelected={selectedPile === 2}
                      isSelectable={!!selectedCard && !isSpectator}
                    />
                    <DiscardPile
                      pile={gameState.discardPiles[3]}
                      pileType="descending"
                      pileNumber={4}
                      maxCard={descendingStart}
                      onViewPile={handleViewPile}
                      onSelectPile={() => {}}
                      onPlayCard={handlePlayCard}
                      isSelected={selectedPile === 3}
                      isSelectable={!!selectedCard && !isSpectator}
                    />
                  </div>
                </div>
              </div>

              <div className="play-card-section">
                <button
                  onClick={handleEndTurn}
                  disabled={!gameState.turnComplete || isSpectator}
                  className="end-turn-btn"
                >
                  End Turn & Draw Cards
                </button>
                <button
                  onClick={handleCantPlayCard}
                  className="cant-play-btn"
                  disabled={isSpectator}
                >
                  I can't play a card
                </button>
              </div>

              {!isSpectator && (
                <div className="player-section">
                  <div
                    className={`player ${
                      localPlayerIndex === gameState.currentPlayer
                        ? "current"
                        : ""
                    }`}
                  >
                    <h3>
                      {getPlayerName(localPlayerIndex)}
                      {localPlayerIndex === gameState.currentPlayer
                        ? " (Your Turn)"
                        : ""}
                    </h3>
                    <button
                      onClick={() => handleSortHand(localPlayerIndex)}
                      className="sort-hand-btn"
                      disabled={
                        localPlayerIndex !== gameState.currentPlayer ||
                        isSpectator
                      }
                    >
                      Sort Hand
                    </button>
                    <PlayerHand
                      hand={gameState.playerHands[localPlayerIndex] || []}
                      selectedCard={selectedCard}
                      onCardSelect={(card) =>
                        handleCardSelect(card, localPlayerIndex)
                      }
                      onHandReorder={() => {}}
                      isCurrentPlayer={
                        localPlayerIndex === gameState.currentPlayer &&
                        !isSpectator
                      }
                      discardPiles={gameState.discardPiles}
                    />
                  </div>
                </div>
              )}

              {isSpectator && (
                <div className="waiting-for-game spectator-view">
                  <h2>Spectator Mode</h2>
                  <p>You are watching the game as a spectator.</p>
                </div>
              )}
            </>
          )}

          {!gameState && (
            <div className="waiting-for-game">
              <h2>Waiting for game to start...</h2>
              <p>The host needs to start the game.</p>
            </div>
          )}
        </div>

        <div className="game-sidebar">
          <PlayerList
            players={players}
            spectators={spectators}
            currentPlayerIndex={gameState?.currentPlayer ?? 0}
            localPlayerIndex={localPlayerIndex}
            isHost={isHost}
            onStartGame={handleStartGame}
            gameStarted={gameStarted}
          />
        </div>
      </div>

      <div className="game-info">
        <div>Cards in deck: {gameState?.deck?.length || 0}</div>
        <div>
          Current player hand:{" "}
          {gameState?.playerHands?.[gameState?.currentPlayer]?.length || 0}{" "}
          cards
        </div>
        <div>
          Total cards played:{" "}
          {gameState?.discardPiles?.reduce(
            (sum, pile) => sum + pile.length,
            0
          ) || 0}
          /{totalCardsTarget}
        </div>
        <button onClick={handleCopyInviteLink} className="copy-invite-floating">
          Copy Invite Link
        </button>
        {copySuccess && (
          <div className="copy-feedback-floating">{copySuccess}</div>
        )}
        {gameState && (
          <div className="turn-progress">
            Cards played this turn: {gameState.cardsPlayedThisTurn}
            {!gameState.turnComplete && (
              <span className="cards-remaining">
                {" "}
                (need{" "}
                {Math.max(
                  0,
                  (gameState.deck.length === 0 ? 1 : 2) -
                    gameState.cardsPlayedThisTurn
                )}{" "}
                more)
              </span>
            )}
          </div>
        )}
        <button onClick={openRulesModal} className="rules-btn-floating">
          Rules
        </button>
      </div>

      {viewingPile && (
        <PileViewModal
          pile={viewingPile.pile}
          pileType={viewingPile.pileType}
          pileNumber={viewingPile.pileNumber}
          onClose={closePileView}
        />
      )}

      <GameOverModal
        isOpen={showGameOverModal}
        onClose={closeGameOverModal}
        onNewGame={startNewGame}
        currentPlayer={gameState?.currentPlayer || 0}
      />

      <RulesModal isOpen={showRulesModal} onClose={closeRulesModal} />
    </div>
  );
};

export default MultiplayerGame;
