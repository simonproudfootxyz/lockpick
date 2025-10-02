// Game logic for Lockpick card game

// Calculate maximum card value based on player count (base 99 + 10 per player above 5)
export const getMaxCardValue = (numPlayers = 1) => {
  const extraPlayers = Math.max(0, numPlayers - 5);
  return 99 + extraPlayers * 10;
};

// Calculate total number of cards for a given player count
export const getTotalCardCount = (numPlayers = 1) => {
  return getMaxCardValue(numPlayers) - 1;
};

export const getDescendingStartValue = (numPlayers = 1) => {
  const maxCard = getMaxCardValue(numPlayers);
  return maxCard >= 100 ? maxCard + 1 : 100;
};

// Create a deck dynamically based on number of players
export const createDeck = (numPlayers = 1) => {
  const deck = [];
  const maxCard = getMaxCardValue(numPlayers);
  for (let i = 2; i <= maxCard; i++) {
    deck.push(i);
  }
  return shuffleDeck(deck);
};

// Shuffle deck using Fisher-Yates algorithm
export const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Determine hand size based on number of players
export const getHandSize = (numPlayers) => {
  if (numPlayers === 1) return 8;
  if (numPlayers === 2) return 7;
  if (numPlayers === 3) return 6;
  if (numPlayers === 4) return 6;
  if (numPlayers === 5) return 6;
  if (numPlayers === 6) return 5;
  if (numPlayers === 7) return 5;
  if (numPlayers === 8) return 5;
  if (numPlayers === 9) return 4;
  if (numPlayers >= 10) return 4;
  return 6;
};

// Check if a card can be played on a discard pile
export const canPlayCard = (card, pile, pileType) => {
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

// Check if a set of cards can be played on discard piles
export const canPlayCards = (cards, discardPiles) => {
  const validPlays = [];

  for (const card of cards) {
    let canPlay = false;
    let targetPile = -1;

    for (let i = 0; i < discardPiles.length; i++) {
      const pile = discardPiles[i];
      const pileType = i < 2 ? "ascending" : "descending"; // First two are ascending, last two are descending

      if (canPlayCard(card, pile, pileType)) {
        canPlay = true;
        targetPile = i;
        break;
      }
    }

    if (canPlay) {
      validPlays.push({ card, pileIndex: targetPile });
    }
  }

  return validPlays;
};

// Check if game is won (all cards played)
export const isGameWon = (discardPiles, totalCards, playerCount) => {
  const totalCardsPlayed = discardPiles.reduce(
    (sum, pile) => sum + pile.length,
    0
  );
  const target =
    totalCards !== undefined
      ? totalCards
      : getTotalCardCount(playerCount || discardPiles.length);
  return totalCardsPlayed === target;
};

// Check if a turn is valid (minimum 2 cards, or 1 if deck is empty)
export const isValidTurn = (cardsPlayed, deckEmpty) => {
  if (deckEmpty) {
    return cardsPlayed >= 1;
  }
  return cardsPlayed >= 2;
};

// Get game status message
export const getGameStatus = (gameState) => {
  const {
    playerHands,
    currentPlayer,
    discardPiles,
    deck,
    gameWon,
    cardsPlayedThisTurn,
    turnComplete,
    totalCards,
    maxCard,
    descendingStart,
  } = gameState;

  const playerCount = playerHands.length;
  const maxCards = totalCards || getTotalCardCount(playerCount);
  const highestCardValue = maxCard || getMaxCardValue(playerCount);
  const descendingStartValue =
    descendingStart || getDescendingStartValue(playerCount);

  if (gameWon) {
    return `Congratulations! Player ${
      currentPlayer + 1
    } won! All ${maxCards} cards have been played! (Max card ${highestCardValue}, descending starts at ${descendingStartValue})`;
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
