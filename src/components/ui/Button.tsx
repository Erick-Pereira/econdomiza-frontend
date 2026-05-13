import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const buttonStyles: Record<NonNullable<ButtonVariant>, string> = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300',
  outline: 'bg-transparent hover:bg-gray-50 text-indigo-600 border border-indigo-600',
  ghost: 'bg-transparent hover:bg-gray-50 text-gray-700',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow',
};

const sizeStyles: Record<NonNullable<ButtonSize>, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', fullWidth = false, icon, className = '', ...props }, ref) => {
    const iconElement = icon ? (
      <span className="mr-2 -ml-1">{icon}</span>
    ) : null;

    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center 
          font-medium rounded-lg transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${buttonStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {iconElement}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';