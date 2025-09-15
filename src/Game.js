import React, { useState, useEffect } from "react";
import {
  createDeck,
  getHandSize,
  canPlayCards,
  canPlayCard,
  isGameWon,
  isValidTurn,
  getGameStatus,
} from "./gameLogic";
import Card from "./Card";
import DiscardPile from "./DiscardPile";
import PlayerHand from "./PlayerHand";
import GameSetup from "./GameSetup";
import PileViewModal from "./PileViewModal";
import "./Game.css";

const Game = () => {
  const [gameState, setGameState] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedPile, setSelectedPile] = useState(null);
  const [showSetup, setShowSetup] = useState(true);
  const [numPlayers, setNumPlayers] = useState(1);
  const [viewingPile, setViewingPile] = useState(null);

  const initializeGame = (players) => {
    const deck = createDeck();
    const handSize = getHandSize(players);

    // Deal hands for all players
    const playerHands = [];
    for (let i = 0; i < players; i++) {
      playerHands.push(deck.splice(0, handSize));
    }

    setGameState({
      playerHands,
      currentPlayer: 0,
      discardPiles: [[], [], [], []], // Two ascending (1), two descending (100)
      deck,
      gameWon: false,
      cardsPlayedThisTurn: 0,
      turnComplete: false,
    });
    setShowSetup(false);
  };

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

    setGameState((prev) => ({
      ...prev,
      playerHands: newPlayerHands,
    }));
  };

  const sortHand = () => {
    const sortedHand = [...gameState.playerHands[gameState.currentPlayer]].sort(
      (a, b) => a - b
    );
    const newPlayerHands = [...gameState.playerHands];
    newPlayerHands[gameState.currentPlayer] = sortedHand;

    setGameState((prev) => ({
      ...prev,
      playerHands: newPlayerHands,
    }));
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

    setGameState((prev) => ({
      ...prev,
      playerHands: newPlayerHands,
      discardPiles: newDiscardPiles,
      cardsPlayedThisTurn: newCardsPlayedThisTurn,
      turnComplete: turnComplete,
      gameWon: isGameWon(newDiscardPiles),
    }));
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

    setGameState((prev) => ({
      ...prev,
      playerHands: newPlayerHands,
      currentPlayer: nextPlayer,
      cardsPlayedThisTurn: 0,
      turnComplete: false,
    }));

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

  const resetGame = () => {
    setGameState(null);
    setSelectedCard(null);
    setSelectedPile(null);
    setViewingPile(null);
    setShowSetup(true);
  };

  if (showSetup) {
    return (
      <GameSetup
        numPlayers={numPlayers}
        setNumPlayers={setNumPlayers}
        onStartGame={initializeGame}
      />
    );
  }

  if (!gameState) return null;

  const status = getGameStatus(gameState);

  return (
    <div className="game">
      <div className="game-header">
        <h1>Lockpick</h1>
        <button onClick={resetGame} className="new-game-btn">
          New Game
        </button>
        <div className="game-status">{status}</div>
        <div className="game-controls">
          {gameState.turnComplete && (
            <button onClick={endTurn} className="end-turn-btn">
              End Turn & Draw Cards
            </button>
          )}
        </div>
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
          onClick={playSelectedCard}
          disabled={!selectedCard || selectedPile === null}
          className="play-card-btn"
        >
          {selectedCard ? `Play card ${selectedCard}` : "Play a card"}
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
      </div>

      {viewingPile && (
        <PileViewModal
          pile={viewingPile.pile}
          pileType={viewingPile.pileType}
          pileNumber={viewingPile.pileNumber}
          onClose={closePileView}
        />
      )}
    </div>
  );
};

export default Game;
