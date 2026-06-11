import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn, focusRingClass } from '../../lib/cn';

// ============================================
// ESTILOS POR VARIANTE — Composição de classes
// ============================================
const VARIANT_STYLES: Record<ButtonVariant, string[]> = {
  primary: [
    'bg-brand-primary',
    'hover:bg-brand-secondary',
    'text-white',
    'rounded-lg', // atomic-md (8px)
    'shadow-macro-sm', // sombra com matização da cor primária
    'transition-all',
    'duration-200',
    'ease-in-out',
  ],

  secondary: [
    'bg-surface-background',
    'hover:bg-surface-border',
    'text-text-main',
    'border',
    'border-surface-border',
    'rounded-lg', // atomic-md (8px)
    'shadow-atomic', // sombra mínima
    'transition-all',
    'duration-200',
    'ease-in-out',
  ],

  outline: [
    'bg-transparent',
    'hover:bg-surface-muted',
    'text-brand-primary',
    'border',
    'border-brand-primary',
    'rounded-lg', // atomic-md (8px)
    'shadow-atomic',
    'transition-all',
    'duration-200',
    'ease-in-out',
  ],

  ghost: [
    'bg-transparent',
    'hover:bg-surface-muted',
    'text-text-muted',
    'rounded-lg', // atomic-md (8px)
    'shadow-none',
    'transition-all',
    'duration-200',
    'ease-in-out',
  ],

  danger: [
    'bg-status-error/10',
    'hover:bg-status-error/20',
    'text-status-error',
    'border',
    'border-status-error/30',
    'rounded-lg', // atomic-md (8px)
    'shadow-atomic',
    'transition-all',
    'duration-200',
    'ease-in-out',
  ],
};

// ============================================
// ESTILOS POR TAMANHO — Grade atômica (múltiplos de 4px/8px)
// ============================================
const SIZE_STYLES: Record<ButtonSize, string[]> = {
  sm: ['px-3', 'py-2', 'text-sm', 'min-h-[2.75rem]'],
  md: ['px-4', 'py-2.5', 'text-sm', 'min-h-[2.75rem]'],
  lg: ['px-6', 'py-3', 'text-base', 'min-h-[3rem]'],
};

// ============================================
// TIPOS E INTERFACES
// ============================================
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: ReactNode;
  loading?: boolean;
}

// ============================================
// COMPONENTE BUTTON — Micro-interações suaves
// ============================================
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      icon,
      className = '',
      loading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    // Estado de loading substitui conteúdo do botão
    const isLoadingIcon =
      loading && !children ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.062 1.638 5.625 4.5 5.291a7.938 7.938 0 015.7 5.7L12 21l3.5-3.5A7.962 7.962 0 0116 12H12z"
            stroke="currentColor"
          ></path>
        </svg>
      ) : null;

    // Estado de hover/active com interpolação temporal suave (0.2s)
    const getActiveClass = () => {
      if (variant === 'primary') return 'hover:opacity-90 active:opacity-100';
      if (variant === 'danger') return 'hover:bg-red-500/15 active:bg-red-500/20';
      return '';
    };

    const iconElement = icon ? (
      <span className="mr-2 -ml-1" aria-hidden="true">
        {icon}
      </span>
    ) : null;

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex',
          'items-center',
          'justify-center',
          'font-medium',
          'rounded-lg', // atomic-md (8px)
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          getActiveClass(),
          focusRingClass,
          'focus-visible:ring-offset-2 focus-visible:ring-offset-white',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
          fullWidth ? 'w-full' : '',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {isLoadingIcon}
        {!loading && iconElement}
        {!loading && children}
      </button>
    );
  }
);

Button.displayName = 'Button';
