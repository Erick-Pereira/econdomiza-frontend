import { type ReactNode } from 'react';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  message?: string;
  fullWidth?: boolean;
  children?: ReactNode;
}

const sizes: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
};

const sizesWithColor: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2 border-indigo-600',
  md: 'h-5 w-5 border-[3px] border-indigo-600',
  lg: 'h-8 w-8 border-4 border-indigo-600',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  fullWidth = false,
  children,
}) => {
  return (
    <div
      className={`flex items-center justify-center ${fullWidth ? 'w-full' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`
          inline-block rounded-full 
          border-transparent 
          animate-spin 
          ${sizes[size]}
          ${sizesWithColor[size]}
        `}
      />
      {message && (
        <span className="ml-3 text-sm text-gray-600">
          {message}
        </span>
      )}
      {/* Accessibility: hide from screen readers when animating */}
      <span className="sr-only">Carregando...</span>
      {children}
    </div>
  );
};