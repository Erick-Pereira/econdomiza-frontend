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
    <div
      className="condo-modal fixed inset-0 z-[1400] flex min-h-screen items-center justify-center overflow-y-auto px-4 py-6 sm:px-6"
      role="presentation"
    >
      <button
        type="button"
        className="condo-modal__backdrop fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={onClose}
      />
      <motion.div
        variants={MODAL_VARIANTS}
        initial="hidden"
        animate="visible"
        className="condo-modal__panel relative w-full max-w-3xl rounded-3xl border border-surface-border bg-surface-card p-6 shadow-2xl outline-none sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="condo-modal__head mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="condo-modal__icon-btn rounded-full p-2 text-text-muted transition hover:bg-surface-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            onClick={onClose}
            aria-label="Fechar diálogo"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {lead ? <p className="condo-modal__lead mb-4 text-sm text-text-muted">{lead}</p> : null}
        <div className="condo-modal__body space-y-6">{children}</div>
        {footer ? (
          <div className="condo-modal__actions mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </motion.div>
    </div>,
    document.body
  );
}
