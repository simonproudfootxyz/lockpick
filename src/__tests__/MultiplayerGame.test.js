import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MultiplayerGame from "../components/MultiplayerGame";

const mockEmit = jest.fn();
const mockOn = jest.fn();
const mockOff = jest.fn();

/** @type {Record<string, (...args: any[]) => void>} */
let handlers = {};

const mockSocket = {
  id: "test-socket-id",
  emit: mockEmit,
  on: mockOn,
  off: mockOff,
  connected: true,
};

let mockLocationState = {
  playerName: "FromState",
  playerId: "StatePlayerId",
  joinAsPlayer: true,
};

jest.mock("../hooks/useSocket", () => ({
  __esModule: true,
  default: () => ({
    socket: mockSocket,
    isConnected: true,
    error: null,
    emit: mockEmit,
    on: mockOn,
    off: mockOff,
    connectionQuality: "good",
  }),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ gameId: "TEST123" }),
  useSearchParams: () => [new URLSearchParams("playerId=FromQueryId")],
  useNavigate: () => jest.fn(),
  useLocation: () => ({
    state: mockLocationState,
  }),
}));

describe("MultiplayerGame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    handlers = {};
    mockOn.mockImplementation((event, handler) => {
      handlers[event] = handler;
    });
    mockLocationState = {
      playerName: "FromState",
      playerId: "StatePlayerId",
      joinAsPlayer: true,
    };
  });

  const trigger = (event, payload) => {
    const handler = handlers[event];
    if (!handler) return;
    act(() => {
      handler(payload);
    });
  };

  test("shows room header after join", () => {
    render(<MultiplayerGame />);

    trigger("room-joined", {
      roomCode: "TEST123",
      isHost: true,
      isSpectator: false,
      players: [],
      spectators: [],
      gameState: null,
    });

    expect(screen.getByText("Lockpick Multiplayer")).toBeInTheDocument();
    expect(screen.getByText(/Room:\s*TEST123/)).toBeInTheDocument();
  });

  test("prioritises player name from router state", () => {
    render(<MultiplayerGame />);

    trigger("room-joined", {
      roomCode: "TEST123",
      isHost: true,
      isSpectator: false,
      players: [],
      spectators: [],
      gameState: null,
    });

    trigger("player-joined", {
      players: [
        {
          socketId: "test-socket-id",
          name: "FromState",
          isHost: true,
          playerIndex: 0,
        },
      ],
      spectators: [],
    });

    expect(mockEmit).toHaveBeenCalledWith(
      "join-room",
      expect.objectContaining({
        playerName: "FromState",
        playerId: "StatePlayerId",
        joinAsPlayer: true,
      })
    );
  });

  test("respects spectator preference from navigation state", () => {
    mockLocationState = {
      playerName: "FromState",
      playerId: "StatePlayerId",
      joinAsPlayer: false,
    };

    render(<MultiplayerGame />);

    expect(mockEmit).toHaveBeenCalledWith(
      "join-room",
      expect.objectContaining({
        joinAsPlayer: false,
      })
    );

    trigger("room-joined", {
      roomCode: "TEST123",
      isHost: false,
      isSpectator: true,
      players: [
        {
          socketId: "player-1",
          name: "Player One",
          playerIndex: 0,
        },
        {
          socketId: "player-2",
          name: "Player Two",
          playerIndex: 1,
        },
      ],
      spectators: [
        {
          socketId: "test-socket-id",
          name: "Spectator Me",
          playerIndex: null,
        },
      ],
      gameState: null,
    });

    trigger("player-joined", {
      players: [
        {
          socketId: "player-1",
          name: "Player One",
          isHost: true,
          playerIndex: 0,
        },
        {
          socketId: "player-2",
          name: "Player Two",
          playerIndex: 1,
        },
      ],
      spectators: [
        {
          socketId: "test-socket-id",
          name: "Spectator Me",
        },
      ],
    });

    expect(
      screen.queryByText("You", { selector: ".you-badge" })
    ).not.toBeInTheDocument();
  });

  test("asks for confirmation before emitting cant-play", async () => {
    render(<MultiplayerGame />);

    const baseGameState = {
      currentPlayer: 0,
      playerHands: [
        [10, 20, 30, 40, 50],
        [60, 70, 80, 90, 100],
      ],
      discardPiles: [[], [], [], []],
      deck: [12, 13, 14],
      gameWon: false,
      gameOver: false,
      cardsPlayedThisTurn: 0,
      turnComplete: false,
      totalCards: 98,
      maxCard: 99,
      descendingStart: 100,
    };

    trigger("room-joined", {
      roomCode: "TEST123",
      isHost: true,
      isSpectator: false,
      players: [
        {
          socketId: "test-socket-id",
          name: "FromState",
          isHost: true,
          playerIndex: 0,
        },
        {
          socketId: "player-2",
          name: "Player Two",
          playerIndex: 1,
        },
      ],
      spectators: [],
      gameState: baseGameState,
    });

    trigger("player-joined", {
      players: [
        {
          socketId: "test-socket-id",
          name: "FromState",
          isHost: true,
          playerIndex: 0,
        },
        {
          socketId: "player-2",
          name: "Player Two",
          playerIndex: 1,
        },
      ],
      spectators: [],
    });

    const cantPlayButton = await screen.findByRole("button", {
      name: /i can't play a card/i,
    });

    await userEvent.click(cantPlayButton);

    expect(
      screen.getByRole("heading", { name: /end the game/i })
    ).toBeInTheDocument();
    expect(mockEmit.mock.calls.some((call) => call[0] === "cant-play")).toBe(
      false
    );

    await userEvent.click(
      screen.getByRole("button", { name: /yes, end the game/i })
    );

    expect(mockEmit).toHaveBeenCalledWith("cant-play", {
      roomCode: "TEST123",
    });
  });
});
