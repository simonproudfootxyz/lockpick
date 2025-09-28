import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

test("renders game setup", () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  const gameSetupElement = screen.getByText(/Start Single Player Game/i);
  expect(gameSetupElement).toBeInTheDocument();
});
