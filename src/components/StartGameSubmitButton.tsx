"use client";

import { useFormStatus } from "react-dom";
import Button, { PrimaryInvertButton } from "@/components/Button";
import "./StartGameSubmitButton.css";

type StartGameSubmitButtonProps = {
  idleLabel?: string;
  pendingLabel?: string;
  variant?: "default" | "primaryInvert";
};

export default function StartGameSubmitButton({
  idleLabel = "Start Game",
  pendingLabel = "Starting Game...",
  variant = "default",
}: StartGameSubmitButtonProps) {
  const { pending } = useFormStatus();
  const label = pending ? pendingLabel : idleLabel;
  const className = pending
    ? "start-game-submit-btn start-game-submit-btn--pending"
    : "start-game-submit-btn";

  if (variant === "primaryInvert") {
    return (
      <PrimaryInvertButton
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={className}
      >
        {pending && <span className="start-game-submit-btn__spinner" aria-hidden />}
        {label}
      </PrimaryInvertButton>
    );
  }

  return (
    <Button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending && <span className="start-game-submit-btn__spinner" aria-hidden />}
      {label}
    </Button>
  );
}
