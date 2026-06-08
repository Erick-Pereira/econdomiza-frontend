import React, { useMemo, useState } from 'react';

import { RefreshCw, SlidersHorizontal } from 'lucide-react';

import { PageHeader } from '../components/layout/PageHeader';

import { PageFatalErrorState } from '../components/layout/PageLoadStates';

import { Button, Select, SkeletonLoading } from '../components/ui';

import { useAuth } from '../context/AuthContext';

import { mapAuditoriaExpenseRow } from '../features/auditoria/lib/expense-map';

import { ComprasExpenseListItem } from '../features/compras/components/ComprasExpenseListItem';

import { useComprasApproval, useComprasExpenses } from '../features/compras/hooks/useComprasExpenses';

import { COMPRAS_FILTERS, type ComprasFilterKey } from '../features/compras/lib/compras-filters';

import { canApproveCompras } from '../lib/permissions/rbac';

import { formatApiError } from '../lib/api-error-message';

import { cn } from '../lib/cn';

const moneyBr = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const ComprasPage: React.FC = () => {
  const { profile } = useAuth();

  const canApprove = canApproveCompras(profile?.role);

  const [filter, setFilter] = useState<ComprasFilterKey>('');

  const { data, isLoading, isFetching, isError, error, refetch } = useComprasExpenses(filter);

  const approval = useComprasApproval(filter);

  const expenses = useMemo(
    () => (data?.rows ?? []).map((r) => mapAuditoriaExpenseRow(r)),

    [data?.rows]
  );

  const handleApproval = async (id: string, approve: boolean) => {
    try {
      await approval.mutateAsync({ id, approve });
    } catch (e) {
      alert(formatApiError(e));
    }
  };

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
            ? 'Revise despesas cadastradas pela administradora e registre aprovação ou reprovação.'
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

      <div className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-macro-sm">
        <div className="w-full sm:max-w-md">
          <Select
            label="Filtrar por estado"
            id="compras-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as ComprasFilterKey)}
            options={COMPRAS_FILTERS}
            icon={<SlidersHorizontal className="h-4 w-4" aria-hidden />}
          />
        </div>
      </div>

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
          <p className="px-5 py-12 text-center text-sm text-text-muted">Nenhuma despesa encontrada.</p>
        ) : (
          <ul className="divide-y divide-surface-border" role="list">
            {expenses.map((exp) => (
              <ComprasExpenseListItem
                key={exp.id}
                expense={exp}
                canApprove={canApprove}
                approvalPending={approval.isPending}
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
