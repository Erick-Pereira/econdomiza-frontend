import { type ReactNode } from 'react';

export interface FormErrorProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

// ============================================
// ESTILOS DE ERRO — Tokens semânticos e acessibilidade
// ============================================
const ERROR_STYLE = 'text-status-error';

// ============================================
// COMPONENTE FORM ERROR — Tokens semânticos e acessibilidade
// ============================================
export const FormError: React.FC<FormErrorProps> = ({ children, icon, className = '' }) => {
  return (
    <div role="alert" aria-live="polite" className={'flex items-start gap-2 text-sm ' + (className || '')}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className={ERROR_STYLE}>{children}</span>
    </div>
  );
};
