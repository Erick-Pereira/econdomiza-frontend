import { type ReactNode } from 'react';
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
  brand: {
    primary: 'brand.primary',
  },
  text: {
    muted: 'text.muted',
  },
};

// ============================================
// TIPOS E INTERFACES
// ============================================
export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  message?: string;
  fullWidth?: boolean;
  children?: ReactNode;
}

// ============================================
// ESTILOS POR TAMANHO — Grade atômica (múltiplos de 4px/8px)
// ============================================
const sizes: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
};

// ============================================
// COMPONENTE LOADING SPINNER — Transições suaves e tokens semânticos
// ============================================
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  fullWidth = false,
  children,
}) => {
  return (
    <div
      className={cn('flex', 'items-center', 'justify-center', fullWidth ? 'w-full' : '')}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          'inline-block',
          'rounded-full',
          'border-transparent',
          'animate-spin',
          sizes[size],
          `border-[${DESIGN_TOKENS.brand.primary}]`
        )}
      />
      {message && (
        <span className="ml-3 text-sm text-text-muted" style={{ color: '#6b7280' }}>
          {message}
        </span>
      )}
      {/* Accessibility: hide from screen readers when animating */}
      <span className="sr-only">Carregando...</span>
      {children}
    </div>
  );
};
