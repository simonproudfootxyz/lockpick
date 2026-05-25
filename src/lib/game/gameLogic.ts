import type { GameState } from "./gameTypes";

export const getMaxCardValue = (numPlayers = 1) => {
  const extraPlayers = Math.max(0, numPlayers - 5);
  return 99 + extraPlayers * 10;
};

export const getTotalCardCount = (numPlayers = 1) =>
  getMaxCardValue(numPlayers) - 1;

export const getDescendingStartValue = (numPlayers = 1) => {
  const maxCard = getMaxCardValue(numPlayers);
  return maxCard >= 100 ? maxCard + 1 : 100;
};

export const shuffleDeck = (deck: number[]) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const createDeck = (numPlayers = 1) => {
  const deck: number[] = [];
  const maxCard = getMaxCardValue(numPlayers);
  for (let i = 2; i <= maxCard; i++) {
    deck.push(i);
  }
  return shuffleDeck(deck);
};

export const getHandSize = (numPlayers: number) => {
  if (numPlayers === 1) return 8;
  if (numPlayers === 2) return 7;
  if (numPlayers <= 5) return 6;
  if (numPlayers >= 6) return 5;
  return 6;
};

export const canPlayCard = (
  card: number,
  pile: number[],
  pileType: "ascending" | "descending",
  options: { allowMultiplesOfTenReverse?: boolean } = {},
) => {
  const { allowMultiplesOfTenReverse = false } = options;

  if (pile.length === 0) return true;

  const topCard = pile[pile.length - 1];

  if (pileType === "ascending") {
    if (card > topCard) return true;
    if (allowMultiplesOfTenReverse && card < topCard) {
      return (topCard - card) % 10 === 0;
    }
    return card === topCard - 10;
  }

  if (card < topCard) return true;
  if (allowMultiplesOfTenReverse && card > topCard) {
    return (card - topCard) % 10 === 0;
  }
  return card === topCard + 10;
};

export const isGameWon = (
  discardPiles: number[][],
  totalCards?: number,
  playerCount = 1,
) => {
  const totalCardsPlayed = discardPiles.reduce(
    (sum, pile) => sum + pile.length,
    0,
  );
  const target = totalCards ?? getTotalCardCount(playerCount);
  return totalCardsPlayed === target;
};

export const CARD_PLAY_POINTS = 5;
export const BACKTRACK_PLAY_POINTS = 8;

export const isBacktrackPlay = (
  card: number,
  pile: number[],
  pileType: "ascending" | "descending",
  isKonamiMode = false,
) => {
  if (!pile || pile.length === 0 || isKonamiMode) return false;
  const topCard = pile[pile.length - 2];
  if (topCard === undefined) return false;
  if (pileType === "ascending") return card === topCard - 10;
  return card === topCard + 10;
};

export const getCardPlayPoints = (
  card: number,
  pile: number[],
  pileType: "ascending" | "descending",
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

export const buildGameSummaryItems = (state: GameState | null) => {
  if (!state) return [];

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

export const isValidTurn = (cardsPlayed: number, deckEmpty: boolean) => {
  if (deckEmpty) return cardsPlayed >= 1;
  return cardsPlayed >= 2;
};

export const getGameStatus = (gameState: GameState) => {
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

export const buildNewGameState = (): GameState => {
  const deck = createDeck(1);
  const handSize = getHandSize(1);
  const totalCards = getTotalCardCount(1);
  const maxCard = getMaxCardValue(1);
  const descendingStart = getDescendingStartValue(1);

  return {
    playerHand: deck.splice(0, handSize),
    discardPiles: [[], [], [], []],
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
    startedAt: Date.now(),
  };
};
