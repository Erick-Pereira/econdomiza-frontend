import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { RefreshCw } from 'lucide-react';

import { PageHeader } from '../components/layout/PageHeader';

import { PageFatalErrorState } from '../components/layout/PageLoadStates';

import { Button, SkeletonLoading } from '../components/ui';

import { EMPTY_VARIANTS } from '../components/ui/empty-state-variants';

import { useToast } from '../components/ui/useToast';

import { useAuth } from '../context/AuthContext';

import { mapAuditoriaExpenseRow } from '../features/auditoria/lib/expense-map';

import { ComprasExpenseListItem } from '../features/compras/components/ComprasExpenseListItem';

import { ExpenseIntentFilterBar } from '../features/compras/components/ExpenseIntentFilterBar';

import { useComprasApproval, useComprasExpenses } from '../features/compras/hooks/useComprasExpenses';

import { COMPRAS_FILTERS, type ComprasFilterKey } from '../features/compras/lib/compras-filters';

import { canApproveCompras } from '../lib/permissions/rbac';

import { formatApiError } from '../lib/api-error-message';

import { cn } from '../lib/cn';

const moneyBr = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

function parseIntentFilter(raw: string | null): ComprasFilterKey {
  if (!raw) return '';
  return COMPRAS_FILTERS.some((f) => f.value === raw) ? (raw as ComprasFilterKey) : '';
}

const ComprasPage: React.FC = () => {
  const { profile } = useAuth();
  const { add } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const canApprove = canApproveCompras(profile?.role);

  const intentFromUrl = searchParams.get('intencao');
  const filter = useMemo(() => parseIntentFilter(intentFromUrl), [intentFromUrl]);
  const [approvalErrors, setApprovalErrors] = useState<Record<string, string>>({});

  const { data, isLoading, isFetching, isError, error, refetch } = useComprasExpenses(filter);

  const approval = useComprasApproval(filter);

  const expenses = useMemo(
    () => (data?.rows ?? []).map((r) => mapAuditoriaExpenseRow(r)),

    [data?.rows]
  );

  const handleFilterChange = (value: ComprasFilterKey) => {
    if (value) {
      setSearchParams({ intencao: value }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleApproval = async (id: string, approve: boolean) => {
    try {
      await approval.mutateAsync({ id, approve });
      setApprovalErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      add(approve ? 'Despesa aprovada.' : 'Despesa reprovada.', 'success');
    } catch (e) {
      const msg = formatApiError(e);
      add(msg, 'error');
      setApprovalErrors((prev) => ({ ...prev, [id]: msg }));
    }
  };

  const emptyDescription =
    filter === 'approval:PendingApproval'
      ? 'Não há despesas aguardando aprovação neste momento.'
      : filter === 'processing:Failed'
        ? 'Nenhuma despesa com falha de processamento.'
        : 'Envie uma nota fiscal em Auditoria para iniciar o fluxo de aprovação.';

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <SkeletonLoading size="lg" className="w-64 rounded-lg" />

        <SkeletonLoading size="md" className="w-full rounded-xl" />
      </div>
    );
  }

  if (isError && !data) {
    return (
      <PageFatalErrorState id="compras-page" message={formatApiError(error)} onRetry={() => void refetch()} />
    );
  }

  return (
    <div className="page w-full max-w-full min-w-0 overflow-x-hidden space-y-8" id="compras-page">
      <PageHeader
        eyebrow="Governança"
        title="Aprovação de despesas"
        description={
          canApprove
            ? 'Revise despesas por intenção (aprovação, processamento, falhas) — mesma visão disponível em Auditoria.'
            : 'Consulta de despesas do condomínio — aprovação restrita a Síndico e Conselho.'
        }
        toolbar={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
            icon={<RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden />}
          >
            Atualizar
          </Button>
        }
      />

      <ExpenseIntentFilterBar mode="select" value={filter} onChange={handleFilterChange} />

      {isError && (
        <div className="banner banner--error" role="alert">
          {formatApiError(error)}
        </div>
      )}

      <section
        className={cn(
          'overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-macro-sm transition-opacity',

          isFetching && 'opacity-70'
        )}
        aria-busy={isFetching}
      >
        {expenses.length === 0 ? (
          EMPTY_VARIANTS.emptyList({
            title: 'Nenhuma despesa encontrada',
            description: emptyDescription,
            actionLabel: 'Ir para Auditoria',
            actionTo: '/auditoria',
          })
        ) : (
          <ul className="divide-y divide-surface-border" role="list">
            {expenses.map((exp) => (
              <ComprasExpenseListItem
                key={exp.id}
                expense={exp}
                canApprove={canApprove}
                approvalPending={approval.isPending}
                inlineError={approvalErrors[exp.id]}
                onApprove={(id, approve) => void handleApproval(id, approve)}
                formatMoney={moneyBr}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ComprasPage;
