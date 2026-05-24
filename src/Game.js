import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  createDeck,
  getHandSize,
  canPlayCard,
  isGameWon,
  getGameStatus,
  getTotalCardCount,
  getMaxCardValue,
  getDescendingStartValue,
  getCardPlayPoints,
  buildGameSummaryItems,
} from "./gameLogic";
import DiscardPile from "./DiscardPile";
import PlayerHand from "./PlayerHand";
import "./Game.css";
import Button, { PrimaryButton, TextButton } from "./components/Button";
import { useModal } from "./context/ModalContext";
import GameOverModalContent from "./components/modals/GameOverModalContent";
import PileViewModalContent from "./components/modals/PileViewModalContent";
import ConfirmModalContent from "./components/modals/ConfirmModalContent";
import Toggle from "./components/Toggle";
import GameHeader from "./components/GameHeader";
import GameInfo from "./components/GameInfo";
import LockpickLogo from "./assets/LockpickLogo.svg";
import BlockArrowUp from "./assets/BlockArrowUp.svg";
import BlockArrowDown from "./assets/BlockArrowDown.svg";
import ThinArrowUp from "./assets/ThinArrowUp.svg";
import ThinArrowDown from "./assets/ThinArrowDown.svg";
import useWindowSize from "./hooks/useWindowSize";

const Game = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { openModal } = useModal();
  const [gameState, setGameState] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedPile, setSelectedPile] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSortEnabled, setAutoSortEnabled] = useState(false);
  const [lastSortOrder, setLastSortOrder] = useState("asc");
  const [showKonamiToast, setShowKonamiToast] = useState(false);
  const konamiToastTimeoutRef = useRef(null);
  const gameOverModalShownRef = useRef(false);

  const normalizeGameState = (state) => {
    if (!state) {
      return null;
    }
    if (state.playerHand) {
      return state;
    }
    if (state.playerHands) {
      const { playerHands, currentPlayer, ...rest } = state;
      return {
        ...rest,
        playerHand: playerHands[currentPlayer ?? 0] ?? playerHands[0] ?? [],
      };
    }
    return state;
  };

  // Game state persistence functions
  const saveGameState = useCallback(
    (state) => {
      if (gameId && state) {
        const gameData = {
          gameState: state,
          gameId: gameId,
        };
        localStorage.setItem(
          `lockpick_game_${gameId}`,
          JSON.stringify(gameData),
        );
        setLastSaved(new Date());
      }
    },
    [gameId],
  );

  const loadGameState = useCallback(() => {
    if (!gameId) {
      return null;
    }
    try {
      const savedData = localStorage.getItem(`lockpick_game_${gameId}`);
      if (savedData) {
        const gameData = JSON.parse(savedData);
        if (gameData.gameId === gameId) {
          return normalizeGameState(gameData.gameState);
        }
      }
    } catch (error) {
      console.error("Error loading game state:", error);
    }
    return null;
  }, [gameId]);

  const clearGameState = () => {
    if (gameId) {
      localStorage.removeItem(`lockpick_game_${gameId}`);
    }
  };

  useEffect(() => {
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
          setGameState((prev) => {
            if (!prev || prev.isKonamiMode) {
              return prev;
            }
            const nextState = { ...prev, isKonamiMode: true };
            saveGameState(nextState);
            return nextState;
          });
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
      setShowKonamiToast(false);
      if (konamiToastTimeoutRef.current) {
        clearTimeout(konamiToastTimeoutRef.current);
        konamiToastTimeoutRef.current = null;
      }
    };
  }, [saveGameState]);

  const initializeGame = useCallback(() => {
    const deck = createDeck(1);
    const handSize = getHandSize(1);
    const totalCards = getTotalCardCount(1);
    const maxCard = getMaxCardValue(1);
    const descendingStart = getDescendingStartValue(1);

    const newGameState = {
      playerHand: deck.splice(0, handSize),

      discardPiles: [[], [], [], []], // Two ascending (1), two descending (100)
      deck,
      gameWon: false,
      gameFinished: false,
      cardsPlayedThisTurn: 0,
      turnComplete: false,
      totalCards,
      maxCard,
      descendingStart,
      totalTurns: 0,
      gameScore: 0,
      isKonamiMode: false,
    };

    setGameState(newGameState);
    saveGameState(newGameState);
  }, [saveGameState]);

  // Initialize game when component mounts
  useEffect(() => {
    if (!gameState && gameId) {
      // Try to load saved game state first
      const savedState = loadGameState();
      if (savedState) {
        setGameState(savedState);
      } else {
        // No saved state found, initialize new game
        initializeGame();
      }
    }
  }, [gameId, gameState, loadGameState, initializeGame]);

  const buildGameSummary = useCallback(
    (state) => buildGameSummaryItems(state),
    [],
  );

  const exitFinishedGame = useCallback(() => {
    clearGameState();
    gameOverModalShownRef.current = false;
    setAutoSortEnabled(false);
    setLastSortOrder("asc");
    setShowKonamiToast(false);
    if (konamiToastTimeoutRef.current) {
      clearTimeout(konamiToastTimeoutRef.current);
      konamiToastTimeoutRef.current = null;
    }
    navigate("/");
  }, [navigate]);

  useEffect(() => {
    const isGameOver = !!(gameState?.gameWon || gameState?.gameFinished);

    if (!isGameOver) {
      gameOverModalShownRef.current = false;
      return;
    }

    if (gameOverModalShownRef.current) {
      return;
    }

    gameOverModalShownRef.current = true;

    const totalCards =
      typeof gameState.totalCards === "number"
        ? gameState.totalCards
        : getTotalCardCount(1);

    const title = gameState.gameWon ? "Congratulations!" : "Game Over!";
    const message = gameState.gameWon
      ? `Congratulations, you won! All ${totalCards} cards have been played! Great job!`
      : "No more moves are available. Start a new game to try again!";

    openModal({
      title,
      size: "sm",
      onClose: exitFinishedGame,
      content: ({ close }) => (
        <GameOverModalContent
          message={message}
          summaryItems={buildGameSummary(gameState)}
          actionLabel="Back to Home"
          close={close}
        />
      ),
    });
  }, [gameState, buildGameSummary, openModal, exitFinishedGame]);

  const handleCardSelect = (card) => {
    if (gameState.gameWon) return;

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
        allowMultiplesOfTenReverse: !!gameState.isKonamiMode,
      })
    ) {
      alert(`Card ${cardValue} cannot be played on this ${pileType} pile!`);
      return;
    }

    // Play the card
    const newDiscardPiles = [...gameState.discardPiles];
    const newPlayerHand = [...gameState.playerHand];

    newDiscardPiles[pileIndex].push(cardValue);
    const cardIndex = newPlayerHand.indexOf(cardValue);
    if (cardIndex > -1) {
      newPlayerHand.splice(cardIndex, 1);
    }

    // Clear selection
    setSelectedCard(null);
    setSelectedPile(null);

    // Update cards played this turn
    const newCardsPlayedThisTurn = gameState.cardsPlayedThisTurn + 1;
    const deckEmpty = gameState.deck.length === 0;
    const minCardsRequired = deckEmpty ? 1 : 2;
    const turnComplete = newCardsPlayedThisTurn >= minCardsRequired;

    const gameWonNow = isGameWon(newDiscardPiles, gameState.totalCards, 1);
    const pointsEarned = getCardPlayPoints(
      cardValue,
      pile,
      pileType,
      gameState.isKonamiMode,
    );
    const currentTotalTurns = gameState.totalTurns ?? 0;

    const newGameState = {
      ...gameState,
      playerHand: newPlayerHand,
      discardPiles: newDiscardPiles,
      cardsPlayedThisTurn: newCardsPlayedThisTurn,
      turnComplete: turnComplete,
      gameWon: gameWonNow,
      gameFinished: gameWonNow ? true : gameState.gameFinished,
      gameScore: (gameState.gameScore ?? 0) + pointsEarned,
      totalTurns: gameWonNow ? currentTotalTurns + 1 : currentTotalTurns,
    };

    setGameState(newGameState);
    saveGameState(newGameState);
  };

  const handleCardDrop = (cardValue, pileIndex) => {
    handlePlayCard(pileIndex, cardValue);
  };

  const handleHandReorder = (newHand) => {
    const newGameState = {
      ...gameState,
      playerHand: newHand,
    };

    setGameState(newGameState);
    saveGameState(newGameState);
  };

  const updateSortedHand = (order, shouldPersistOrder = false) => {
    const comparator = order === "desc" ? (a, b) => b - a : (a, b) => a - b;
    const sortedHand = [...gameState.playerHand].sort(comparator);

    const newGameState = {
      ...gameState,
      playerHand: sortedHand,
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

    // Refill hand to hand size
    const handSize = getHandSize(1);
    const currentHand = [...gameState.playerHand];
    const cardsNeeded = handSize - currentHand.length;
    const cardsToDraw = Math.min(cardsNeeded, gameState.deck.length);

    let updatedHand = currentHand;
    if (cardsToDraw > 0) {
      const newCards = gameState.deck.splice(0, cardsToDraw);
      updatedHand = [...currentHand, ...newCards];
      if (autoSortEnabled) {
        const comparator =
          lastSortOrder === "desc" ? (a, b) => b - a : (a, b) => a - b;
        updatedHand = updatedHand.sort(comparator);
      }
    }

    const newGameState = {
      ...gameState,
      playerHand: updatedHand,
      cardsPlayedThisTurn: 0,
      turnComplete: false,
      totalTurns: (gameState.totalTurns ?? 0) + 1,
    };

    setGameState(newGameState);
    saveGameState(newGameState);

    setSelectedCard(null);
    setSelectedPile(null);
  };

  const handleViewPile = (pile, pileType, pileNumber) => {
    const typeLabel = pileType === "ascending" ? "Ascending" : "Descending";
    openModal({
      title: `${typeLabel} Pile ${pileNumber}`,
      size: "lg",
      content: <PileViewModalContent pile={pile} />,
    });
  };

  const confirmCantPlayCard = () => {
    if (!gameState || gameState.gameFinished) {
      return;
    }

    const endedState = {
      ...gameState,
      gameFinished: true,
      totalTurns: (gameState.totalTurns ?? 0) + 1,
    };

    setGameState(endedState);
    saveGameState(endedState);
  };

  const handleCantPlayClick = () => {
    if (gameState?.gameOver) return;
    openModal({
      title: "End the game?",
      size: "sm",
      content: ({ close }) => (
        <ConfirmModalContent
          message="Confirm you have no legal moves available. Ending now will finish this run."
          confirmLabel="Yes, end the game"
          cancelLabel="Keep playing"
          onConfirm={() => {
            close();
            confirmCantPlayCard();
          }}
        />
      ),
    });
  };

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
      <div className="game-layout">
        <div className="game-sidebar">
          <GameInfo gameState={gameState} />
        </div>
        <div className="game-main">
          <GameHeader />

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
              <div className="player current">
                <p className="player__instructions hidden--tablet-down">
                  Drag cards to a pile, or select a card & click “play”
                </p>
                <p className="player__instructions visible--tablet-down">
                  Select a card & tap “play” on the intended pile.
                </p>

                <PlayerHand
                  hand={gameState.playerHand}
                  selectedCard={selectedCard}
                  onCardSelect={handleCardSelect}
                  onHandReorder={handleHandReorder}
                  isCurrentPlayer
                  discardPiles={gameState.discardPiles}
                  allowMultiplesOfTenReverse={!!gameState.isKonamiMode}
                  disabled={gameState.gameFinished}
                />
                <div className="sort-controls">
                  <Toggle
                    className="auto-sort-toggle"
                    label="Auto-Sort"
                    checked={autoSortEnabled}
                    onChange={handleAutoSortToggle}
                  />
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
              </div>
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
        </div>
      </div>
    </div>
  );
};

export default Game;
