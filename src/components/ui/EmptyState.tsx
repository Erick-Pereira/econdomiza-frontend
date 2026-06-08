import { Button } from './Button';
import { motion } from 'framer-motion';

export interface EmptyStateProps {
  /** Ícone de estado vazio — preferencialmente vetorial Lucide */
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Componente de Estado Vazio — conforme diretriz UI/UX
 * - Iconografia limpa de peso uniforme (Lucide)
 * - Mensagem explicativa de causa raiz
 * - CTA claro para caminho de saída funcional
 * - Layout centralizado com respiro adequado
 */
export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4 text-center">
      {/* Ícone centralizado — Lucide React consistente */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }}
        className="mb-6 rounded-full bg-slate-50 p-6"
      >
        {icon}
      </motion.div>

      {/* Títulos e descrições com hierarquia tipográfica */}
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>

      {description && <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>}

      {/* CTA — apenas quando definido */}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-6" variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
