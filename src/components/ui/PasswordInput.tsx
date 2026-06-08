import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn, focusRingClass, transitionInteractiveClass } from '../../lib/cn';

const INPUT_BASE = [
  'w-full min-w-0',
  'px-3 py-2',
  'text-sm text-text-main',
  'bg-surface-card border border-surface-border rounded-xl shadow-atomic',
  focusRingClass,
  transitionInteractiveClass,
].join(' ');

const ERROR_STYLES = ['border-status-error', 'focus:ring-status-error', 'focus:border-status-error'].join(
  ' '
);

const ERROR_TEXT_STYLES = ['mt-1.5 text-sm text-status-error flex items-center gap-1'].join(' ');
const HELPER_TEXT_STYLES = ['mt-1.5 text-sm text-text-muted'].join(' ');

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const autoId = useId();
    const uniqueId = id ?? autoId;

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label htmlFor={uniqueId} className="block text-sm font-medium text-text-main mb-1.5">
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            >
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={uniqueId}
            type={showPassword ? 'text' : 'password'}
            className={cn(INPUT_BASE, icon ? 'pl-10' : '', 'pr-10', error && ERROR_STYLES, className)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${uniqueId}-error` : helperText ? `${uniqueId}-helper` : undefined}
            {...props}
          />

          <button
            type="button"
            disabled={props.disabled}
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-transparent border-none text-text-muted hover:text-text-main transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M3.707 3.293a1 1 0 00-1.414 1.414l1 1a1 1 0 001.414 0l2-2a1 1 0 00-1.414-1.414L3.707 3.293zM17 6.293L18.586 7.879a1 1 0 00.293-.293l-2-2a1 1 0 00-1.414 0l-1 1a1 1 0 101.414 1.414zM8.586 10a1 1 0 010 1.414l-2 2a1 1 0 101.414 1.414l2-2a1 1 0 010-1.414l-2-2a1 1 0 101.414-1.414l2 2a1 1 0 010 1.414zM16 16a1 1 0 001-1V8a1 1 0 00-1-1h-1a1 1 0 100 2h1a1 1 0 001-1v7a1 1 0 00-1 1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M3.707 3.293a1 1 0 01-1.414 1.414l3 3a1 1 0 010 1.414l-3 3a1 1 0 011.414 1.415L6.5 10a1 1 0 010-1.414L1 6.707A1 1 0 013.707 3.293zM17 6.293l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
                <path d="M14 10a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>
        </div>

        {error && (
          <p id={`${uniqueId}-error`} className={ERROR_TEXT_STYLES} role="alert">
            <span aria-hidden="true">⚠️</span>
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={`${uniqueId}-helper`} className={HELPER_TEXT_STYLES}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
