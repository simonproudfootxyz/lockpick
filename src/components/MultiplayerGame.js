import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import useSocket from "../hooks/useSocket";
import DiscardPile from "../DiscardPile";
import PlayerHand from "../PlayerHand";
import PlayerList from "./PlayerList";
import ConnectionStatus from "./ConnectionStatus";
import PileViewModal from "../PileViewModal";
import GameOverModal from "../GameOverModal";
import RulesModal from "../RulesModal";
import "../Game.css";

const MultiplayerGame = () => {
  const { gameId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { socket, isConnected, error, emit, on, off } = useSocket();

  const [gameState, setGameState] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedPile, setSelectedPile] = useState(null);
  const [viewingPile, setViewingPile] = useState(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Multiplayer state
  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [spectators, setSpectators] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameStatus, setGameStatus] = useState("");

  const playerName = searchParams.get("playerName") || "Anonymous";

  useEffect(() => {
    if (!socket || !gameId) return;

    // Join the room
    emit("join-room", {
      roomCode: gameId,
      playerName: playerName,
    });

    // Set up event listeners
    const handleRoomJoined = (data) => {
      console.log("Room joined:", data);
      setRoomData(data);
      setPlayers(data.players || []);
      setSpectators(data.spectators || []);
      setIsHost(data.isHost || false);
      setIsSpectator(data.isSpectator || false);

      if (data.gameState) {
        setGameState(data.gameState);
        setGameStarted(true);
      }
    };

    const handlePlayerJoined = (data) => {
      console.log("Player joined:", data);
      setPlayers(data.players || []);
      setSpectators(data.spectators || []);
      // Determine if current player is host based on player list
      const currentPlayer = (data.players || []).find(
        (p) => p.socketId === socket.id
      );
      setIsHost(currentPlayer?.isHost || false);
    };

    const handlePlayerLeft = (data) => {
      console.log("Player left:", data);
      setPlayers(data.players || []);
      setSpectators(data.spectators || []);
      // Determine if current player is host based on updated player list
      const currentPlayer = (data.players || []).find(
        (p) => p.socketId === socket.id
      );
      setIsHost(currentPlayer?.isHost || false);
    };

    const handleGameStarted = (data) => {
      console.log("Game started:", data);
      setGameState(data.gameState);
      setGameStarted(true);
      setGameStatus(data.status);
    };

    const handleCardPlayed = (data) => {
      console.log("Card played:", data);
      setGameState(data.gameState);
      setGameStatus(data.status);
      setSelectedCard(null);
      setSelectedPile(null);
    };

    const handleTurnEnded = (data) => {
      console.log("Turn ended:", data);
      setGameState(data.gameState);
      setGameStatus(data.status);
      setSelectedCard(null);
      setSelectedPile(null);
    };

    const handleCantPlay = (data) => {
      console.log("Cant play:", data);
      setGameState(data.gameState);
      setGameStatus(data.status);
    };

    const handleError = (data) => {
      console.error("Game error:", data);
      alert(data.message || "An error occurred");
    };

    // Register event listeners
    on("room-joined", handleRoomJoined);
    on("player-joined", handlePlayerJoined);
    on("player-left", handlePlayerLeft);
    on("game-started", handleGameStarted);
    on("card-played", handleCardPlayed);
    on("turn-ended", handleTurnEnded);
    on("cant-play", handleCantPlay);
    on("error", handleError);

    // Cleanup
    return () => {
      off("room-joined", handleRoomJoined);
      off("player-joined", handlePlayerJoined);
      off("player-left", handlePlayerLeft);
      off("game-started", handleGameStarted);
      off("card-played", handleCardPlayed);
      off("turn-ended", handleTurnEnded);
      off("cant-play", handleCantPlay);
      off("error", handleError);
    };
  }, [socket, gameId, playerName, emit, on, off]);

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
      pileIndex: pileIndex,
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
    if (!isHost || gameStarted) return;

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

  const closeGameOverModal = () => {
    setShowGameOverModal(false);
  };

  const startNewGame = () => {
    navigate("/");
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

  const currentPlayerIndex = gameState ? gameState.currentPlayer : 0;

  // Debug logging
  console.log("MultiplayerGame render:", {
    isHost,
    gameStarted,
    players: players.length,
    gameState: !!gameState,
    roomData: !!roomData,
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
        <div className="game-status">
          {gameStatus || "Waiting for game to start..."}
        </div>
      </div>

      <div className="game-layout">
        <div className="game-main">
          {/* Start Game Button - Only visible to host when game hasn't started */}
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
                      onViewPile={handleViewPile}
                      onSelectPile={() => {}}
                      onPlayCard={handlePlayCard}
                      isSelected={selectedPile === 1}
                      isSelectable={!!selectedCard && !isSpectator}
                    />
                  </div>
                </div>
                <div className="pile-group">
                  <h3>Descending (100)</h3>
                  <div className="piles-row">
                    <DiscardPile
                      pile={gameState.discardPiles[2]}
                      pileType="descending"
                      pileNumber={3}
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

              <div className="player-section">
                {gameState.playerHands.map((hand, index) => (
                  <div
                    key={index}
                    className={`player ${
                      index === gameState.currentPlayer ? "current" : ""
                    }`}
                  >
                    <h3>
                      Player {index + 1}{" "}
                      {index === gameState.currentPlayer ? "(Your Turn)" : ""}
                    </h3>
                    <PlayerHand
                      hand={hand}
                      selectedCard={selectedCard}
                      onCardSelect={(card) => handleCardSelect(card, index)}
                      onHandReorder={() => {}} // Disabled in multiplayer
                      isCurrentPlayer={
                        index === gameState.currentPlayer && !isSpectator
                      }
                      discardPiles={gameState.discardPiles}
                    />
                  </div>
                ))}
              </div>
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
            currentPlayerIndex={currentPlayerIndex}
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
          /98
        </div>
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
