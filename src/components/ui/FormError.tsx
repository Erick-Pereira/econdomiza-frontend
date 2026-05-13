import { type ReactNode } from 'react';

export interface FormErrorProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ children, icon, className = '' }) => {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-2 text-sm ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="text-red-600">{children}</span>
    </div>
  );
};