import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { PageFatalErrorState } from '../components/layout/PageLoadStates';
import { Badge, Button, SkeletonLoading } from '../components/ui';
import {
  tierBadgeClass,
  useFornecedoresList,
  useSupplierQualityAnalysis,
} from '../features/fornecedores/hooks/useFornecedoresData';
import { formatApiError } from '../lib/api-error-message';
import { cn } from '../lib/cn';

const moneyBr = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

type Tab = 'cadastro' | 'qualidade';

const FornecedoresPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('cadastro');
  const listQuery = useFornecedoresList();
  const qualityQuery = useSupplierQualityAnalysis();

  const isFetching = listQuery.isFetching || qualityQuery.isFetching;

  const refetch = () => {
    void listQuery.refetch();
    void qualityQuery.refetch();
  };

  if (listQuery.isLoading && qualityQuery.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <SkeletonLoading size="lg" className="w-64 rounded-lg" />
        <SkeletonLoading size="md" className="w-full rounded-xl" />
      </div>
    );
  }

  if (listQuery.isError && qualityQuery.isError) {
    return (
      <PageFatalErrorState
        id="fornecedores-page"
        message={formatApiError(listQuery.error ?? qualityQuery.error)}
        onRetry={refetch}
      />
    );
  }

  const suppliers = listQuery.data ?? [];
  const quality = qualityQuery.data;

  return (
    <div className="page w-full space-y-8" id="fornecedores-page">
      <PageHeader
        eyebrow="Cadastro"
        title="Fornecedores"
        description="Cadastro interno e análise de qualidade com base em despesas e conformidade."
        toolbar={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isFetching}
            onClick={refetch}
            icon={<RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden />}
          >
            Atualizar
          </Button>
        }
      />

      <div className="flex gap-2 rounded-xl border border-surface-border bg-surface-muted/50 p-1">
        {(['cadastro', 'qualidade'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              tab === t
                ? 'bg-surface-card text-brand-primary shadow-sm'
                : 'text-text-muted hover:text-text-main'
            )}
          >
            {t === 'cadastro' ? 'Cadastro' : 'Qualidade'}
          </button>
        ))}
      </div>

      {tab === 'cadastro' ? (
        <section className="rounded-xl border border-surface-border bg-surface-card shadow-macro-sm">
          {suppliers.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-text-muted">Nenhum fornecedor cadastrado.</p>
          ) : (
            <ul className="divide-y divide-surface-border" role="list">
              {suppliers.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-text-main">{s.name}</p>
                    <p className="text-sm text-text-muted">
                      {s.document || '—'} · {s.category}
                    </p>
                  </div>
                  <Badge variant={s.isActive ? 'ok' : 'neutral'}>{s.isActive ? 'Ativo' : 'Inativo'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className="space-y-6">
          {quality?.summary && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {[
                ['Total', quality.summary.totalSuppliers],
                ['Recomendados', quality.summary.recommendedCount],
                ['Atenção', quality.summary.attentionCount],
                ['Risco', quality.summary.highRiskCount],
              ].map(([label, val]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-macro-sm"
                >
                  <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{val}</p>
                </div>
              ))}
            </div>
          )}
          <section className="rounded-xl border border-surface-border bg-surface-card shadow-macro-sm">
            {(quality?.suppliers ?? []).length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-text-muted">Sem dados de qualidade.</p>
            ) : (
              <ul className="divide-y divide-surface-border" role="list">
                {quality!.suppliers.map((s) => (
                  <li key={s.supplierId} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-text-main">{s.name}</p>
                        <p className="text-sm text-text-muted">
                          {s.expenseCount} despesas · {moneyBr(s.totalSpent)}
                        </p>
                      </div>
                      <span className={tierBadgeClass(s.tier)}>{s.tierLabel}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default FornecedoresPage;
