'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Toast, type ToastProps } from './Toast';
import { ToastContext } from './toast-context';

type ToastEntry = { id: string; message: string; type: ToastProps['type'] };

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
