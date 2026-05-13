import { type ReactNode } from 'react';

export interface FormSuccessMessageProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export const FormSuccessMessage: React.FC<FormSuccessMessageProps> = ({ children, icon, className = '' }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2 text-sm ${className}`}
    >
      {icon && <span className="flex-shrink-0 text-green-600">{icon}</span>}
      <span className="text-green-700">{children}</span>
    </div>
  );
};