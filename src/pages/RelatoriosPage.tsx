import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { PageFatalErrorState } from '../components/layout/PageLoadStates';
import { Button, SkeletonLoading } from '../components/ui';
import {
  useRelatoriosData,
  useRelatoriosReportDownload,
} from '../features/relatorios/hooks/useRelatoriosData';
import { extractYearOverYearRows, formatYoyCell } from '../features/relatorios/lib/year-over-year-map';
import { cn } from '../lib/cn';

const moneyBr = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const RelatoriosPage: React.FC = () => {
  const { summary, yoy, partialError, isInitialLoading, isFetching, refetch } = useRelatoriosData();
  const download = useRelatoriosReportDownload();

  if (isInitialLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <SkeletonLoading size="lg" className="w-64 rounded-lg" />
        <SkeletonLoading size="md" className="w-full rounded-xl" />
      </div>
    );
  }

  if (!summary) {
    return (
      <PageFatalErrorState
        id="relatorios-page"
        message={partialError ?? 'Sem dados para relatórios.'}
        onRetry={() => void refetch()}
      />
    );
  }

  const yoyRows = extractYearOverYearRows(yoy);

  return (
    <div className="page w-full space-y-8" id="relatorios-page">
      <PageHeader
        eyebrow="Consolidação"
        title="Relatórios"
        description="Indicadores agregados e exportação PDF mensal, trimestral ou anual."
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

      {partialError && (
        <div
          className="rounded-xl border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm"
          role="status"
        >
          {partialError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Gasto processado', moneyBr(summary.gastoProcessado)],
          ['Em aberto', moneyBr(summary.valorEmAberto)],
          ['Auditorias', String(summary.auditoriasRealizadas)],
          ['Fornecedores', String(summary.fornecedoresCadastrados)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-macro-sm"
          >
            <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-surface-border bg-surface-card p-5 shadow-macro-sm">
        <h2 className="text-base font-semibold text-text-main">Exportar PDF</h2>
        <p className="mt-1 text-sm text-text-muted">Relatórios gerados pelo serviço de processamento.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(['monthly', 'quarterly', 'annual'] as const).map((period) => (
            <Button
              key={period}
              type="button"
              variant="outline"
              size="sm"
              disabled={download.isPending}
              onClick={() => void download.mutate(period)}
              icon={<Download className="h-4 w-4" aria-hidden />}
            >
              {period === 'monthly' ? 'Mensal' : period === 'quarterly' ? 'Trimestral' : 'Anual'}
            </Button>
          ))}
        </div>
        {download.isError && (
          <p className="mt-3 text-sm text-status-error">Falha no download. Tente novamente.</p>
        )}
      </section>

      {yoyRows.length > 0 && (
        <section className="overflow-x-auto rounded-xl border border-surface-border bg-surface-card shadow-macro-sm">
          <header className="border-b border-surface-border px-5 py-4">
            <h2 className="text-base font-semibold text-text-main">Comparativo ano a ano</h2>
          </header>
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border text-xs uppercase text-text-muted">
                <th className="px-5 py-3">Ano</th>
                <th className="px-5 py-3">Mês</th>
                <th className="px-5 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {yoyRows.map((row, i) => (
                <tr key={`${row.year}-${row.month}-${i}`}>
                  <td className="px-5 py-3">{row.year}</td>
                  <td className="px-5 py-3">{row.month}</td>
                  <td className="px-5 py-3 tabular-nums">{formatYoyCell(row.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};

export default RelatoriosPage;
