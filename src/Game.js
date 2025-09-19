import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  createDeck,
  getHandSize,
  canPlayCard,
  isGameWon,
  getGameStatus,
} from "./gameLogic";
import DiscardPile from "./DiscardPile";
import PlayerHand from "./PlayerHand";
import PileViewModal from "./PileViewModal";
import GameOverModal from "./GameOverModal";
import RulesModal from "./RulesModal";
import InviteModal from "./InviteModal";
import websocketService from "./services/websocketService";
import "./Game.css";

const Game = () => {
  const { gameId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedPile, setSelectedPile] = useState(null);
  const [viewingPile, setViewingPile] = useState(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [playerCount, setPlayerCount] = useState(1);
  const [connectionError, setConnectionError] = useState(null);

  const numPlayers = parseInt(searchParams.get("players")) || 1;

  // Game state persistence functions
  const saveGameState = (state) => {
    if (gameId && state) {
      const gameData = {
        gameState: state,
        timestamp: Date.now(),
        gameId: gameId,
        numPlayers: numPlayers,
      };
      localStorage.setItem(`lockpick_game_${gameId}`, JSON.stringify(gameData));
      setLastSaved(new Date());
    }
  };

  const loadGameState = useCallback(() => {
    if (gameId) {
      try {
        const savedData = localStorage.getItem(`lockpick_game_${gameId}`);
        if (savedData) {
          const gameData = JSON.parse(savedData);
          // Check if the saved game matches current game ID and player count
          if (
            gameData.gameId === gameId &&
            gameData.numPlayers === numPlayers
          ) {
            return gameData.gameState;
          }
        }
      } catch (error) {
        console.error("Error loading game state:", error);
      }
    }
    return null;
  }, [gameId, numPlayers]);

  const clearGameState = () => {
    if (gameId) {
      localStorage.removeItem(`lockpick_game_${gameId}`);
    }
  };

  const initializeGame = useCallback(
    (players) => {
      const deck = createDeck();
      const handSize = getHandSize(players);

      // Deal hands for all players
      const playerHands = [];
      for (let i = 0; i < players; i++) {
        playerHands.push(deck.splice(0, handSize));
      }

      const newGameState = {
        playerHands,
        currentPlayer: 0,
        discardPiles: [[], [], [], []], // Two ascending (1), two descending (100)
        deck,
        gameWon: false,
        cardsPlayedThisTurn: 0,
        turnComplete: false,
      };

      setGameState(newGameState);
      saveGameState(newGameState);
      // Broadcast initial game state to other players
      websocketService.updateGameState(newGameState);
    },
    [saveGameState]
  );

  // WebSocket event handlers
  const handleGameStateUpdate = useCallback((newGameState) => {
    console.log("Received game state update:", newGameState);
    setGameState(newGameState);
    // Also save to localStorage for persistence
    saveGameState(newGameState);
  }, []);

  const handlePlayerJoined = useCallback((playerInfo) => {
    console.log("Player joined:", playerInfo);
    setPlayerCount((prev) => prev + 1);
  }, []);

  const handlePlayerLeft = useCallback((playerInfo) => {
    console.log("Player left:", playerInfo);
    setPlayerCount((prev) => Math.max(1, prev - 1));
  }, []);

  const handleWebSocketError = useCallback((error) => {
    console.error("WebSocket error:", error);
    setIsConnected(false);
  }, []);

  const handleConnected = useCallback(() => {
    console.log("WebSocket connected");
    setIsConnected(true);
    setConnectionError(null);
  }, []);

  const handleDisconnected = useCallback((reason) => {
    console.log("WebSocket disconnected:", reason);
    setIsConnected(false);
  }, []);

  const handleConnectionError = useCallback((error) => {
    console.error("WebSocket connection error:", error);
    setIsConnected(false);
    setConnectionError(
      "Failed to connect to multiplayer server. Playing in offline mode."
    );
  }, []);

  const handleReconnected = useCallback((attemptNumber) => {
    console.log("WebSocket reconnected after", attemptNumber, "attempts");
    setIsConnected(true);
    setConnectionError(null);
  }, []);

  // Initialize WebSocket connection and game when component mounts
  useEffect(() => {
    if (gameId) {
      // Connect to WebSocket
      websocketService.connect(gameId);

      // Set up event listeners
      websocketService.on("gameStateUpdate", handleGameStateUpdate);
      websocketService.on("playerJoined", handlePlayerJoined);
      websocketService.on("playerLeft", handlePlayerLeft);
      websocketService.on("error", handleWebSocketError);
      websocketService.on("connected", handleConnected);
      websocketService.on("disconnected", handleDisconnected);
      websocketService.on("connectionError", handleConnectionError);
      websocketService.on("reconnected", handleReconnected);

      // Initialize game if no state exists
      if (!gameState) {
        // Try to load saved game state first
        const savedState = loadGameState();
        if (savedState) {
          setGameState(savedState);
          // Broadcast the loaded state to other players
          websocketService.updateGameState(savedState);
        } else {
          // No saved state found, initialize new game
          initializeGame(numPlayers);
        }
      }

      // Cleanup on unmount
      return () => {
        websocketService.off("gameStateUpdate", handleGameStateUpdate);
        websocketService.off("playerJoined", handlePlayerJoined);
        websocketService.off("playerLeft", handlePlayerLeft);
        websocketService.off("error", handleWebSocketError);
        websocketService.off("connected", handleConnected);
        websocketService.off("disconnected", handleDisconnected);
        websocketService.off("connectionError", handleConnectionError);
        websocketService.off("reconnected", handleReconnected);
        websocketService.disconnect();
      };
    }
  }, [
    gameId,
    gameState,
    numPlayers,
    loadGameState,
    initializeGame,
    handleGameStateUpdate,
    handlePlayerJoined,
    handlePlayerLeft,
    handleWebSocketError,
    handleConnected,
    handleDisconnected,
    handleConnectionError,
    handleReconnected,
  ]);

  const handleCardSelect = (card, playerIndex) => {
    if (gameState.gameWon) return;

    // Only allow current player to select cards
    if (playerIndex !== gameState.currentPlayer) return;

    if (selectedCard === card) {
      // Deselect the card
      setSelectedCard(null);
      setSelectedPile(null);
    } else {
      // Select new card and clear pile selection
      setSelectedCard(card);
      setSelectedPile(null);
    }
  };

  const handlePileAssignment = (pileIndex) => {
    setSelectedPile(pileIndex);
  };

  const handleHandReorder = (newHand) => {
    const newPlayerHands = [...gameState.playerHands];
    newPlayerHands[gameState.currentPlayer] = newHand;

    const newGameState = {
      ...gameState,
      playerHands: newPlayerHands,
    };

    setGameState(newGameState);
    saveGameState(newGameState);
    // Broadcast to other players via WebSocket
    websocketService.updateGameState(newGameState);
  };

  const sortHand = () => {
    const sortedHand = [...gameState.playerHands[gameState.currentPlayer]].sort(
      (a, b) => a - b
    );
    const newPlayerHands = [...gameState.playerHands];
    newPlayerHands[gameState.currentPlayer] = sortedHand;

    const newGameState = {
      ...gameState,
      playerHands: newPlayerHands,
    };

    setGameState(newGameState);
    saveGameState(newGameState);
    // Broadcast to other players via WebSocket
    websocketService.updateGameState(newGameState);
  };

  const playSelectedCard = () => {
    if (!selectedCard || selectedPile === null) return;

    const pile = gameState.discardPiles[selectedPile];
    const pileType = selectedPile < 2 ? "ascending" : "descending";

    // Validate card can be played on selected pile
    if (!canPlayCard(selectedCard, pile, pileType)) {
      alert(`Card ${selectedCard} cannot be played on this ${pileType} pile!`);
      return;
    }

    // Play the card
    const newDiscardPiles = [...gameState.discardPiles];
    const newPlayerHands = [...gameState.playerHands];

    // Remove played card from current player's hand
    newDiscardPiles[selectedPile].push(selectedCard);
    const cardIndex =
      newPlayerHands[gameState.currentPlayer].indexOf(selectedCard);
    if (cardIndex > -1) {
      newPlayerHands[gameState.currentPlayer].splice(cardIndex, 1);
    }

    // Clear selection
    setSelectedCard(null);
    setSelectedPile(null);

    // Update cards played this turn
    const newCardsPlayedThisTurn = gameState.cardsPlayedThisTurn + 1;
    const deckEmpty = gameState.deck.length === 0;
    const minCardsRequired = deckEmpty ? 1 : 2;
    const turnComplete = newCardsPlayedThisTurn >= minCardsRequired;

    const newGameState = {
      ...gameState,
      playerHands: newPlayerHands,
      discardPiles: newDiscardPiles,
      cardsPlayedThisTurn: newCardsPlayedThisTurn,
      turnComplete: turnComplete,
      gameWon: isGameWon(newDiscardPiles),
    };

    setGameState(newGameState);
    saveGameState(newGameState);
    // Broadcast to other players via WebSocket
    websocketService.updateGameState(newGameState);
  };

  const endTurn = () => {
    const deckEmpty = gameState.deck.length === 0;
    const minCardsRequired = deckEmpty ? 1 : 2;

    if (gameState.cardsPlayedThisTurn < minCardsRequired) {
      alert(`You must play at least ${minCardsRequired} cards this turn!`);
      return;
    }

    // Refill current player's hand to hand size
    const handSize = getHandSize(gameState.playerHands.length);
    const currentHand = gameState.playerHands[gameState.currentPlayer];
    const cardsNeeded = handSize - currentHand.length;
    const cardsToDraw = Math.min(cardsNeeded, gameState.deck.length);

    const newPlayerHands = [...gameState.playerHands];
    if (cardsToDraw > 0) {
      const newCards = gameState.deck.splice(0, cardsToDraw);
      newPlayerHands[gameState.currentPlayer] = [...currentHand, ...newCards];
    }

    // Move to next player
    const nextPlayer =
      (gameState.currentPlayer + 1) % gameState.playerHands.length;

    const newGameState = {
      ...gameState,
      playerHands: newPlayerHands,
      currentPlayer: nextPlayer,
      cardsPlayedThisTurn: 0,
      turnComplete: false,
    };

    setGameState(newGameState);
    saveGameState(newGameState);
    // Broadcast to other players via WebSocket
    websocketService.updateGameState(newGameState);

    // Clear any selected card when switching players
    setSelectedCard(null);
    setSelectedPile(null);
  };

  const handleViewPile = (pile, pileType, pileNumber) => {
    setViewingPile({ pile, pileType, pileNumber });
  };

  const closePileView = () => {
    setViewingPile(null);
  };

  const handleCantPlayCard = () => {
    setShowGameOverModal(true);
  };

  const closeGameOverModal = () => {
    setShowGameOverModal(false);
  };

  const startNewGame = () => {
    // Clear current game state
    clearGameState();
    setGameState(null);
    setSelectedCard(null);
    setSelectedPile(null);
    setViewingPile(null);
    setShowGameOverModal(false);
    setShowRulesModal(false);

    const newGameId = Math.random().toString(36).substr(2, 9);
    navigate(`/game/${newGameId}?players=${numPlayers}`);
  };

  const openRulesModal = () => {
    setShowRulesModal(true);
  };

  const closeRulesModal = () => {
    setShowRulesModal(false);
  };

  const openInviteModal = () => {
    setShowInviteModal(true);
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
  };

  const copyInviteCode = () => {
    navigator.clipboard
      .writeText(gameId)
      .then(() => {
        // Could add a toast notification here
        alert("Invite code copied to clipboard!");
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = gameId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert("Invite code copied to clipboard!");
      });
  };

  if (!gameState) {
    return (
      <div className="game">
        <div className="game-header">
          <h1>Lockpick</h1>
          <div className="game-status">Loading game...</div>
        </div>
      </div>
    );
  }

  const status = getGameStatus(gameState);

  return (
    <div className="game">
      <div className="game-header">
        <h1>Lockpick</h1>
        <div className="game-id">Game ID: {gameId}</div>
        <div className="connection-status">
          <span
            className={`status-indicator ${
              isConnected ? "connected" : "disconnected"
            }`}
          >
            {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
          </span>
          {playerCount > 1 && (
            <span className="player-count">{playerCount} players online</span>
          )}
          {connectionError && (
            <span className="connection-error">{connectionError}</span>
          )}
        </div>
        <div className="header-buttons">
          <button onClick={openInviteModal} className="invite-btn">
            Invite Players
          </button>
          <button onClick={startNewGame} className="new-game-btn">
            New Game
          </button>
        </div>
        <div className="game-status">{status}</div>
        <div className="game-controls"></div>
      </div>

      <div className="discard-piles">
        <div className="pile-group">
          <h3>Ascending (1)</h3>
          <div className="piles-row">
            <DiscardPile
              pile={gameState.discardPiles[0]}
              pileType="ascending"
              pileNumber={1}
              onViewPile={handleViewPile}
              onSelectPile={handlePileAssignment}
              isSelected={selectedPile === 0}
              isSelectable={!!selectedCard}
            />
            <DiscardPile
              pile={gameState.discardPiles[1]}
              pileType="ascending"
              pileNumber={2}
              onViewPile={handleViewPile}
              onSelectPile={handlePileAssignment}
              isSelected={selectedPile === 1}
              isSelectable={!!selectedCard}
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
              onSelectPile={handlePileAssignment}
              isSelected={selectedPile === 2}
              isSelectable={!!selectedCard}
            />
            <DiscardPile
              pile={gameState.discardPiles[3]}
              pileType="descending"
              pileNumber={4}
              onViewPile={handleViewPile}
              onSelectPile={handlePileAssignment}
              isSelected={selectedPile === 3}
              isSelectable={!!selectedCard}
            />
          </div>
        </div>
      </div>

      <div className="play-card-section">
        <button
          onClick={endTurn}
          disabled={!gameState.turnComplete}
          className="end-turn-btn"
        >
          End Turn & Draw Cards
        </button>
        <button
          onClick={playSelectedCard}
          disabled={!selectedCard || selectedPile === null}
          className="play-card-btn"
        >
          {selectedCard ? `Play card ${selectedCard}` : "Play a card"}
        </button>
        <button onClick={handleCantPlayCard} className="cant-play-btn">
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
            {index === gameState.currentPlayer && (
              <button onClick={sortHand} className="sort-hand-btn">
                Sort Hand
              </button>
            )}
            <PlayerHand
              hand={hand}
              selectedCard={selectedCard}
              onCardSelect={(card) => handleCardSelect(card, index)}
              onHandReorder={handleHandReorder}
              isCurrentPlayer={index === gameState.currentPlayer}
              discardPiles={gameState.discardPiles}
            />
          </div>
        ))}
      </div>

      <div className="game-info">
        <div>Cards in deck: {gameState.deck.length}</div>
        <div>
          Current player hand:{" "}
          {gameState.playerHands[gameState.currentPlayer]?.length || 0} cards
        </div>
        <div>
          Total cards played:{" "}
          {gameState.discardPiles.reduce((sum, pile) => sum + pile.length, 0)}
          /98
        </div>
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
        <button onClick={openRulesModal} className="rules-btn-floating">
          Rules
        </button>
        {lastSaved && (
          <div className="save-indicator">
            Saved: {lastSaved.toLocaleTimeString()}
          </div>
        )}
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

      <InviteModal
        isOpen={showInviteModal}
        onClose={closeInviteModal}
        gameId={gameId}
      />
    </div>
  );
};

export default Game;
