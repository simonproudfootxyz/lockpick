import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import Modal from "../components/Modal/Modal";

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState(null);

  const closeModal = useCallback(() => {
    setModal((current) => {
      if (current?.onClose) {
        current.onClose();
      }
      return null;
    });
  }, []);

  const openModal = useCallback((config) => {
    if (!config || !config.content) {
      return;
    }
    setModal((current) => {
      if (current?.onClose) {
        current.onClose();
      }
      return config;
    });
  }, []);

  const value = useMemo(
    () => ({ openModal, closeModal, isOpen: !!modal }),
    [openModal, closeModal, modal],
  );

  const renderContent = () => {
    if (!modal) return null;
    if (typeof modal.content === "function") {
      return modal.content({ close: closeModal });
    }
    return modal.content;
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
      {modal && (
        <Modal
          title={modal.title}
          size={modal.size || "md"}
          closeOnBackdrop={
            modal.closeOnBackdrop !== undefined ? modal.closeOnBackdrop : true
          }
          onClose={modal.hideClose ? undefined : closeModal}
        >
          {renderContent()}
        </Modal>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return ctx;
};
