import React from "react";
import LockpickLogo from "../assets/LockpickLogo.svg";
import "./GameHeader.css";
import { TextButton } from "./Button";
import HelpIcon from "../assets/HelpIcon.svg";

const GameHeader = ({ children }) => {
  return (
    <div className="game-header">
      <h1 className="game-header__title">
        <img src={LockpickLogo} alt="Lockpick" />
      </h1>
      <TextButton
        className="game-header__rules-trigger"
        onClick={() => console.log("onclick running")}
      >
        <img src={HelpIcon} alt="How do I play?" width={16} height={16} />
        <span className="hidden--tablet-down">How do I play?</span>
      </TextButton>
      {children}
    </div>
  );
};

export default GameHeader;
