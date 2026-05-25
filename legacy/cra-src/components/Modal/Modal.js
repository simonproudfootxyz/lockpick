import React, { useEffect } from "react";
import "./Modal.css";
import Button from "../Button";

const Modal = ({
  title,
  onClose,
  children,
  size = "md",
  closeOnBackdrop = true,
}) => {
  useEffect(() => {
    if (!onClose) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleBackdropClick = () => {
    if (closeOnBackdrop && onClose) {
      onClose();
    }
  };

  const labelId = title ? "modal-title" : undefined;

  return (
    <div
      className="modal-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
    >
      <div
        className={`modal modal--${size}`}
        onClick={(event) => event.stopPropagation()}
      >
        {(title || onClose) && (
          <div className="modal__header">
            {title && (
              <h2 id={labelId} className="modal__title">
                {title}
              </h2>
            )}
            {onClose && (
              <Button onClick={onClose} className="modal__close">
                ✕
              </Button>
            )}
          </div>
        )}
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
