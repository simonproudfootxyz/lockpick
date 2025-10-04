import React from "react";
import { act, render, screen } from "@testing-library/react";
import MultiplayerGame from "../components/MultiplayerGame";

type HandlerMap = Record<string, (...args: any[]) => void>;

const mockEmit = jest.fn();
const mockOn = jest.fn();
const mockOff = jest.fn();
let handlers: HandlerMap = {};

const mockSocket = {
  id: "test-socket-id",
  emit: mockEmit,
  on: mockOn,
  off: mockOff,
  connected: true,
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
  useSearchParams: () => [new URLSearchParams("playerName=FromQuery")],
  useNavigate: () => jest.fn(),
  useLocation: () => ({ state: { playerName: "FromState" } }),
}));

describe("MultiplayerGame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    handlers = {};
    mockOn.mockImplementation((event, handler) => {
      handlers[event] = handler;
    });
  });

  const trigger = (event: string, payload?: any) => {
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
      expect.objectContaining({ playerName: "FromState" })
    );
  });
});
