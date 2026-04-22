import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  createDeck,
  getHandSize,
  canPlayCard,
  isGameWon,
  getGameStatus,
  getTotalCardCount,
  getMaxCardValue,
  getDescendingStartValue,
} from "./gameLogic";
import DiscardPile from "./DiscardPile";
import PlayerHand from "./PlayerHand";
import PileViewModal from "./PileViewModal";
import GameOverModal from "./GameOverModal";
import RulesModal from "./RulesModal";
import "./Game.css";
import Button, {
  InvertButton,
  PrimaryButton,
  TextButton,
  TextContrastButton,
} from "./components/Button";
import LockpickLogo from "./assets/LockpickLogo.svg";
import BlockArrowUp from "./assets/BlockArrowUp.svg";
import BlockArrowDown from "./assets/BlockArrowDown.svg";
import ThinArrowUp from "./assets/ThinArrowUp.svg";
import ThinArrowDown from "./assets/ThinArrowDown.svg";
import useWindowSize from "./hooks/useWindowSize";

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
  const [gameOverInfo, setGameOverInfo] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSortEnabled, setAutoSortEnabled] = useState(false);
  const [lastSortOrder, setLastSortOrder] = useState("asc");
  const [isKonamiMode, setIsKonamiMode] = useState(false);
  const [showKonamiToast, setShowKonamiToast] = useState(false);
  const konamiToastTimeoutRef = useRef(null);

  const numPlayers = parseInt(searchParams.get("players")) || 1;

  useEffect(() => {
    if (numPlayers !== 1) {
      setIsKonamiMode(false);
      setShowKonamiToast(false);
      if (konamiToastTimeoutRef.current) {
        clearTimeout(konamiToastTimeoutRef.current);
        konamiToastTimeoutRef.current = null;
      }
      return;
    }

    const konamiSequence = [
      "ArrowUp",
      "ArrowUp",
      "ArrowDown",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowLeft",
      "ArrowRight",
      "KeyB",
      "KeyA",
    ];

    let sequenceIndex = 0;

    const handleKeyDown = (event) => {
      const expectedKey = konamiSequence[sequenceIndex];
      if (event.code === expectedKey) {
        sequenceIndex += 1;
        if (sequenceIndex === konamiSequence.length) {
          setIsKonamiMode(true);
          if (konamiToastTimeoutRef.current) {
            clearTimeout(konamiToastTimeoutRef.current);
          }
          setShowKonamiToast(true);
          konamiToastTimeoutRef.current = setTimeout(() => {
            setShowKonamiToast(false);
            konamiToastTimeoutRef.current = null;
          }, 2500);
          sequenceIndex = 0;
        }
        return;
      }

      sequenceIndex = event.code === konamiSequence[0] ? 1 : 0;
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      setIsKonamiMode(false);
      setShowKonamiToast(false);
      if (konamiToastTimeoutRef.current) {
        clearTimeout(konamiToastTimeoutRef.current);
        konamiToastTimeoutRef.current = null;
      }
    };
  }, [numPlayers]);

  // Game state persistence functions
  const saveGameState = useCallback(
    (state) => {
      if (gameId && state) {
        const gameData = {
          gameState: state,
          timestamp: Date.now(),
          gameId: gameId,
          numPlayers: numPlayers,
        };
        localStorage.setItem(
          `lockpick_game_${gameId}`,
          JSON.stringify(gameData),
        );
        setLastSaved(new Date());
      }
    },
    [gameId, numPlayers],
  );

  const loadGameState = useCallback(() => {
    if (!gameId) {
      return null;
    }
    try {
      const savedData = localStorage.getItem(`lockpick_game_${gameId}`);
      if (savedData) {
        const gameData = JSON.parse(savedData);
        // Check if the saved game matches current game ID and player count
        if (gameData.gameId === gameId && gameData.numPlayers === numPlayers) {
          return gameData.gameState;
        }
      }
    } catch (error) {
      console.error("Error loading game state:", error);
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
      const deck = createDeck(players);
      const handSize = getHandSize(players);
      const totalCards = getTotalCardCount(players);
      const maxCard = getMaxCardValue(players);
      const descendingStart = getDescendingStartValue(players);

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
        totalCards,
        maxCard,
        descendingStart,
      };

      setGameState(newGameState);
      saveGameState(newGameState);
    },
    [saveGameState],
  );

  // Initialize game when component mounts
  useEffect(() => {
    if (!gameState && gameId) {
      // Try to load saved game state first
      const savedState = loadGameState();
      if (savedState) {
        setGameState(savedState);
      } else {
        // No saved state found, initialize new game
        initializeGame(numPlayers);
      }
    }
  }, [gameId, numPlayers, gameState, loadGameState, initializeGame]);

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

  useEffect(() => {
    if (gameState?.gameWon) {
      const totalCards =
        typeof gameState.totalCards === "number"
          ? gameState.totalCards
          : getTotalCardCount(gameState.playerHands?.length || numPlayers);
      setGameOverInfo({
        type: "win",
        title: "Congratulations!",
        message: `Congratulations, you won! All ${totalCards} cards have been played! Great job!`,
        summaryItems: buildGameSummary(gameState),
      });
      setShowGameOverModal(true);
    } else if (gameOverInfo?.type === "win") {
      setGameOverInfo(null);
      setShowGameOverModal(false);
    }
  }, [gameState, gameOverInfo, numPlayers, buildGameSummary]);

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

  const handlePlayCard = (pileIndex, cardValue = selectedCard) => {
    if (cardValue === null || cardValue === undefined) return;

    const pile = gameState.discardPiles[pileIndex];
    const pileType = pileIndex < 2 ? "ascending" : "descending";

    // Validate card can be played on selected pile
    if (
      !canPlayCard(cardValue, pile, pileType, {
        allowMultiplesOfTenReverse: isKonamiMode,
      })
    ) {
      alert(`Card ${cardValue} cannot be played on this ${pileType} pile!`);
      return;
    }

    // Play the card
    const newDiscardPiles = [...gameState.discardPiles];
    const newPlayerHands = [...gameState.playerHands];

    // Remove played card from current player's hand
    newDiscardPiles[pileIndex].push(cardValue);
    const currentHand = [...newPlayerHands[gameState.currentPlayer]];
    const cardIndex = currentHand.indexOf(cardValue);
    if (cardIndex > -1) {
      currentHand.splice(cardIndex, 1);
    }
    newPlayerHands[gameState.currentPlayer] = currentHand;

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
      gameWon: isGameWon(
        newDiscardPiles,
        gameState.totalCards,
        gameState.playerHands.length,
      ),
    };

    setGameState(newGameState);
    saveGameState(newGameState);
  };

  const handleCardDrop = (cardValue, pileIndex) => {
    handlePlayCard(pileIndex, cardValue);
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
  };

  const updateSortedHand = (order, shouldPersistOrder = false) => {
    const comparator = order === "desc" ? (a, b) => b - a : (a, b) => a - b;
    const sortedHand = [...gameState.playerHands[gameState.currentPlayer]].sort(
      comparator,
    );
    const newPlayerHands = [...gameState.playerHands];
    newPlayerHands[gameState.currentPlayer] = sortedHand;

    const newGameState = {
      ...gameState,
      playerHands: newPlayerHands,
    };

    setGameState(newGameState);
    saveGameState(newGameState);
    if (shouldPersistOrder) {
      setLastSortOrder(order === "desc" ? "desc" : "asc");
    }
  };

  const sortHandAscending = () => updateSortedHand("asc", true);

  const sortHandDescending = () => updateSortedHand("desc", true);

  const handleAutoSortToggle = (event) => {
    setAutoSortEnabled(event.target.checked);
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
    const currentHand = [...gameState.playerHands[gameState.currentPlayer]];
    const cardsNeeded = handSize - currentHand.length;
    const cardsToDraw = Math.min(cardsNeeded, gameState.deck.length);

    const newPlayerHands = [...gameState.playerHands];
    if (cardsToDraw > 0) {
      const newCards = gameState.deck.splice(0, cardsToDraw);
      let updatedHand = [...currentHand, ...newCards];
      if (autoSortEnabled) {
        const comparator =
          lastSortOrder === "desc" ? (a, b) => b - a : (a, b) => a - b;
        updatedHand = updatedHand.sort(comparator);
      }
      newPlayerHands[gameState.currentPlayer] = updatedHand;
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

  const [showCantPlayConfirm, setShowCantPlayConfirm] = useState(false);

  const handleCantPlayClick = () => {
    if (!gameState?.gameOver) {
      setShowCantPlayConfirm(true);
    }
  };

  const confirmCantPlayCard = () => {
    setGameOverInfo({
      type: "cant-play",
      title: "Game Over!",
      message: "No more moves are available. Start a new game to try again!",
      summaryItems: buildGameSummary(gameState),
    });
    setShowGameOverModal(true);
    setShowCantPlayConfirm(false);
  };

  const cancelCantPlayCard = () => {
    setShowCantPlayConfirm(false);
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
    setGameOverInfo(null);
    setAutoSortEnabled(false);
    setLastSortOrder("asc");
    setIsKonamiMode(false);
    setShowKonamiToast(false);
    if (konamiToastTimeoutRef.current) {
      clearTimeout(konamiToastTimeoutRef.current);
      konamiToastTimeoutRef.current = null;
    }
    navigate("/");
  };

  const openRulesModal = () => {
    setShowRulesModal(true);
  };

  const closeRulesModal = () => {
    setShowRulesModal(false);
  };
  const windowSize = useWindowSize();
  const isTabletDown = windowSize?.width < 768;

  console.log({ isKonamiMode });

  if (!gameState) {
    return (
      <div className="game">
        <div className="game-header">
          <h1>
            <img src={LockpickLogo} alt="Lockpick" />
          </h1>
          <div className="game-status">Loading game...</div>
        </div>
      </div>
    );
  }

  const status = gameState.gameWon ? "" : getGameStatus(gameState);
  const descendingStart =
    gameState?.descendingStart ||
    (gameState?.maxCard && gameState.maxCard > 100
      ? gameState.maxCard + 1
      : 100);

  return (
    <div className="game">
      {showKonamiToast && (
        <div className="toast toast--konami" role="status" aria-live="polite">
          Cheat Code Activated
        </div>
      )}
      <div className="game-header">
        <h1>
          <img src={LockpickLogo} alt="Lockpick" />
        </h1>
        <div className="game-controls"></div>
      </div>

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
              onSelectPile={handlePileAssignment}
              onPlayCard={handlePlayCard}
              isSelected={selectedPile === 0}
              isSelectable={!!selectedCard}
              onCardDrop={handleCardDrop}
            />
            <DiscardPile
              pile={gameState.discardPiles[1]}
              pileType="ascending"
              pileNumber={2}
              maxCard={descendingStart}
              onViewPile={handleViewPile}
              onSelectPile={handlePileAssignment}
              onPlayCard={handlePlayCard}
              isSelected={selectedPile === 1}
              isSelectable={!!selectedCard}
              onCardDrop={handleCardDrop}
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
              onSelectPile={handlePileAssignment}
              onPlayCard={handlePlayCard}
              isSelected={selectedPile === 2}
              isSelectable={!!selectedCard}
              onCardDrop={handleCardDrop}
            />
            <DiscardPile
              pile={gameState.discardPiles[3]}
              pileType="descending"
              pileNumber={4}
              maxCard={descendingStart}
              onViewPile={handleViewPile}
              onSelectPile={handlePileAssignment}
              onPlayCard={handlePlayCard}
              isSelected={selectedPile === 3}
              isSelectable={!!selectedCard}
              onCardDrop={handleCardDrop}
            />
          </div>
        </div>
      </div>

      <div className="player-actions-container">
        <div className="player-section">
          {gameState.playerHands.map((hand, index) => (
            <div
              key={index}
              className={`player ${
                index === gameState.currentPlayer ? "current" : ""
              }`}
            >
              <p className="player__instructions hidden--tablet-down">
                Drag cards to a pile, or select a card & click “play”
              </p>
              <p className="player__instructions visible--tablet-down">
                Select a card & tap “play” on the intended pile.
              </p>

              <PlayerHand
                hand={hand}
                selectedCard={selectedCard}
                onCardSelect={(card) => handleCardSelect(card, index)}
                onHandReorder={handleHandReorder}
                isCurrentPlayer={index === gameState.currentPlayer}
                discardPiles={gameState.discardPiles}
                allowMultiplesOfTenReverse={isKonamiMode}
              />
              {index === gameState.currentPlayer && (
                <div className="sort-controls">
                  <label className="auto-sort-toggle">
                    <input
                      type="checkbox"
                      checked={autoSortEnabled}
                      onChange={handleAutoSortToggle}
                    />
                    Auto-Sort
                  </label>
                  <div className="sort-buttons">
                    <TextButton
                      onClick={sortHandAscending}
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
                      onClick={sortHandDescending}
                      mini
                      className="sort-hand-btn"
                    >
                      <img
                        className="sort-hand-btn__icon"
                        src={ThinArrowDown}
                        alt="Sort Descending"
                      />
                      Sort Desc
                      <span className="hidden--tablet-down">ending</span>
                    </TextButton>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="play-card-section">
          {!gameState.turnComplete && (
            <p className="turn-progress">
              Play{" "}
              {Math.max(
                0,
                (gameState.deck.length === 0 ? 1 : 2) -
                  gameState.cardsPlayedThisTurn,
              )}{" "}
              more cards
            </p>
          )}

          <div className="cant-play-container">
            <Button onClick={handleCantPlayClick} className="cant-play-btn">
              I Can't Play A Card
            </Button>
            <PrimaryButton
              onClick={endTurn}
              disabled={!gameState.turnComplete}
              className="end-turn-btn"
            >
              End Turn & Draw Cards
            </PrimaryButton>
          </div>
        </div>
      </div>

      <div className="game-info">
        <div className="game-id">Game ID: {gameId}</div>
        <div>Cards in deck: {gameState.deck.length}</div>
        <div>
          Current player hand:{" "}
          {gameState.playerHands[gameState.currentPlayer]?.length || 0} cards
        </div>
        <div>
          Total cards played:{" "}
          {gameState.discardPiles.reduce((sum, pile) => sum + pile.length, 0)}/
          {gameState.totalCards ||
            getTotalCardCount(gameState.playerHands.length)}
        </div>
        <Button mini fullWidth onClick={openRulesModal}>
          Rules
        </Button>
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
        title={gameOverInfo?.title}
        message={gameOverInfo?.message}
        actionLabel="Start New Game"
        onAction={startNewGame}
        summaryItems={gameOverInfo?.summaryItems}
      />
      {showCantPlayConfirm && (
        <div
          className="cant-play-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="single-cant-play-title"
        >
          <div className="cant-play-modal">
            <h2 id="single-cant-play-title">End the game?</h2>
            <p>
              Confirm you have no legal moves available. Ending now will finish
              this run.
            </p>
            <div className="cant-play-actions">
              <InvertButton onClick={cancelCantPlayCard}>
                Keep playing
              </InvertButton>
              <Button onClick={confirmCantPlayCard}>Yes, end the game</Button>
            </div>
          </div>
        </div>
      )}

      <RulesModal isOpen={showRulesModal} onClose={closeRulesModal} />
    </div>
  );
};

export default Game;
