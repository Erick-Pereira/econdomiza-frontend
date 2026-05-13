'use client';

import React, { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';

// Tipos
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose?: () => void;
  id?: string;
}

export interface ToastContextValue {
  show: (message: string, type: ToastType, duration?: number) => void;
  remove: (id: string) => void;
  isLoading: boolean;
}

// Estilos
const getToastStyles = (type: ToastType): string => {
  const base = 'fixed top-4 right-4 z-50 rounded-lg shadow-lg transform transition-all duration-300 max-w-sm';
  
  switch (type) {
    case 'success':
      return `${base} bg-green-50 border-l-4 border-green-500 text-green-800`;
    case 'error':
      return `${base} bg-red-50 border-l-4 border-red-500 text-red-800`;
    case 'warning':
      return `${base} bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800`;
    case 'info':
    default:
      return `${base} bg-blue-50 border-l-4 border-blue-500 text-blue-800`;
  }
};

const getIcon = (type: ToastType): string => {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'warning':
      return '!';
    case 'info':
    default:
      return 'i';
  }
};

// Componente Toast
export const Toast: React.FC<ToastProps> = ({ message, type, duration = 5000, onClose }) => {
  const style = getToastStyles(type);
  const icon = getIcon(type);
  
  return (
    <div
      className={`fixed top-4 right-4 z-50 rounded-lg shadow-lg transform transition-all duration-300 max-w-sm ${style} animate-[slide-in_0.3s_ease-out_both]`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0" aria-hidden="true">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{message}</p>
          <p className="text-xs opacity-75 mt-1">{duration ? `Aparecer por ${duration}ms` : ''}</p>
        </div>
        <button
          onClick={onClose}
          className="text-current opacity-50 hover:opacity-100 focus:opacity-100"
          aria-label="Fechar notificação"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// Contexto
export const ToastContext = createContext<ToastContextValue>({
  show: () => {},
  remove: () => {},
  isLoading: false,
});

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [isLoading] = useState(false);

  const show = useCallback((message: string, type: ToastType, duration: number = 5000) => {
    const id = Date.now().toString(36);
    const toast = { id, message, type, duration };
    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastContextValue: ToastContextValue = useMemo(() => ({
    show,
    remove,
    isLoading,
  }), [show, remove, isLoading]);

  const toastsToShow = toasts.map((toast) => {
    return (
      <Toast
        key={toast.id}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onClose={() => {
          const tid = toast.id;
          if (tid) remove(tid);
        }}
        id={toast.id}
      />
    );
  });

  return (
    <ToastContext.Provider value={toastContextValue}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">{toastsToShow}</div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};