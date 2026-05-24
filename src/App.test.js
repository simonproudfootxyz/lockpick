import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("react-router-dom", () => ({
  __esModule: true,
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <>{children}</>,
  Route: ({ path, element }) => (path === "/" ? element : null),
  Navigate: () => null,
  useNavigate: () => jest.fn(),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams()],
  useLocation: () => ({ state: {} }),
}));

import App from "./App";

test("renders game setup", () => {
  render(<App />);
  const gameSetupElement = screen.getByText(/Start Game/i);
  expect(gameSetupElement).toBeInTheDocument();
});
