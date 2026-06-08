'use client';

import React from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onDismiss: () => void;
}

const STATUS_COLORS = {
  success: 'bg-status-success-light border border-status-success/20',
  error: 'bg-status-error-light border border-status-error/20',
  info: 'bg-brand-primary/10 border border-brand-primary/15',
};

export const Toast = ({ message, type, onDismiss }: ToastProps) => {
  const icon =
    type === 'success' ? (
      <CheckCircle2 className="h-5 w-5 shrink-0 text-status-success" aria-hidden />
    ) : (
      <AlertCircle className="h-5 w-5 shrink-0 text-status-error" aria-hidden />
    );

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'relative flex w-full max-w-sm items-start gap-3 rounded-xl p-4 shadow-macro-lg',
        STATUS_COLORS[type]
      )}
    >
      {icon}
      <p className="flex-1 text-sm font-medium text-text-main">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-md p-1 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        aria-label="Fechar notificação"
      >
        <X className="h-4 w-4 text-text-muted" />
      </button>
    </div>
  );
};
