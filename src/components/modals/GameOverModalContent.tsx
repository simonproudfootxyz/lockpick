"use client";

import type { ReactNode } from "react";
import type { MouseEvent } from "react";
import { startGame } from "@/actions/game";
import Button, { PrimaryInvertButton } from "@/components/Button";
import "./GameOverModalContent.css";
import { PrimaryLink } from "../Link";

type SummaryItem = {
  label: string;
  value: ReactNode;
};

type GameOverModalContentProps = {
  message?: ReactNode;
  summaryItems?: SummaryItem[];
  actionLabel?: string;
  onAction?: () => void;
  onLeaderboardAction?: () => void;
  close?: () => void;
  showLeaderboardLink?: boolean;
  guestNameForm?: ReactNode;
};

const GameOverModalContent = ({
  message,
  summaryItems = [],
  actionLabel = "Back to Home",
  onAction,
  onLeaderboardAction,
  close,
  showLeaderboardLink = false,
  guestNameForm,
}: GameOverModalContentProps) => {
  const handleAction = () => {
    if (onAction) {
      onAction();
    }
    if (close) {
      close();
    }
  };

  const handleLeaderboardClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (onLeaderboardAction) {
      onLeaderboardAction();
    }
    if (close) {
      close();
    }
  };

  return (
    <div className="game-over-content">
      {message && <p className="game-over-content__message">{message}</p>}
      <div className="game-over-content__actions">
        <form action={startGame}>
          <PrimaryInvertButton type="submit">Start New Game</PrimaryInvertButton>
        </form>
      </div>
      {Array.isArray(summaryItems) && summaryItems.length > 0 && (
        <div className="game-over-summary">
          <h3>Game Summary</h3>
          <ul>
            {summaryItems.map((item) => (
              <li key={item.label}>
                <span className="summary-label">{item.label}</span>
                <span className="summary-value">{item.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {guestNameForm}
      <div className="game-over-actions">
        {showLeaderboardLink && (
          <PrimaryLink href="/leaderboard" onClick={handleLeaderboardClick}>
            View Leaderboard
          </PrimaryLink>
        )}
        <Button onClick={handleAction}>{actionLabel}</Button>
      </div>
    </div>
  );
};

export default GameOverModalContent;
