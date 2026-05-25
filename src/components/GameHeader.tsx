"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import LockpickLogo from "@/assets/LockpickLogo.svg";
import HelpIcon from "@/assets/HelpIcon.svg";
import { TextButton } from "@/components/Button";
import { useModal } from "@/context/ModalContext";
import RulesModalContent from "@/components/modals/RulesModalContent";
import "./GameHeader.css";

type GameHeaderProps = {
  children?: ReactNode;
};

const GameHeader = ({ children }: GameHeaderProps) => {
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
        <Link href="/" className="game-header__logo-link" aria-label="Home">
          <img src={LockpickLogo.src} alt="Lockpick" />
        </Link>
      </h1>
      <TextButton
        className="game-header__rules-trigger"
        onClick={handleOpenRules}
      >
        <img src={HelpIcon.src} alt="How do I play?" width={30} height={30} />
        <span className="hidden--tablet-down">How do I play?</span>
      </TextButton>
      {children}
    </div>
  );
};

export default GameHeader;
