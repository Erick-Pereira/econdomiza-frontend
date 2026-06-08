import React, { forwardRef } from 'react';
import { cn, focusRingClass, transitionInteractiveClass } from '../../lib/cn';

const INPUT_BASE = [
  'flex-1 min-w-0 w-full px-3 py-2 text-sm text-text-main',
  'bg-surface-card border border-surface-border rounded-xl shadow-atomic',
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

const ERROR_TEXT_STYLES = ['text-xs', 'text-status-error', 'mt-1'].join(' ');

const HELPER_TEXT_STYLES = ['text-xs', 'text-text-muted', 'mt-1'].join(' ');

// ============================================
// TIPOS E INTERFACES
// ============================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helperText?: string;
  label?: React.ReactNode; /* Label opcional — wrapper visual (não atributo HTML) */
}

// ============================================
// COMPONENTE INPUT — Transições suaves e tokens semânticos
// ============================================
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, helperText, label, id, ...props }) => {
    // Renderização com label opcional (wrapper visual, não atributo HTML)
    if (label) {
      return (
        <div className="w-full space-y-1.5">
          {/* Label semântico — A11y */}
          <label htmlFor={id} className="block text-sm font-medium text-text-main">
            {label}
          </label>

          <div className="w-full">
            <input {...props} id={id} className={cn(INPUT_BASE, error && ERROR_STYLES, className)} />

            {/* Mensagem de erro com alto contraste — Acessibilidade conforme diretriz */}
            {error && <p className={ERROR_TEXT_STYLES}>{error}</p>}

            {/* Texto helper opcional */}
            {!error && helperText && <p className={HELPER_TEXT_STYLES}>{helperText}</p>}
          </div>
        </div>
      );
    }

    // Renderização sem label (comportamento original)
    return (
      <div className="w-full">
        <input {...props} className={cn(INPUT_BASE, error && ERROR_STYLES, className)} />

        {/* Mensagem de erro com alto contraste */}
        {error && <p className={ERROR_TEXT_STYLES}>{error}</p>}

        {/* Texto helper opcional */}
        {!error && helperText && <p className={HELPER_TEXT_STYLES}>{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
