// Game logic for Lockpick card game

// Create a deck of 98 cards (numbers 2-99)
export const createDeck = () => {
  const deck = [];
  for (let i = 2; i <= 99; i++) {
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
  if (numPlayers >= 3 && numPlayers <= 5) return 6;
  return 6; // Default for any edge cases
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

// Check if game is won (all 98 cards played)
export const isGameWon = (discardPiles) => {
  const totalCardsPlayed = discardPiles.reduce(
    (sum, pile) => sum + pile.length,
    0
  );
  return totalCardsPlayed === 98;
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
