import { type ReactNode } from 'react';

export interface FormSuccessMessageProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

// ============================================
// COMPONENTE FORM SUCCESS MESSAGE — Tokens semânticos e acessibilidade
// ============================================
export const FormSuccessMessage: React.FC<FormSuccessMessageProps> = ({ children, icon, className = '' }) => {
  return (
    <div role="status" aria-live="polite" className={`flex items-start gap-2 text-sm ${className}`}>
      {icon && (
        <span className="flex-shrink-0 text-status-success" style={{ color: '#22c55e' }}>
          {icon}
        </span>
      )}
      <span className="text-status-success" style={{ color: '#16a34a' }}>
        {children}
      </span>
    </div>
  );
};
