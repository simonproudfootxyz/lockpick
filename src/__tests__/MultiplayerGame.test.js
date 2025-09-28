import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import MultiplayerGame from "../components/MultiplayerGame";

// Mock the useSocket hook
jest.mock("../hooks/useSocket", () => ({
  __esModule: true,
  default: () => ({
    socket: {
      id: "test-socket-id",
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    },
    isConnected: true,
    error: null,
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  }),
}));

// Mock the router params
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ gameId: "TEST123" }),
  useSearchParams: () => [new URLSearchParams("playerName=TestPlayer")],
  useNavigate: () => jest.fn(),
}));

const MockedMultiplayerGame = () => (
  <BrowserRouter>
    <MultiplayerGame />
  </BrowserRouter>
);

describe("MultiplayerGame Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render connection status when connected", () => {
    render(<MockedMultiplayerGame />);

    expect(screen.getByText("Lockpick Multiplayer")).toBeInTheDocument();
    expect(screen.getByText("Room: TEST123")).toBeInTheDocument();
  });

  test("should show waiting message when game not started", () => {
    render(<MockedMultiplayerGame />);

    expect(screen.getByText(/Waiting for game to start/)).toBeInTheDocument();
  });
});
