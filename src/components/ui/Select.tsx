import { forwardRef, useId, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn, focusRingClass, transitionInteractiveClass } from '../../lib/cn';

const SELECT_BASE = [
  'w-full min-w-0 px-3 py-2 pr-10 text-sm text-text-main',
  'bg-surface-background border border-surface-border rounded-lg shadow-atomic',
  focusRingClass,
  transitionInteractiveClass,
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
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
  icon?: ReactNode;
  /** Quando false, não insere opção placeholder vazia (útil se "" é valor válido). */
  showPlaceholder?: boolean;
}

// ============================================
// COMPONENTE SELECT — Transições suaves e tokens semânticos
// ============================================
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      icon,
      className = '',
      id,
      children,
      showPlaceholder = false,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const uniqueId = id ?? autoId;

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label htmlFor={uniqueId} className="block text-sm font-medium text-text-main mb-1.5">
            {label}
          </label>
        )}
        <div className="relative w-full overflow-hidden rounded-lg">
          {icon && (
            <div className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-text-muted">
              {icon}
            </div>
          )}
          <select
            ref={ref}
            id={uniqueId}
            className={cn(SELECT_BASE, 'relative appearance-none', icon && 'pl-10', error && ERROR_STYLES)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${uniqueId}-error` : helperText ? `${uniqueId}-helper` : undefined}
            {...props}
          >
            {showPlaceholder && props.value === undefined && (
              <option value="" disabled>
                Selecione uma opção
              </option>
            )}
            {options.length > 0
              ? options.map((opt) => (
                  <option key={opt.value || '__all__'} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center text-text-muted"
            aria-hidden="true"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 20 20" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l4 4l4-4" />
            </svg>
          </div>
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
          <p id={`${uniqueId}-helper`} className="mt-1.5 text-sm text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
