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
  if (numPlayers <= 5) return 6;
  if (numPlayers >= 6) return 5;
  return 6;
};

// Check if a card can be played on a discard pile
export const canPlayCard = (card, pile, pileType, options = {}) => {
  const { allowMultiplesOfTenReverse = false } = options;

  if (pile.length === 0) {
    // Empty pile - can play any card
    return true;
  }

  const topCard = pile[pile.length - 1];

  if (pileType === "ascending") {
    // Ascending pile - card must be higher than top card
    // OR exactly 10 less than top card (reverse order exception)
    if (card > topCard) {
      return true;
    }

    if (allowMultiplesOfTenReverse && card < topCard) {
      return (topCard - card) % 10 === 0;
    }

    return card === topCard - 10;
  } else {
    // Descending pile - card must be lower than top card
    // OR exactly 10 greater than top card (reverse order exception)
    if (card < topCard) {
      return true;
    }

    if (allowMultiplesOfTenReverse && card > topCard) {
      return (card - topCard) % 10 === 0;
    }

    return card === topCard + 10;
  }
};

// Check if a set of cards can be played on discard piles
export const canPlayCards = (cards, discardPiles, options = {}) => {
  const validPlays = [];

  for (const card of cards) {
    let canPlay = false;
    let targetPile = -1;

    for (let i = 0; i < discardPiles.length; i++) {
      const pile = discardPiles[i];
      const pileType = i < 2 ? "ascending" : "descending"; // First two are ascending, last two are descending

      if (canPlayCard(card, pile, pileType, options)) {
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
    0,
  );
  const target =
    totalCards !== undefined
      ? totalCards
      : getTotalCardCount(playerCount || discardPiles.length);
  return totalCardsPlayed === target;
};

export const CARD_PLAY_POINTS = 5;
export const BACKTRACK_PLAY_POINTS = 8;

export const isBacktrackPlay = (card, pile, pileType, isKonamiMode = false) => {
  if (!pile || pile.length === 0 || isKonamiMode) {
    return false;
  }

  const topCard = pile[pile.length - 2];

  if (pileType === "ascending") {
    return card === topCard - 10;
  }

  return card === topCard + 10;
};

export const getCardPlayPoints = (
  card,
  pile,
  pileType,
  isKonamiMode = false,
) =>
  isBacktrackPlay(card, pile, pileType, isKonamiMode)
    ? BACKTRACK_PLAY_POINTS
    : CARD_PLAY_POINTS;

export const calculateFinalScore = (
  gameScore = 0,
  totalCards = 98,
  totalCardsPlayed = 0,
  totalTurns = 0,
) => gameScore * (totalCards + totalCardsPlayed - totalTurns);

export const buildGameSummaryItems = (state) => {
  if (!state) {
    return [];
  }

  const deckCount = Array.isArray(state.deck) ? state.deck.length : 0;
  const totalCardsPlayed = Array.isArray(state.discardPiles)
    ? state.discardPiles.reduce((sum, pile) => sum + pile.length, 0)
    : 0;
  const totalTurns = state.totalTurns ?? 0;
  const totalCards = state.totalCards ?? 98;
  const gameScore = state.gameScore ?? 0;
  const finalScore = calculateFinalScore(
    gameScore,
    totalCards,
    totalCardsPlayed,
    totalTurns,
  );

  return [
    { label: "Total cards played", value: totalCardsPlayed },
    { label: "Cards remaining in deck", value: deckCount },
    { label: "Total turns", value: totalTurns },
    { label: "Points scored", value: gameScore },
    { label: "Final score", value: finalScore },
  ];
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
    playerHand,
    deck,
    gameWon,
    cardsPlayedThisTurn,
    turnComplete,
    totalCards,
    maxCard,
    descendingStart,
  } = gameState;

  const maxCards = totalCards || getTotalCardCount(1);
  const highestCardValue = maxCard || getMaxCardValue(1);
  const descendingStartValue = descendingStart || getDescendingStartValue(1);

  if (gameWon) {
    return `Congratulations! You won! All ${maxCards} cards have been played! (Max card ${highestCardValue}, descending starts at ${descendingStartValue})`;
  }

  const cardsInHand = playerHand.length;
  const cardsInDeck = deck.length;
  const minCardsRequired = cardsInDeck === 0 ? 1 : 2;
  const cardsRemaining = Math.max(0, minCardsRequired - cardsPlayedThisTurn);

  if (turnComplete) {
    return `Turn complete! End turn to draw new cards. (${cardsInHand} cards in hand, ${cardsInDeck} cards in deck)`;
  }

  return `Your turn - Play ${cardsRemaining} more card${
    cardsRemaining === 1 ? "" : "s"
  } to complete your turn (${cardsInHand} cards in hand, ${cardsInDeck} cards in deck)`;
};
