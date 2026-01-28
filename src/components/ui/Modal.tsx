import React, {
  cloneElement,
  createContext,
  useContext,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useOutsideClick } from "../../hooks/useOutsideClick";

type ModalContextValue = {
  activeModalId: string;
  openModal: (modalId: string) => void;
  closeModal: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("Modal components must be used within <Modal>");
  }
  return context;
};

type ModalProps = {
  children: React.ReactNode;
};

export const Modal: React.FC<ModalProps> & {
  Trigger: typeof ModalTrigger;
  Content: typeof ModalContent;
} = ({ children }) => {
  const [activeModalId, setActiveModalId] = useState("");

  const openModal = (modalId: string) => setActiveModalId(modalId);
  const closeModal = () => setActiveModalId("");

  return (
    <ModalContext.Provider value={{ activeModalId, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
};

type ModalTriggerProps = {
  children: React.ReactElement;
  modalIdToOpen: string;
};

function ModalTrigger({ children, modalIdToOpen }: ModalTriggerProps) {
  const { openModal } = useModalContext();

  return cloneElement(children, {
    onClick: (event: React.MouseEvent) => {
      children.props.onClick?.(event);
      openModal(modalIdToOpen);
    },
  });
}

type ModalContentProps = {
  children: React.ReactElement;
  modalId: string;
  panelClassName?: string;
  overlayClassName?: string;
  closeButtonClassName?: string;
  panelStyle?: React.CSSProperties;
};

function ModalContent({
  children,
  modalId,
  panelClassName,
  overlayClassName,
  closeButtonClassName,
  panelStyle,
}: ModalContentProps) {
  const { activeModalId, closeModal } = useModalContext();
  const panelRef = useOutsideClick<HTMLDivElement>(closeModal);

  if (activeModalId !== modalId) {
    return null;
  }

  const panelBaseClass = "relative w-full rounded-2xl p-6 shadow-2xl";
  const panelDefaultClass = panelClassName
    ? ""
    : "max-w-lg border border-zinc-800 bg-zinc-950 text-zinc-200";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${overlayClassName ?? ""}`}
      />
      <div
        ref={panelRef}
        style={panelStyle}
        className={`${panelBaseClass} ${panelDefaultClass} ${panelClassName ?? ""}`}
      >
        <button
          type="button"
          onClick={closeModal}
          className={`absolute right-4 top-4 text-zinc-500 hover:text-zinc-200 ${
            closeButtonClassName ?? ""
          }`}
        >
          <X size={18} />
        </button>
        {cloneElement(children, { onCloseModal: closeModal })}
      </div>
    </div>,
    document.body
  );
}

Modal.Trigger = ModalTrigger;
Modal.Content = ModalContent;
