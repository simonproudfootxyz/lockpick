import React from "react";
import LockpickLogo from "../assets/LockpickLogo.svg";
import "./GameHeader.css";

const GameHeader = ({ children }) => {
  return (
    <div className="game-header">
      <h1 className="game-header__title">
        <img src={LockpickLogo} alt="Lockpick" />
      </h1>
      {children}
    </div>
  );
};

export default GameHeader;
