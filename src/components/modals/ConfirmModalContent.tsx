"use client";

import type { ReactNode } from "react";
import Button, { InvertButton } from "@/components/Button";
import "./ConfirmModalContent.css";

type ConfirmModalContentProps = {
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  close?: () => void;
};

const ConfirmModalContent = ({
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  close,
}: ConfirmModalContentProps) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    if (close) {
      close();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    if (close) {
      close();
    }
  };

  return (
    <div className="confirm-modal-content">
      {message && <p className="confirm-modal-content__message">{message}</p>}
      <div className="confirm-modal-content__actions">
        <InvertButton onClick={handleCancel}>{cancelLabel}</InvertButton>
        <Button onClick={handleConfirm}>{confirmLabel}</Button>
      </div>
    </div>
  );
};

export default ConfirmModalContent;
