import { forwardRef, useState, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility para mesclar classes Tailwind sem duplicação
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// DESIGN TOKENS — Sem strings literais de cor ("magic colors")
// ============================================
const DESIGN_TOKENS = {
  surface: {
    background: 'surface.background',
    muted: 'surface.muted',
    border: 'surface.border',
  },
  text: {
    main: 'text.main',
    muted: 'text.muted',
  },
  brand: {
    primary: 'brand.primary',
  },
  status: {
    error: 'status.error',
  },
};

// ============================================
// ESTILOS DE FOCO — Anel customizado acessível (WCAG)
// ============================================
const FOCUS_STYLES = [
  'focus:outline-none',
  'focus:ring-2',
  `focus:ring-[${DESIGN_TOKENS.brand.primary}]`,
  `focus:border-[${DESIGN_TOKENS.brand.primary}]`,
].join(' ');

// ============================================
// ESTILOS DE ERRO — Alto contraste para acessibilidade
// ============================================
const ERROR_STYLES = [
  'border-status-error' /* Token semântico — Contraste WCAG */,
  'focus:ring-status-error',
  'focus:border-status-error',
].join(' ');

// ============================================
// TIPOS E INTERFACES
// ============================================
export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
}

// ============================================
// COMPONENTE PASSWORD INPUT — Transições suaves e tokens semânticos
// ============================================
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const autoId = useId();
    const uniqueId = id ?? autoId;

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label
            htmlFor={uniqueId}
            className="block text-sm font-medium text-text-main mb-1.5"
            style={{ color: '#1A1A1A' }}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{icon}</div>}
          <input
            ref={ref}
            id={uniqueId}
            type={showPassword ? 'text' : 'password'}
            className={cn(
              'w-full',
              'px-4',
              'py-2.5',
              'text-sm',
              'text-text-main',
              'bg-surface-background',
              'border-border',
              'rounded-lg', // atomic-md (8px)
              'shadow-atomic', // sombra mínima
              'placeholder:text-text-muted',
              !icon ? '' : 'pl-10',
              'pr-10',
              'transition-all', // transição suave conforme diretriz
              'duration-200', // 0.2s - tempo de transição suave
              'ease-in-out', // curva de bezier suave
              !error ? '' : ERROR_STYLES,
              FOCUS_STYLES
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${uniqueId}-error` : helperText ? `${uniqueId}-helper` : undefined}
            {...props}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors duration-150 ease-in-out focus:outline-none focus:text-text-main"
            onClick={() => setShowPassword(!showPassword)}
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
          <p
            id={`${uniqueId}-error`}
            className="mt-1.5 text-sm text-status-error flex items-center gap-1"
            role="alert"
          >
            <span aria-hidden="true">⚠️</span>
            {error}
          </p>
        )}
        {!error && helperText && (
          <p
            id={`${uniqueId}-helper`}
            className="mt-1.5 text-sm text-text-muted"
            style={{ color: '#6b7280' }}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
