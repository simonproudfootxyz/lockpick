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
import { getTotalCardCount } from "../gameLogic";
import "../Game.css";
import {
  getStoredPlayerName,
  storePlayerIdentity,
} from "../utils/playerIdentity";
import Button, { PrimaryButton, TextButton } from "./Button";
import { useModal } from "../context/ModalContext";
import GameOverModalContent from "./modals/GameOverModalContent";
import PileViewModalContent from "./modals/PileViewModalContent";
import ConfirmModalContent from "./modals/ConfirmModalContent";
import LockpickLogo from "../assets/LockpickLogo.svg";
import BlockArrowUp from "../assets/BlockArrowUp.svg";
import BlockArrowDown from "../assets/BlockArrowDown.svg";
import ThinArrowUp from "../assets/ThinArrowUp.svg";
import ThinArrowDown from "../assets/ThinArrowDown.svg";
import ArrowDown from "../assets/ArrowDown.svg";
import Toggle from "./Toggle";
import GameHeader from "./GameHeader";
import GameInfo from "./GameInfo";

const MultiplayerGame = () => {
  const { gameId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { socket, isConnected, emit, on, off } = useSocket();
  const { openModal, closeModal } = useModal();

  const socketId = socket?.id;

  const [gameState, setGameState] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedPile, setSelectedPile] = useState(null);

  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [spectators, setSpectators] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameStatus, setGameStatus] = useState("");
  const [copySuccess, setCopySuccess] = useState("");
  const [autoSortEnabled, setAutoSortEnabled] = useState(false);
  const [lastSortOrder, setLastSortOrder] = useState("asc");
  const gameOverModalShownRef = useRef(false);
  const startNewGameRef = useRef(() => {});

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
    [playerId],
  );
  const playerName =
    (locationStateName && locationStateName.trim()) ||
    storedPlayerName ||
    "Anonymous";

  const initialJoinPreference =
    typeof location.state?.joinAsPlayer === "boolean"
      ? !!location.state.joinAsPlayer
      : true;
  const [joinAsPlayerPreference, setJoinAsPlayerPreference] = useState(
    initialJoinPreference,
  );

  const buildGameSummary = useCallback((state) => {
    if (!state) {
      return [];
    }
    const deckCount = Array.isArray(state.deck) ? state.deck.length : 0;
    const totalCardsPlayed = Array.isArray(state.discardPiles)
      ? state.discardPiles.reduce((sum, pile) => sum + pile.length, 0)
      : 0;
    return [
      { label: "Total cards played", value: totalCardsPlayed },
      { label: "Cards remaining in deck", value: deckCount },
    ];
  }, []);

  const updateGameOverState = useCallback(
    (state, context = {}) => {
      const isGameOver = !!(state && (state.gameWon || state.gameOver));

      if (!isGameOver) {
        gameOverModalShownRef.current = false;
        return;
      }

      if (gameOverModalShownRef.current) {
        return;
      }
      gameOverModalShownRef.current = true;

      const buildAction = (close) => () => {
        startNewGameRef.current();
        close();
      };

      if (state.gameWon) {
        const totalCards =
          typeof state.totalCards === "number"
            ? state.totalCards
            : getTotalCardCount(state.playerHands?.length || 0);
        openModal({
          title: "Congratulations!",
          size: "sm",
          closeOnBackdrop: false,
          content: ({ close }) => (
            <GameOverModalContent
              message={`Congratulations, you won! All ${totalCards} cards have been played! Great job!`}
              summaryItems={buildGameSummary(state)}
              actionLabel="Start New Game"
              onAction={buildAction(close)}
            />
          ),
        });
        return;
      }

      const failedPlayer =
        typeof state.endedByPlayer === "number"
          ? state.endedByPlayer
          : (state.currentPlayer ?? 0);
      const displayName =
        context.playerName ||
        players.find((p) => p.playerIndex === failedPlayer)?.name ||
        `Player ${failedPlayer + 1}`;
      openModal({
        title: "Game Over!",
        size: "sm",
        closeOnBackdrop: false,
        content: ({ close }) => (
          <GameOverModalContent
            message={`${displayName} couldn't play a card. The game has ended.`}
            summaryItems={buildGameSummary(state)}
            actionLabel="Start New Game"
            onAction={buildAction(close)}
          />
        ),
      });
    },
    [players, buildGameSummary, openModal],
  );

  const handleRoomJoined = useCallback(
    (data) => {
      console.log("Room joined:", data);
      setRoomData(data);
      setPlayers(data.players || []);
      setSpectators(data.spectators || []);
      setIsHost(data.isHost || false);
      setIsSpectator(data.isSpectator || false);
      setJoinAsPlayerPreference(!data.isSpectator);
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
        updateGameOverState(data.gameState);
      } else {
        updateGameOverState(null);
      }
    },
    [playerId, updateGameOverState, setJoinAsPlayerPreference],
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
        (p) => p.socketId === socketId,
      );
      const spectatorEntry = (data.spectators || []).find(
        (s) => s.socketId === socketId,
      );
      setIsHost(currentPlayer?.isHost || false);
      setIsSpectator(!!spectatorEntry);
      setJoinAsPlayerPreference(!spectatorEntry);
    },
    [socketId, setJoinAsPlayerPreference],
  );

  const handlePlayerLeft = useCallback(
    (data) => {
      console.log("Player left:", data);
      setPlayers(data.players || []);
      setSpectators(data.spectators || []);
      const currentPlayer = (data.players || []).find(
        (p) => p.socketId === socketId,
      );
      setIsHost(currentPlayer?.isHost || false);
    },
    [socketId],
  );

  const handleGameStarted = useCallback(
    (data) => {
      console.log("Game started:", data);
      setGameState(data.gameState);
      setGameStarted(true);
      setGameStatus(data.status);
      updateGameOverState(data.gameState);
      // If we joined after the game started, ensure spectator state aligns with current roster
      const spectatorEntry = (data.players || []).find(
        (p) => p.socketId === socketId && p.isSpectator,
      );
      if (spectatorEntry) {
        setIsSpectator(true);
      }
    },
    [socketId, updateGameOverState],
  );

  const handleCardPlayed = useCallback(
    (data) => {
      console.log("Card played:", data);
      setGameState(data.gameState);
      setGameStatus(data.status);
      setSelectedCard(null);
      setSelectedPile(null);
      updateGameOverState(data.gameState);
    },
    [updateGameOverState],
  );

  const handleHandSorted = useCallback(
    (data) => {
      console.log("Hand sorted:", data);
      setGameState(data.gameState);
      setGameStatus(data.status);
      updateGameOverState(data.gameState);
    },
    [updateGameOverState],
  );

  const handleHandReordered = useCallback(
    (data) => {
      console.log("Hand reordered:", data);
      setGameState(data.gameState);
      setGameStatus(data.status);
      updateGameOverState(data.gameState);
    },
    [updateGameOverState],
  );

  const handleTurnEnded = useCallback(
    (data) => {
      console.log("Turn ended:", data);
      setGameState(data.gameState);
      setGameStatus(data.status);
      setSelectedCard(null);
      setSelectedPile(null);
      updateGameOverState(data.gameState);
    },
    [updateGameOverState],
  );

  const handleCantPlay = useCallback(
    (data) => {
      console.log("Cant play:", data);
      setGameState(data.gameState);
      setGameStatus(data.status);
      updateGameOverState(data.gameState, { playerName: data.playerName });
    },
    [updateGameOverState],
  );

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
      joinAsPlayer: joinAsPlayerPreference,
    });
  }, [
    socket,
    isConnected,
    gameId,
    emit,
    playerName,
    playerId,
    joinAsPlayerPreference,
  ]);

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
    on("hand-reordered", handleHandReordered);
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
      off("hand-reordered", handleHandReordered);
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
    handleHandReordered,
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

  const handlePlayCard = (pileIndex, cardValue = selectedCard) => {
    if (!cardValue || !gameState || isSpectator) return;

    emit("play-card", {
      roomCode: gameId,
      card: cardValue,
      pileIndex,
    });
  };

  const handleEndTurn = () => {
    if (!gameState || isSpectator) return;

    emit("end-turn", {
      roomCode: gameId,
      autoSort: autoSortEnabled,
      sortOrder: lastSortOrder,
    });
  };

  const confirmCantPlayCard = useCallback(() => {
    if (!gameState || isSpectator || gameState.gameOver) {
      return;
    }
    emit("cant-play", {
      roomCode: gameId,
    });
  }, [emit, gameId, gameState, isSpectator]);

  const handleCantPlayClick = useCallback(() => {
    if (!gameState || isSpectator || gameState.gameOver) return;
    openModal({
      title: "End the game?",
      size: "sm",
      content: ({ close }) => (
        <ConfirmModalContent
          message="Confirm you have no legal moves. Ending now will mark the run as failed for everyone in the room."
          confirmLabel="Yes, end the game"
          cancelLabel="Keep playing"
          onConfirm={() => {
            close();
            confirmCantPlayCard();
          }}
        />
      ),
    });
  }, [gameState, isSpectator, openModal, confirmCantPlayCard]);

  const handleStartGame = () => {
    console.log("Start game clicked:", {
      isHost,
      gameStarted,
      players: players.length,
      socketId,
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
    const typeLabel = pileType === "ascending" ? "Ascending" : "Descending";
    openModal({
      title: `${typeLabel} Pile ${pileNumber}`,
      size: "lg",
      content: <PileViewModalContent pile={pile} />,
    });
  };

  const handleSortHand = (playerIndex, order = "asc") => {
    if (!gameState || isSpectator) return;
    if (playerIndex !== gameState.currentPlayer) return;

    setLastSortOrder(order === "desc" ? "desc" : "asc");

    emit("sort-hand", {
      roomCode: gameId,
      order,
    });
  };

  const handleAutoSortToggle = (event) => {
    setAutoSortEnabled(event.target.checked);
  };

  const handleHandReorder = (newHand) => {
    if (!gameState || isSpectator) return;
    if (localPlayerIndex !== gameState.currentPlayer) return;

    setGameState((prevState) => {
      if (!prevState) {
        return prevState;
      }
      const updatedHands = [...prevState.playerHands];
      updatedHands[localPlayerIndex] = newHand;
      return { ...prevState, playerHands: updatedHands };
    });

    emit("reorder-hand", {
      roomCode: gameId,
      hand: newHand,
    });
  };

  const handleCardDrop = (cardValue, pileIndex) => {
    handlePlayCard(pileIndex, cardValue);
  };

  const getPlayerName = useCallback(
    (playerIndex) => {
      const player = players.find((p) => p.playerIndex === playerIndex);
      return player?.name || `Player ${playerIndex + 1}`;
    },
    [players],
  );

  const localPlayerIndex = useMemo(() => {
    if (isSpectator) {
      return -1;
    }

    const entry = players.find((p) => p.socketId === socketId);
    if (typeof entry?.playerIndex === "number") {
      return entry.playerIndex;
    }

    return typeof players[0]?.playerIndex === "number"
      ? players[0].playerIndex
      : 0;
  }, [players, socketId, isSpectator]);

  const startNewGame = useCallback(() => {
    gameOverModalShownRef.current = false;
    closeModal();
    setAutoSortEnabled(false);
    setLastSortOrder("asc");
    navigate("/");
  }, [navigate, closeModal]);

  startNewGameRef.current = startNewGame;

  if (!isConnected) {
    return (
      <div className="game">
        <div className="game-header">
          <h1>
            <img src={LockpickLogo} alt="Lockpick" />
          </h1>
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
          <h1>
            <img src={LockpickLogo} alt="Lockpick" />
          </h1>
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
    socketId,
    playerDetails: players.map((p) => ({
      name: p.name,
      socketId: p.socketId,
      isHost: p.isHost,
    })),
  });
  const playerIsCurrentPlayer =
    gameState && localPlayerIndex === gameState.currentPlayer;

  return (
    <div className="game">
      <div className="game-layout">
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
          {gameStarted && <GameInfo gameState={gameState} />}
        </div>
        <div className="game-main">
          <GameHeader />
          {isHost && !gameStarted && (
            <div className="start-game-section">
              <Button onClick={handleStartGame} disabled={players.length < 2}>
                {players.length < 2
                  ? `Need ${2 - players.length} more player${
                      2 - players.length === 1 ? "" : "s"
                    } to start`
                  : "Start Game"}
              </Button>
            </div>
          )}

          {gameState && (
            <>
              <div className="discard-piles">
                <div className="pile-group">
                  <h3 className="pile-group__title">
                    <img src={BlockArrowUp} alt="Ascending Pile" />
                    Ascending
                  </h3>
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
                      onCardDrop={!isSpectator ? handleCardDrop : undefined}
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
                      onCardDrop={!isSpectator ? handleCardDrop : undefined}
                    />
                  </div>
                </div>
                <div className="pile-separator visible--tablet-down"></div>
                <div className="pile-group">
                  <h3 className="pile-group__title">
                    <img src={BlockArrowDown} alt="Descending Pile" />
                    Descending
                  </h3>
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
                      onCardDrop={!isSpectator ? handleCardDrop : undefined}
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
                      onCardDrop={!isSpectator ? handleCardDrop : undefined}
                    />
                  </div>
                </div>
              </div>
              <div className="player-actions-container">
                {!isSpectator && (
                  <div className="player-section">
                    <div
                      className={`player ${
                        localPlayerIndex === gameState.currentPlayer
                          ? "current"
                          : ""
                      }`}
                    >
                      <div className="player__instructions">
                        {/* <h3
                          className={`player-section__player-name ${
                            localPlayerIndex !== gameState.currentPlayer
                              ? "player-section__player-name--disabled"
                              : ""
                          }`}
                        >
                          {localPlayerIndex === gameState.currentPlayer
                            ? ` Your turn, ${getPlayerName(localPlayerIndex)}`
                            : "Not your turn"}
                        </h3> */}
                        <p
                          className={`player__instructions ${
                            localPlayerIndex !== gameState.currentPlayer
                              ? "disabled"
                              : ""
                          }`}
                        >
                          Drag cards to a pile, or select a card & click "play"
                        </p>
                      </div>

                      <PlayerHand
                        hand={gameState.playerHands[localPlayerIndex] || []}
                        selectedCard={selectedCard}
                        onCardSelect={(card) =>
                          handleCardSelect(card, localPlayerIndex)
                        }
                        onHandReorder={handleHandReorder}
                        isCurrentPlayer={
                          localPlayerIndex === gameState.currentPlayer &&
                          !isSpectator
                        }
                        discardPiles={gameState.discardPiles}
                      />
                      <div className="sort-controls">
                        <Toggle
                          className="auto-sort-toggle"
                          label="Auto-Sort"
                          checked={autoSortEnabled}
                          onChange={handleAutoSortToggle}
                          disabled={
                            localPlayerIndex !== gameState.currentPlayer ||
                            isSpectator
                          }
                        />
                        <div className="sort-buttons">
                          <TextButton
                            onClick={() =>
                              handleSortHand(localPlayerIndex, "asc")
                            }
                            disabled={
                              localPlayerIndex !== gameState.currentPlayer ||
                              isSpectator
                            }
                            mini
                            className="sort-hand-btn"
                          >
                            <img
                              className="sort-hand-btn__icon"
                              src={ThinArrowUp}
                              alt="Sort Ascending"
                            />
                            Sort Asc
                            <span className="hidden--tablet-down">ending</span>
                          </TextButton>
                          <TextButton
                            onClick={() =>
                              handleSortHand(localPlayerIndex, "desc")
                            }
                            disabled={
                              localPlayerIndex !== gameState.currentPlayer ||
                              isSpectator
                            }
                            mini
                            className="sort-hand-btn"
                          >
                            <img
                              className="sort-hand-btn__icon"
                              src={ThinArrowDown}
                              alt="Sort Ascending"
                            />
                            Sort Desc
                            <span className="hidden--tablet-down">ending</span>
                          </TextButton>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {isSpectator && (
                  <div className="waiting-for-game spectator-view">
                    <h2>Spectator Mode</h2>
                    <p>You are watching the game as a spectator.</p>
                    <p>
                      Need {2 - players.length} more player
                      {2 - players.length === 1 ? "" : "s"} to start
                    </p>
                  </div>
                )}
                <div className="play-card-section">
                  {gameState &&
                    localPlayerIndex === gameState.currentPlayer &&
                    !gameState.turnComplete && (
                      <p className="turn-progress">
                        Play{" "}
                        {Math.max(
                          0,
                          (gameState.deck.length === 0 ? 1 : 2) -
                            gameState.cardsPlayedThisTurn,
                        )}{" "}
                        more
                      </p>
                    )}

                  <div className="cant-play-container">
                    <Button
                      onClick={handleCantPlayClick}
                      disabled={isSpectator || !playerIsCurrentPlayer}
                    >
                      I Can't Play A Card
                    </Button>
                    <PrimaryButton
                      onClick={handleEndTurn}
                      disabled={
                        !gameState ||
                        isSpectator ||
                        localPlayerIndex !== gameState.currentPlayer ||
                        !gameState.turnComplete
                      }
                      title={
                        !gameState || isSpectator
                          ? "Only active players can end the turn"
                          : localPlayerIndex !== gameState.currentPlayer
                            ? "Wait for your turn"
                            : !gameState.turnComplete
                              ? "Play the required number of cards first"
                              : undefined
                      }
                    >
                      End Turn & Draw Cards
                    </PrimaryButton>
                  </div>
                </div>
              </div>
            </>
          )}

          {!gameState && (
            <div className="waiting-for-game">
              <h2>Waiting for game to start...</h2>
              <p>The host needs to start the game.</p>
              <p>
                Need {2 - players.length} more player
                {2 - players.length === 1 ? "" : "s"} to start
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiplayerGame;
