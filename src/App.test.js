import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("react-router-dom", () => ({
  __esModule: true,
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <>{children}</>,
  Route: ({ element }) => element,
  Navigate: () => null,
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams()],
  useLocation: () => ({ state: { playerName: "Tester" } }),
  useParams: () => ({ roomCode: "ROOM123" }),
}));

jest.mock("./hooks/useSocket", () => ({
  __esModule: true,
  default: () => ({
    socket: null,
    isConnected: true,
    error: null,
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    connectionQuality: "good",
  }),
}));

import App from "./App";

test("renders game setup", () => {
  render(<App />);
  const gameSetupElement = screen.getByText(/Start Single Player Game/i);
  expect(gameSetupElement).toBeInTheDocument();
});
