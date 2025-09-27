// Server-side game logic for Lockpick card game

// Create a deck of 98 cards (numbers 2-99)
const createDeck = () => {
  const deck = [];
  for (let i = 2; i <= 99; i++) {
    deck.push(i);
  }
  return shuffleDeck(deck);
};

// Shuffle deck using Fisher-Yates algorithm
const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Determine hand size based on number of players
const getHandSize = (numPlayers) => {
  if (numPlayers === 1) return 8;
  if (numPlayers === 2) return 7;
  if (numPlayers >= 3 && numPlayers <= 5) return 6;
  return 6; // Default for any edge cases
};

// Check if a card can be played on a discard pile
const canPlayCard = (card, pile, pileType) => {
  if (pile.length === 0) {
    // Empty pile - can play any card
    return true;
  }

  const topCard = pile[pile.length - 1];

  if (pileType === "ascending") {
    // Ascending pile - card must be higher than top card
    // OR exactly 10 less than top card (reverse order exception)
    return card > topCard || card === topCard - 10;
  } else {
    // Descending pile - card must be lower than top card
    // OR exactly 10 greater than top card (reverse order exception)
    return card < topCard || card === topCard + 10;
  }
};

// Check if game is won (all 98 cards played)
const isGameWon = (discardPiles) => {
  const totalCardsPlayed = discardPiles.reduce(
    (sum, pile) => sum + pile.length,
    0
  );
  return totalCardsPlayed === 98;
};

// Get game status message
const getGameStatus = (gameState) => {
  const {
    playerHands,
    currentPlayer,
    discardPiles,
    deck,
    gameWon,
    cardsPlayedThisTurn,
    turnComplete,
  } = gameState;

  if (gameWon) {
    return `Congratulations! Player ${
      currentPlayer + 1
    } won! All 98 cards have been played!`;
  }

  const currentHand = playerHands[currentPlayer];
  const cardsInHand = currentHand.length;
  const cardsInDeck = deck.length;
  const minCardsRequired = cardsInDeck === 0 ? 1 : 2;
  const cardsRemaining = Math.max(0, minCardsRequired - cardsPlayedThisTurn);

  if (turnComplete) {
    return `Player ${
      currentPlayer + 1
    }'s turn complete! End turn to draw new cards. (${cardsInHand} cards in hand, ${cardsInDeck} cards in deck)`;
  }

  return `Player ${
    currentPlayer + 1
  }'s turn - Play ${cardsRemaining} more card${
    cardsRemaining === 1 ? "" : "s"
  } to complete your turn (${cardsInHand} cards in hand, ${cardsInDeck} cards in deck)`;
};

// Initialize a new game
const initializeGame = (numPlayers) => {
  const deck = createDeck();
  const handSize = getHandSize(numPlayers);

  // Deal hands for all players
  const playerHands = [];
  for (let i = 0; i < numPlayers; i++) {
    playerHands.push(deck.splice(0, handSize));
  }

  return {
    playerHands,
    currentPlayer: 0,
    discardPiles: [[], [], [], []], // Two ascending (1), two descending (100)
    deck,
    gameWon: false,
    cardsPlayedThisTurn: 0,
    turnComplete: false,
    gameStarted: true,
    createdAt: Date.now(),
  };
};

// Play a card on a specific pile
const playCard = (gameState, card, pileIndex) => {
  const pile = gameState.discardPiles[pileIndex];
  const pileType = pileIndex < 2 ? "ascending" : "descending";

  // Validate card can be played
  if (!canPlayCard(card, pile, pileType)) {
    return {
      success: false,
      error: `Card ${card} cannot be played on this ${pileType} pile`,
    };
  }

  // Create new game state
  const newGameState = { ...gameState };
  const newDiscardPiles = [...newGameState.discardPiles];
  const newPlayerHands = [...newGameState.playerHands];

  // Add card to pile
  newDiscardPiles[pileIndex].push(card);

  // Remove card from player's hand
  const cardIndex = newPlayerHands[newGameState.currentPlayer].indexOf(card);
  if (cardIndex > -1) {
    newPlayerHands[newGameState.currentPlayer].splice(cardIndex, 1);
  }

  // Update game state
  newGameState.discardPiles = newDiscardPiles;
  newGameState.playerHands = newPlayerHands;
  newGameState.cardsPlayedThisTurn += 1;

  // Check if turn is complete
  const deckEmpty = newGameState.deck.length === 0;
  const minCardsRequired = deckEmpty ? 1 : 2;
  newGameState.turnComplete =
    newGameState.cardsPlayedThisTurn >= minCardsRequired;

  // Check if game is won
  newGameState.gameWon = isGameWon(newDiscardPiles);

  return { success: true, gameState: newGameState };
};

// End current player's turn
const endTurn = (gameState) => {
  const deckEmpty = gameState.deck.length === 0;
  const minCardsRequired = deckEmpty ? 1 : 2;

  if (gameState.cardsPlayedThisTurn < minCardsRequired) {
    return {
      success: false,
      error: `You must play at least ${minCardsRequired} cards this turn`,
    };
  }

  const newGameState = { ...gameState };
  const handSize = getHandSize(newGameState.playerHands.length);
  const currentHand = newGameState.playerHands[newGameState.currentPlayer];
  const cardsNeeded = handSize - currentHand.length;
  const cardsToDraw = Math.min(cardsNeeded, newGameState.deck.length);

  // Draw new cards for current player
  if (cardsToDraw > 0) {
    const newCards = newGameState.deck.splice(0, cardsToDraw);
    newGameState.playerHands[newGameState.currentPlayer] = [
      ...currentHand,
      ...newCards,
    ];
  }

  // Move to next player
  newGameState.currentPlayer =
    (newGameState.currentPlayer + 1) % newGameState.playerHands.length;
  newGameState.cardsPlayedThisTurn = 0;
  newGameState.turnComplete = false;

  return { success: true, gameState: newGameState };
};

// Handle "can't play" scenario
const handleCantPlay = (gameState) => {
  // This would typically end the game or have special rules
  // For now, we'll just return the current state
  return { success: true, gameState };
};

module.exports = {
  createDeck,
  shuffleDeck,
  getHandSize,
  canPlayCard,
  isGameWon,
  getGameStatus,
  initializeGame,
  playCard,
  endTurn,
  handleCantPlay,
};
