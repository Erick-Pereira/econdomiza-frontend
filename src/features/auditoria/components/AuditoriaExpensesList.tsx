import { Link } from 'react-router-dom';
import { ChevronRight, FileSearch } from 'lucide-react';
import { Badge } from '../../../components/ui';
import {
  approvalBadgeVariant,
  approvalStatusLabel,
  processingBadgeVariant,
  processingStatusLabel,
  type AuditoriaExpenseRow,
} from '../lib/expense-map';

const moneyBr = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

interface AuditoriaExpensesListProps {
  expenses: AuditoriaExpenseRow[];
  fetchError: string | null;
  readOnly?: boolean;
}

export function AuditoriaExpensesList({ expenses, fetchError, readOnly }: AuditoriaExpensesListProps) {
  return (
    <section
      className="rounded-xl border border-surface-border bg-surface-card shadow-macro-sm"
      aria-labelledby="auditoria-expenses-heading"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-5 py-4">
        <div>
          <h2 id="auditoria-expenses-heading" className="text-base font-semibold text-text-main">
            Despesas auditadas
          </h2>
          <p className="mt-0.5 text-sm text-text-muted">
            {readOnly
              ? 'Consulta de despesas processadas — sem permissão de upload.'
              : 'Documentos ingeridos e despesas normalizadas pelo pipeline.'}
          </p>
        </div>
        <span className="text-sm tabular-nums text-text-muted">{expenses.length} registo(s)</span>
      </header>

      <div className="p-3 sm:p-4">
        {fetchError ? (
          <div className="rounded-lg bg-status-error/5 px-4 py-8 text-center" role="alert">
            <FileSearch className="mx-auto mb-2 h-8 w-8 text-status-error" aria-hidden />
            <p className="text-sm font-medium text-text-main">Não foi possível carregar despesas</p>
            <p className="mt-1 text-sm text-text-muted">{fetchError}</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="rounded-lg bg-surface-muted px-4 py-10 text-center">
            <FileSearch className="mx-auto mb-2 h-8 w-8 text-text-muted" aria-hidden />
            <p className="text-sm font-medium text-text-main">Nenhuma despesa encontrada</p>
            <p className="mt-1 text-sm text-text-muted">
              {readOnly
                ? 'Ainda não há despesas publicadas para consulta.'
                : 'Envie o primeiro documento para iniciar a auditoria.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-3 py-2 font-semibold">Descrição</th>
                    <th className="px-3 py-2 font-semibold">Fornecedor</th>
                    <th className="px-3 py-2 font-semibold">Emissão</th>
                    <th className="px-3 py-2 font-semibold">Valor</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                    <th className="px-3 py-2 font-semibold sr-only">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="group hover:bg-surface-muted/60">
                      <td className="max-w-[220px] truncate px-3 py-3 font-medium text-text-main">
                        {expense.description}
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-3 text-text-muted">
                        {expense.supplierName || '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-text-muted">
                        {expense.issueDateLabel}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums text-text-main">
                        {moneyBr(expense.totalAmount)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant={processingBadgeVariant(expense.processingStatus)}>
                            {processingStatusLabel(expense.processingStatus)}
                          </Badge>
                          <Badge variant={approvalBadgeVariant(expense.approvalStatus)}>
                            {approvalStatusLabel(expense.approvalStatus)}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          to={`/compras/${encodeURIComponent(expense.id)}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary opacity-0 transition-opacity group-hover:opacity-100 hover:text-brand-secondary focus:opacity-100"
                        >
                          Detalhe
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="space-y-3 md:hidden" role="list">
              {expenses.map((expense) => (
                <li key={expense.id}>
                  <Link
                    to={`/compras/${encodeURIComponent(expense.id)}`}
                    className="block rounded-xl border border-surface-border bg-surface-muted/30 p-4 transition-colors hover:border-brand-primary/30 hover:bg-surface-muted/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-text-main">{expense.description}</p>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {expense.supplierName || 'Sem fornecedor'} · {expense.issueDateLabel}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-text-main">
                        {moneyBr(expense.totalAmount)}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant={processingBadgeVariant(expense.processingStatus)}>
                        {processingStatusLabel(expense.processingStatus)}
                      </Badge>
                      <Badge variant={approvalBadgeVariant(expense.approvalStatus)}>
                        {approvalStatusLabel(expense.approvalStatus)}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
