import { type ReactNode } from 'react';
import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility para mesclar classes Tailwind sem duplicação
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Componente Card Reutilizável — Governança Visual (React + Vite)
 * Conforme Diretriz Técnica de Refinamento de UI/UX, Engenharia Estética e Governança Visual
 */

export interface CardProps {
  children?: ReactNode;
  title?: string;
  subtitle?: string;
  description?: string;
  icon?: ReactNode;
  iconColor?: string;
  action?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  paddingY?: 'none' | 'sm' | 'md' | 'lg';
  hoverEffect?: boolean;
  className?: string;
}

// ============================================
// DESIGN TOKENS — Espaçamento baseado em grade atômica (4px/8px)
// ============================================
const PADDING_TOKENS: Record<string, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

const PADDING_Y_TOKENS: Record<string, string> = {
  none: 'py-0',
  sm: 'py-3',
  md: 'py-5',
  lg: 'py-6',
};

// ============================================
// ESTILOS DE HOVER — Micro-interações suaves
// ============================================
const HOVER_EFFECT_TOKENS = {
  base: ['transition-shadow', 'duration-200', 'ease-in-out', 'cursor-pointer'].join(' '),
  hoverBgHover: [
    'hover:shadow-macro-md', // sombra elevada com matização da cor primária
    'focus-within:ring-2',
    `focus-within:ring-[var(--brand-primary)]`,
  ].join(' '),
};

// ============================================
// COMPONENTE CARD — Arredondamento macroscópico (12-16px)
// ============================================
export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  description,
  icon,
  iconColor = 'text-brand-primary', // Indigo-600 - Cor primária da marca
  action,
  padding = 'md',
  paddingY,
  hoverEffect = true,
  className,
}) => {
  const paddingToken = cn(
    PADDING_TOKENS[padding] ?? PADDING_TOKENS.md,
    paddingY ? PADDING_Y_TOKENS[paddingY] : ''
  );

  return (
    <div
      className={cn(
        'bg-surface-background', // Fundo branco padrão
        'border border-surface-border', // Borda sutil em cinza (surface-border)
        'rounded-xl', // Arredondamento macroscópico (16px) conforme diretriz
        paddingToken,
        'shadow-macro-sm', // Sombra de alta dispersão e baixa opacidade com matização
        hoverEffect ? HOVER_EFFECT_TOKENS.hoverBgHover : '',
        className
      )}
    >
      {/* Cabeçalho do Card */}
      {(title || icon || action) && (
        <div
          className="flex items-start justify-between gap-4"
          style={{ paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}
        >
          <div className="flex items-center gap-3">
            {/* Ícone do Card */}
            {icon && (
              <span
                className={`p-2 rounded-lg ${iconColor}`}
                style={{ backgroundColor: 'rgba(26, 54, 93, 0.08)' }}
              >
                {icon}
              </span>
            )}

            {/* Título e Subtítulo */}
            <div className="flex flex-col">
              {title && (
                <h3 className="text-lg font-semibold text-text-main" style={{ color: '#1A1A1A' }}>
                  {title}
                </h3>
              )}
              {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
            </div>
          </div>

          {/* Ação do Card */}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {/* Conteúdo do Card */}
      <div>
        {children || description ? (
          <>
            {description && (
              <p className="text-text-muted text-sm mt-4" style={{ color: '#6b7280', lineHeight: '1.5' }}>
                {description}
              </p>
            )}
            {children}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Card;
