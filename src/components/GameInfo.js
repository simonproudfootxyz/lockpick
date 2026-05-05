import React from "react";
import { getTotalCardCount } from "../gameLogic";
import { InvertButton } from "./Button";
import { useModal } from "../context/ModalContext";
import RulesModalContent from "./modals/RulesModalContent";
import "./GameInfo.css";

const GameInfo = ({ gameState }) => {
  const { openModal } = useModal();

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
