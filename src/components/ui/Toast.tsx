'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
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

type ToastEntry = { id: string; message: string; type: ToastProps['type'] };

type ToastContextValue = {
  add: (message: string, type?: ToastProps['type']) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_TTL_MS = 6000;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeToasts, setActiveToasts] = useState<ToastEntry[]>([]);

  const add = useCallback((message: string, type: ToastProps['type'] = 'info') => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setActiveToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setActiveToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_TTL_MS);
  }, []);

  const value = useMemo(() => ({ add }), [add]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed top-4 right-4 z-[9999] flex w-full max-w-sm flex-col gap-3"
        role="region"
        aria-label="Notificações"
      >
        {activeToasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              message={toast.message}
              type={toast.type}
              onDismiss={() => setActiveToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};
