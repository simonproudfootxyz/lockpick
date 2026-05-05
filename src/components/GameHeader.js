import React from "react";
import { Link } from "react-router-dom";
import LockpickLogo from "../assets/LockpickLogo.svg";
import "./GameHeader.css";
import { TextButton } from "./Button";
import HelpIcon from "../assets/HelpIcon.svg";
import { useModal } from "../context/ModalContext";
import RulesModalContent from "./modals/RulesModalContent";

const GameHeader = ({ children }) => {
  const { openModal } = useModal();

  const handleOpenRules = () => {
    openModal({
      title: "Lockpick Game Rules",
      content: <RulesModalContent />,
    });
  };

  return (
    <div className="game-header">
      <h1 className="game-header__title">
        <Link to="/" className="game-header__logo-link" aria-label="Home">
          <img src={LockpickLogo} alt="Lockpick" />
        </Link>
      </h1>
      <TextButton
        className="game-header__rules-trigger"
        onClick={handleOpenRules}
      >
        <img src={HelpIcon} alt="How do I play?" width={30} height={30} />
        <span className="hidden--tablet-down">How do I play?</span>
      </TextButton>
      {children}
    </div>
  );
};

export default GameHeader;
