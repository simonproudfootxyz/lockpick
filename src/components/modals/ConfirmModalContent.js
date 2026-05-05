import React from "react";
import Button, { InvertButton } from "../Button";
import "./ConfirmModalContent.css";

const ConfirmModalContent = ({
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  close,
}) => {
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
