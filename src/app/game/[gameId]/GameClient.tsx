"use client";

import { useReducer, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  canPlayCard,
  getTotalCardCount,
  buildGameSummaryItems,
} from "@/lib/game/gameLogic";
import { gameReducer } from "@/lib/game/gameReducer";
import type { FinishGameResult, GameState } from "@/lib/game/gameTypes";
import DiscardPile from "@/components/DiscardPile";
import PlayerHand from "@/components/PlayerHand";
import "@/Game.css";
import Button, { PrimaryButton, TextButton } from "@/components/Button";
import { useModal } from "@/context/ModalContext";
import GameOverModalContent from "@/components/modals/GameOverModalContent";
import PileViewModalContent from "@/components/modals/PileViewModalContent";
import ConfirmModalContent from "@/components/modals/ConfirmModalContent";
import Toggle from "@/components/Toggle";
import GameHeader from "@/components/GameHeader";
import GameInfo from "@/components/GameInfo";
import BlockArrowUp from "@/assets/BlockArrowUp.svg";
import BlockArrowDown from "@/assets/BlockArrowDown.svg";
import ThinArrowUp from "@/assets/ThinArrowUp.svg";
import ThinArrowDown from "@/assets/ThinArrowDown.svg";
import {
  finishGame,
  saveGameState,
  saveKonamiMode,
  submitGuestLeaderboardName,
} from "@/actions/game";

type GameClientProps = {
  gameId: string;
  initialState: GameState;
};

function GuestLeaderboardForm({
  gameId,
  onComplete,
}: {
  gameId: string;
  onComplete: (result: FinishGameResult) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await submitGuestLeaderboardName(gameId, name);
      onComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit name");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="guest-leaderboard-form">
      <p>You made the top 100! Enter a display name for the leaderboard.</p>
      <label htmlFor="display-name">Display name</label>
      <input
        id="display-name"
        type="text"
        maxLength={30}
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={submitting}
      />
      {error && <p className="error">{error}</p>}
      <Button type="submit" disabled={submitting || !name.trim()}>
        {submitting ? "Submitting..." : "Save to leaderboard"}
      </Button>
    </form>
  );
}

export default function GameClient({ gameId, initialState }: GameClientProps) {
  const router = useRouter();
  const { openModal } = useModal();
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [selectedPile, setSelectedPile] = useState<number | null>(null);
  const [autoSortEnabled, setAutoSortEnabled] = useState(false);
  const [lastSortOrder, setLastSortOrder] = useState<"asc" | "desc">("asc");
  const [showKonamiToast, setShowKonamiToast] = useState(false);
  const konamiToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const gameOverModalShownRef = useRef(false);
  const finishResultRef = useRef<FinishGameResult | null>(null);

  const persistState = useCallback(
    async (state: GameState) => {
      await saveGameState(gameId, state);
    },
    [gameId],
  );

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

    const handleKeyDown = (event: KeyboardEvent) => {
      const expectedKey = konamiSequence[sequenceIndex];
      if (event.code === expectedKey) {
        sequenceIndex += 1;
        if (sequenceIndex === konamiSequence.length) {
          dispatch({ type: "SET_KONAMI_MODE", enabled: true });
          void saveKonamiMode(gameId).then((result) => {
            if (result.state) {
              dispatch({ type: "HYDRATE", state: result.state });
            }
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
      if (konamiToastTimeoutRef.current) {
        clearTimeout(konamiToastTimeoutRef.current);
      }
    };
  }, [gameId]);

  const exitFinishedGame = useCallback(() => {
    gameOverModalShownRef.current = false;
    finishResultRef.current = null;
    router.push("/");
  }, [router]);

  const showGameOverModal = useCallback(
    (result: FinishGameResult) => {
      const title = gameState.gameWon ? "Congratulations!" : "Game Over!";
      const totalCards = gameState.totalCards ?? getTotalCardCount(1);
      const message = gameState.gameWon
        ? `Congratulations, you won! All ${totalCards} cards have been played! Great job!`
        : "No more moves are available. Start a new game to try again!";

      const renderContent = (finishResult: FinishGameResult) =>
        ({ close }: { close?: () => void }) => (
          <GameOverModalContent
            message={message}
            summaryItems={buildGameSummaryItems(gameState)}
            actionLabel="Back to Home"
            close={close}
            onAction={exitFinishedGame}
            showLeaderboardLink={
              finishResult.qualified && !finishResult.needsDisplayName
            }
            guestNameForm={
              finishResult.needsDisplayName ? (
                <GuestLeaderboardForm
                  gameId={gameId}
                  onComplete={(guestResult) => {
                    finishResultRef.current = guestResult;
                    openModal({
                      title,
                      size: "sm",
                      onClose: exitFinishedGame,
                      content: renderContent(guestResult),
                    });
                  }}
                />
              ) : undefined
            }
          />
        );

      openModal({
        title,
        size: "sm",
        onClose: exitFinishedGame,
        content: renderContent(result),
      });
    },
    [gameState, exitFinishedGame, gameId, openModal],
  );

  useEffect(() => {
    const isGameOver = !!(gameState.gameWon || gameState.gameFinished);
    if (!isGameOver) {
      gameOverModalShownRef.current = false;
      return;
    }
    if (gameOverModalShownRef.current) return;

    gameOverModalShownRef.current = true;
    void finishGame(gameId, gameState).then((result) => {
      finishResultRef.current = result;
      showGameOverModal(result);
    });
  }, [gameState, gameId, showGameOverModal]);

  const handleCardSelect = (card: number) => {
    if (gameState.gameWon || gameState.gameFinished) return;
    if (selectedCard === card) {
      setSelectedCard(null);
      setSelectedPile(null);
    } else {
      setSelectedCard(card);
      setSelectedPile(null);
    }
  };

  const handlePlayCard = async (pileIndex: number, cardValue = selectedCard) => {
    if (cardValue === null || cardValue === undefined) return;

    const pile = gameState.discardPiles[pileIndex];
    const pileType = pileIndex < 2 ? "ascending" : "descending";

    if (
      !canPlayCard(cardValue, pile, pileType, {
        allowMultiplesOfTenReverse: gameState.isKonamiMode,
      })
    ) {
      alert(`Card ${cardValue} cannot be played on this ${pileType} pile!`);
      return;
    }

    const nextState = gameReducer(gameState, {
      type: "PLAY_CARD",
      card: cardValue,
      pileIndex,
    });

    dispatch({ type: "PLAY_CARD", card: cardValue, pileIndex });
    setSelectedCard(null);
    setSelectedPile(null);

    if (nextState.gameFinished || nextState.gameWon) {
      return;
    }
    await persistState(nextState);
  };

  const handleHandReorder = async (newHand: number[]) => {
    dispatch({ type: "REORDER_HAND", hand: newHand });
    await persistState({ ...gameState, playerHand: newHand });
  };

  const updateSortedHand = async (
    order: "asc" | "desc",
    shouldPersistOrder = false,
  ) => {
    dispatch({ type: "SORT_HAND", order });
    const comparator =
      order === "desc"
        ? (a: number, b: number) => b - a
        : (a: number, b: number) => a - b;
    const sortedHand = [...gameState.playerHand].sort(comparator);
    if (shouldPersistOrder) {
      setLastSortOrder(order);
    }
    await persistState({ ...gameState, playerHand: sortedHand });
  };

  const endTurn = async () => {
    const deckEmpty = gameState.deck.length === 0;
    const minCardsRequired = deckEmpty ? 1 : 2;
    if (gameState.cardsPlayedThisTurn < minCardsRequired) {
      alert(`You must play at least ${minCardsRequired} cards this turn!`);
      return;
    }

    const nextState = gameReducer(gameState, {
      type: "END_TURN",
      autoSortEnabled,
      lastSortOrder,
    });
    dispatch({ type: "END_TURN", autoSortEnabled, lastSortOrder });
    setSelectedCard(null);
    setSelectedPile(null);
    await persistState(nextState);
  };

  const confirmCantPlayCard = async () => {
    if (!gameState || gameState.gameFinished) return;
    const nextState = gameReducer(gameState, { type: "CANT_PLAY" });
    dispatch({ type: "CANT_PLAY" });
    await persistState(nextState);
  };

  const handleViewPile = (
    pile: number[],
    pileType: "ascending" | "descending",
    pileNumber: number,
  ) => {
    const typeLabel = pileType === "ascending" ? "Ascending" : "Descending";
    openModal({
      title: `${typeLabel} Pile ${pileNumber}`,
      size: "lg",
      content: <PileViewModalContent pile={pile} />,
    });
  };

  const handleCantPlayClick = () => {
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
            void confirmCantPlayCard();
          }}
        />
      ),
    });
  };

  const descendingStart =
    gameState.descendingStart ||
    (gameState.maxCard && gameState.maxCard > 100
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
                <img src={BlockArrowUp.src} alt="Ascending Pile" />
                Ascending
              </h3>
              <div className="piles-row">
                {[0, 1].map((index) => (
                  <DiscardPile
                    key={index}
                    pile={gameState.discardPiles[index]}
                    pileType="ascending"
                    pileNumber={index + 1}
                    maxCard={descendingStart}
                    onViewPile={handleViewPile}
                    onSelectPile={setSelectedPile}
                    onPlayCard={handlePlayCard}
                    isSelected={selectedPile === index}
                    isSelectable={!!selectedCard}
                    onCardDrop={(card, pileIndex) =>
                      void handlePlayCard(pileIndex, card)
                    }
                  />
                ))}
              </div>
            </div>
            <div className="pile-separator visible--tablet-down" />
            <div className="pile-group">
              <h3 className="pile-group__title">
                <img src={BlockArrowDown.src} alt="Descending Pile" />
                Descending
              </h3>
              <div className="piles-row">
                {[2, 3].map((index) => (
                  <DiscardPile
                    key={index}
                    pile={gameState.discardPiles[index]}
                    pileType="descending"
                    pileNumber={index + 1}
                    maxCard={descendingStart}
                    onViewPile={handleViewPile}
                    onSelectPile={setSelectedPile}
                    onPlayCard={handlePlayCard}
                    isSelected={selectedPile === index}
                    isSelectable={!!selectedCard}
                    onCardDrop={(card, pileIndex) =>
                      void handlePlayCard(pileIndex, card)
                    }
                  />
                ))}
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
                  allowMultiplesOfTenReverse={gameState.isKonamiMode}
                  disabled={gameState.gameFinished}
                />
                <div className="sort-controls">
                  <Toggle
                    className="auto-sort-toggle"
                    label="Auto-Sort"
                    checked={autoSortEnabled}
                    onChange={(e) => setAutoSortEnabled(e.target.checked)}
                  />
                  <div className="sort-buttons">
                    <TextButton
                      onClick={() => void updateSortedHand("asc", true)}
                      mini
                      className="sort-hand-btn"
                    >
                      <img
                        className="sort-hand-btn__icon"
                        src={ThinArrowUp.src}
                        alt="Sort Ascending"
                      />
                      Sort Asc
                      <span className="hidden--tablet-down">ending</span>
                    </TextButton>
                    <TextButton
                      onClick={() => void updateSortedHand("desc", true)}
                      mini
                      className="sort-hand-btn"
                    >
                      <img
                        className="sort-hand-btn__icon"
                        src={ThinArrowDown.src}
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
                  I Can&apos;t Play A Card
                </Button>
                <PrimaryButton
                  onClick={() => void endTurn()}
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
}
