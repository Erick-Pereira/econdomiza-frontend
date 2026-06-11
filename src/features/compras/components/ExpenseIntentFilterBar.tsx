import { Link } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '../../../lib/cn';
import {
  EXPENSE_INTENT_FILTERS,
  expenseListHref,
  type ExpenseIntentFilterKey,
} from '../../expenses/lib/expense-intent-filters';

type ExpenseIntentFilterBarProps = {
  /** Modo lista: select controlado. Modo links: navega para /compras?intenção=… */
  mode: 'select' | 'links';
  value?: ExpenseIntentFilterKey;
  onChange?: (value: ExpenseIntentFilterKey) => void;
  className?: string;
};

/** Filtros por intenção compartilhados entre Compras (aprovação) e Auditoria (consulta). */
export function ExpenseIntentFilterBar({
  mode,
  value = '',
  onChange,
  className,
}: ExpenseIntentFilterBarProps) {
  if (mode === 'select') {
    return (
      <section
        className={cn(
          'rounded-xl border border-surface-border bg-surface-card p-4 shadow-macro-sm',
          className
        )}
        aria-label="Filtros da lista de despesas"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-text-main">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
            <span className="leading-snug">Filtrar por intenção</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_INTENT_FILTERS.map((f) => (
              <button
                key={f.value || 'all'}
                type="button"
                onClick={() => onChange?.(f.value)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                  value === f.value
                    ? 'border-brand-primary bg-brand-primary/10 font-medium text-brand-primary'
                    : 'border-surface-border bg-surface-muted/40 text-text-muted hover:border-brand-primary/30 hover:text-text-main'
                )}
                aria-pressed={value === f.value}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <nav
      className={cn('rounded-xl border border-surface-border bg-surface-muted/40 px-4 py-3', className)}
      aria-label="Atalhos para despesas por intenção"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Lista mestra — filtrar por intenção
      </p>
      <ul className="flex flex-wrap gap-2">
        {EXPENSE_INTENT_FILTERS.filter((f) => f.value !== '').map((f) => (
          <li key={f.value}>
            <Link
              to={expenseListHref(f.value)}
              className="inline-flex rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-sm text-brand-primary hover:border-brand-primary/40 hover:bg-brand-primary/5"
            >
              {f.label}
            </Link>
          </li>
        ))}
        <li>
          <Link
            to={expenseListHref()}
            className="inline-flex rounded-lg px-3 py-1.5 text-sm text-text-muted hover:text-brand-primary"
          >
            Todas as despesas
          </Link>
        </li>
      </ul>
    </nav>
  );
}
