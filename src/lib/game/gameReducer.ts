import {
  canPlayCard,
  getCardPlayPoints,
  getHandSize,
  isGameWon,
  isValidTurn,
} from "./gameLogic";
import type { GameAction, GameState } from "./gameTypes";

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;

    case "SELECT_CARD":
    case "SELECT_PILE":
      return state;

    case "PLAY_CARD": {
      if (state.gameFinished || state.gameWon) return state;

      const { card, pileIndex } = action;
      const pile = state.discardPiles[pileIndex];
      const pileType = pileIndex < 2 ? "ascending" : "descending";

      if (
        !canPlayCard(card, pile, pileType, {
          allowMultiplesOfTenReverse: state.isKonamiMode,
        })
      ) {
        return state;
      }

      const newDiscardPiles = state.discardPiles.map((p, i) =>
        i === pileIndex ? [...p, card] : [...p],
      );
      const newPlayerHand = state.playerHand.filter((c) => c !== card);
      const newCardsPlayedThisTurn = state.cardsPlayedThisTurn + 1;
      const deckEmpty = state.deck.length === 0;
      const turnComplete = isValidTurn(newCardsPlayedThisTurn, deckEmpty);
      const gameWonNow = isGameWon(newDiscardPiles, state.totalCards, 1);
      const pointsEarned = getCardPlayPoints(
        card,
        pile,
        pileType,
        state.isKonamiMode,
      );

      return {
        ...state,
        playerHand: newPlayerHand,
        discardPiles: newDiscardPiles,
        cardsPlayedThisTurn: newCardsPlayedThisTurn,
        turnComplete,
        gameWon: gameWonNow,
        gameFinished: gameWonNow ? true : state.gameFinished,
        gameScore: state.gameScore + pointsEarned,
        totalTurns: gameWonNow ? state.totalTurns + 1 : state.totalTurns,
      };
    }

    case "END_TURN": {
      if (state.gameFinished) return state;
      const deckEmpty = state.deck.length === 0;
      if (!isValidTurn(state.cardsPlayedThisTurn, deckEmpty)) return state;

      const handSize = getHandSize(1);
      const deck = [...state.deck];
      let updatedHand = [...state.playerHand];
      const cardsNeeded = handSize - updatedHand.length;
      const cardsToDraw = Math.min(cardsNeeded, deck.length);

      if (cardsToDraw > 0) {
        const newCards = deck.splice(0, cardsToDraw);
        updatedHand = [...updatedHand, ...newCards];
        if (action.autoSortEnabled) {
          const comparator =
            action.lastSortOrder === "desc"
              ? (a: number, b: number) => b - a
              : (a: number, b: number) => a - b;
          updatedHand = updatedHand.sort(comparator);
        }
      }

      return {
        ...state,
        deck,
        playerHand: updatedHand,
        cardsPlayedThisTurn: 0,
        turnComplete: false,
        totalTurns: state.totalTurns + 1,
      };
    }

    case "CANT_PLAY":
      if (state.gameFinished) return state;
      return {
        ...state,
        gameFinished: true,
        totalTurns: state.totalTurns + 1,
      };

    case "REORDER_HAND":
      return { ...state, playerHand: action.hand };

    case "SORT_HAND": {
      const comparator =
        action.order === "desc"
          ? (a: number, b: number) => b - a
          : (a: number, b: number) => a - b;
      return {
        ...state,
        playerHand: [...state.playerHand].sort(comparator),
      };
    }

    case "SET_KONAMI_MODE":
      return { ...state, isKonamiMode: action.enabled };

    default:
      return state;
  }
}
