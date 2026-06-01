import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  lead?: string;
  footer?: ReactNode;
  describedBy?: string;
}

const MODAL_VARIANTS = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: [0.42, 0, 0.58, 1] as const },
  },
};

export function Modal({ open, onClose, title, children, lead, footer, describedBy }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="condo-modal" role="presentation">
      <button type="button" className="condo-modal__backdrop" aria-label="Fechar" onClick={onClose} />
      <motion.div
        variants={MODAL_VARIANTS}
        initial="hidden"
        animate="visible"
        className="condo-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="condo-modal__head">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="condo-modal__icon-btn"
            onClick={onClose}
            aria-label="Fechar diálogo"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {lead ? <p className="condo-modal__lead">{lead}</p> : null}
        <div className="condo-modal__body">{children}</div>
        {footer ? <div className="condo-modal__actions">{footer}</div> : null}
      </motion.div>
    </div>,
    document.body
  );
}
