/* eslint-disable react-refresh/only-export-components -- error boundary + context + helpers */
import React from 'react';

export interface ErrorNotification {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
}

export interface ErrorContextValue {
  showNotification: (message: string, type?: 'error' | 'warning' | 'info' | 'success') => void;
  clearError: () => void;
  isLoading: boolean;
}

export const ErrorContext = React.createContext<ErrorContextValue | null>(null);

export const ErrorProvider = (props: {
  children: React.ReactNode;
  maxErrors?: number;
  autoDismiss?: boolean;
  autoDismissDuration?: number;
}) => {
  const { children, maxErrors = 3, autoDismiss = true, autoDismissDuration = 5000 } = props;

  const [errors, setErrors] = React.useState<ErrorNotification[]>([]);
  const [isLoading] = React.useState(false);

  const showErrorNotification = React.useCallback(
    (message: string, type: ErrorNotification['type'] = 'error') => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const newError: ErrorNotification = { id, message, type };
      setErrors((prev) => [...prev, newError].slice(-maxErrors));

      if (autoDismiss) {
        setTimeout(() => {
          setErrors((prev) => prev.filter((e) => e.id !== id));
        }, autoDismissDuration);
      }

      console.error('[ErrorNotification]', message);
    },
    [maxErrors, autoDismiss, autoDismissDuration]
  );

  const clearError = React.useCallback(() => {
    setErrors([]);
  }, []);

  const dismissOne = React.useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const contextValue = React.useMemo<ErrorContextValue>(
    () => ({
      showNotification: showErrorNotification,
      clearError,
      isLoading,
    }),
    [showErrorNotification, clearError, isLoading]
  );

  return (
    <ErrorContext.Provider value={contextValue}>
      {errors.length > 0 ? (
        <div className="error-provider-stack" aria-live="polite">
          {errors.map((e) => (
            <div
              key={e.id}
              className={`error-provider-item banner ${
                e.type === 'warning'
                  ? 'banner--info'
                  : e.type === 'info'
                    ? 'banner--info'
                    : e.type === 'success'
                      ? 'banner--info'
                      : 'banner--error'
              }`}
              role={e.type === 'error' ? 'alert' : 'status'}
            >
              <span className="error-provider-item__text">{e.message}</span>
              <button type="button" className="btn-small error-provider-item__close" onClick={() => dismissOne(e.id)}>
                Fechar
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {children}
    </ErrorContext.Provider>
  );
};

export const useErrorNotification = () => {
  const context = React.useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorNotification must be used within an ErrorProvider');
  }
  return context;
};
