"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MouseEvent } from "react";
import { startGame } from "@/actions/game";
import Button, { PrimaryInvertButton, TextButton } from "@/components/Button";
import StartGameSubmitButton from "@/components/StartGameSubmitButton";
import {
  buildCopyPayloads,
  buildShareIntentUrls,
} from "@/lib/share/shareLinks";
import "./GameOverModalContent.css";
import { PrimaryLink } from "../Link";

type SummaryItem = {
  label: string;
  value: ReactNode;
};

type GameOverModalContentProps = {
  message?: ReactNode;
  summaryItems?: SummaryItem[];
  shareUrl?: string;
  shareText?: string;
  shareTitle?: string;
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
  shareUrl,
  shareText,
  shareTitle,
  actionLabel = "Back to Home",
  onAction,
  onLeaderboardAction,
  close,
  showLeaderboardLink = false,
  guestNameForm,
}: GameOverModalContentProps) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const hasShareContent =
    typeof shareUrl === "string" &&
    shareUrl.length > 0 &&
    typeof shareText === "string" &&
    shareText.length > 0;

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const showCopyFeedback = (message: string) => {
    setCopyFeedback(message);
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setCopyFeedback(null);
      feedbackTimeoutRef.current = null;
    }, 2000);
  };

  const openShareUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showCopyFeedback(successMessage);
    } catch {
      showCopyFeedback("Copy failed. Please try again.");
    }
  };

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

  const handleShareClick = (
    platform: "x" | "bluesky" | "facebook" | "reddit",
  ) => {
    if (!hasShareContent || !shareText) return;
    const intentUrls = buildShareIntentUrls({
      title: shareTitle ?? "Lockpick Challenge",
      text: shareText,
      url: shareUrl,
    });
    openShareUrl(intentUrls[platform]);
  };

  const handleCopyLink = () => {
    if (!hasShareContent) return;
    const payloads = buildCopyPayloads({ text: shareText, url: shareUrl });
    void handleCopy(payloads.link, "Link copied!");
  };

  const handleCopyText = () => {
    if (!hasShareContent) return;
    const payloads = buildCopyPayloads({ text: shareText, url: shareUrl });
    void handleCopy(payloads.text, "Share text copied!");
  };

  return (
    <div className="game-over-content">
      {message && <p className="game-over-content__message">{message}</p>}
      <div className="game-over-content__actions">
        <form action={startGame}>
          <StartGameSubmitButton
            variant="primaryInvert"
            idleLabel="Start New Game"
            pendingLabel="Starting New Game..."
          />
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
      {showLeaderboardLink && (
        <div className="game-over-actions">
          <PrimaryLink href="/leaderboard" onClick={handleLeaderboardClick}>
            View Leaderboard
          </PrimaryLink>
        </div>
      )}
      {hasShareContent && (
        <div className="game-over-share" aria-live="polite">
          <h3>Share your result</h3>
          <div className="game-over-share__buttons">
            <TextButton mini onClick={() => handleShareClick("x")}>
              Share on X
            </TextButton>
            <TextButton mini onClick={() => handleShareClick("bluesky")}>
              Share on Bluesky
            </TextButton>
            <TextButton mini onClick={() => handleShareClick("facebook")}>
              Share on Facebook
            </TextButton>
            <TextButton mini onClick={() => handleShareClick("reddit")}>
              Share on Reddit
            </TextButton>
            <TextButton mini onClick={handleCopyLink}>
              Copy Link
            </TextButton>
            <TextButton mini onClick={handleCopyText}>
              Copy Text
            </TextButton>
          </div>
          {copyFeedback && (
            <p className="game-over-share__feedback" role="status">
              {copyFeedback}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default GameOverModalContent;
