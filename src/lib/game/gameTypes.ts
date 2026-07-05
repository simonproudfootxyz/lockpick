export type PileType = "ascending" | "descending";

export type GameState = {
  playerHand: number[];
  discardPiles: number[][];
  deck: number[];
  gameWon: boolean;
  gameFinished: boolean;
  cardsPlayedThisTurn: number;
  turnComplete: boolean;
  totalCards: number;
  maxCard: number;
  descendingStart: number;
  totalTurns: number;
  gameScore: number;
  isKonamiMode: boolean;
  startedAt: number;
  finishedAt?: number;
  totalTime?: number;
};

export type GameAction =
  | { type: "HYDRATE"; state: GameState }
  | { type: "SELECT_CARD"; card: number | null }
  | { type: "SELECT_PILE"; pileIndex: number | null }
  | { type: "PLAY_CARD"; card: number; pileIndex: number }
  | { type: "END_TURN"; autoSortEnabled: boolean; lastSortOrder: "asc" | "desc" }
  | { type: "CANT_PLAY" }
  | { type: "REORDER_HAND"; hand: number[] }
  | { type: "SORT_HAND"; order: "asc" | "desc" }
  | { type: "SET_KONAMI_MODE"; enabled: boolean };

export type FinishGameResult = {
  ok: true;
  needsDisplayName: boolean;
  submitted: boolean;
  rank?: number;
  displayName?: string;
};

export const createInitialGameState = (): GameState => ({
  playerHand: [],
  discardPiles: [[], [], [], []],
  deck: [],
  gameWon: false,
  gameFinished: false,
  cardsPlayedThisTurn: 0,
  turnComplete: false,
  totalCards: 0,
  maxCard: 0,
  descendingStart: 100,
  totalTurns: 0,
  gameScore: 0,
  isKonamiMode: false,
  startedAt: Date.now(),
});
