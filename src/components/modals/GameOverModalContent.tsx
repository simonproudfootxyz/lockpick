"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import "./GameOverModalContent.css";

type SummaryItem = {
  label: string;
  value: ReactNode;
};

type GameOverModalContentProps = {
  message?: ReactNode;
  summaryItems?: SummaryItem[];
  actionLabel?: string;
  onAction?: () => void;
  close?: () => void;
  showLeaderboardLink?: boolean;
  guestNameForm?: ReactNode;
};

const GameOverModalContent = ({
  message,
  summaryItems = [],
  actionLabel = "Back to Home",
  onAction,
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

  return (
    <div className="game-over-content">
      {message && <p className="game-over-content__message">{message}</p>}
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
          <Link href="/leaderboard" className="leaderboard-link">
            View Leaderboard
          </Link>
        )}
        <Button onClick={handleAction}>{actionLabel}</Button>
      </div>
    </div>
  );
};

export default GameOverModalContent;
