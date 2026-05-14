import React, { useEffect, useState } from "react";
import { getTotalCardCount } from "../gameLogic";
import { InvertButton } from "./Button";
import { useModal } from "../context/ModalContext";
import RulesModalContent from "./modals/RulesModalContent";
import "./GameInfo.css";

const formatDuration = (durationMs) => {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs)) {
    return "00:00";
  }
  const totalSeconds = Math.floor(Math.max(0, durationMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const GameInfo = ({ gameState }) => {
  const { openModal } = useModal();
  const [now, setNow] = useState(() => Date.now());

  const hasStart = typeof gameState.createdAt === "number";
  const hasTotalTime = typeof gameState.totalTime === "number";

  useEffect(() => {
    if (!hasStart || hasTotalTime) return undefined;
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [hasStart, hasTotalTime]);

  const elapsedTime = formatDuration(
    hasTotalTime ? gameState.totalTime : now - gameState.createdAt,
  );

  const totalCardsPlayed = gameState.discardPiles.reduce(
    (sum, pile) => sum + pile.length,
    0,
  );
  const totalCardsTarget =
    gameState.totalCards || getTotalCardCount(gameState.playerHands.length);
  const currentHandSize =
    gameState.playerHands[gameState.currentPlayer]?.length || 0;

  const handleOpenRules = () => {
    openModal({
      title: "Lockpick Game Rules",
      size: "md",
      content: <RulesModalContent />,
    });
  };

  return (
    <div className="game-info">
      <p className="game-info__item">
        {hasTotalTime ? "Total time:" : "Time elapsed:"}{" "}
        <span className="game-info__value" data-testid="game-info-elapsed">
          {elapsedTime}
        </span>
      </p>
      <p className="game-info__item">
        Cards in deck:{" "}
        <span className="game-info__value">{gameState.deck.length}</span>
      </p>
      <p className="game-info__item">
        Current player hand:{" "}
        <span className="game-info__value">{currentHandSize} cards</span>
      </p>
      <p className="game-info__item">
        Total cards played:{" "}
        <span className="game-info__value">
          {totalCardsPlayed}/{totalCardsTarget}
        </span>
      </p>
      <p className="game-info__item">
        <span className="game-info__value--yellow">
          Cards played this turn: {gameState.cardsPlayedThisTurn}
        </span>
      </p>
      <p className="game-info__actions">
        <InvertButton mini onClick={handleOpenRules}>
          Read the rules
        </InvertButton>
      </p>
    </div>
  );
};

export default GameInfo;
