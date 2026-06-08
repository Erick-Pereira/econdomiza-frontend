import React from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { PageFatalErrorState } from '../components/layout/PageLoadStates';
import { Button } from '../components/ui';
import { DashboardAlertsPanel } from '../features/dashboard/components/DashboardAlertsPanel';
import { DashboardComplianceCard } from '../features/dashboard/components/DashboardComplianceCard';
import { DashboardKpiGrid } from '../features/dashboard/components/DashboardKpiGrid';
import { DashboardPageSkeleton } from '../features/dashboard/components/DashboardPageSkeleton';
import { useDashboardData } from '../features/dashboard/hooks/useDashboardData';
import { cn } from '../lib/cn';

const DashboardPage: React.FC = () => {
  const {
    kpis,
    alerts,
    kpiError,
    alertsFetchError,
    highPriorityCount,
    isInitialLoading,
    isFetching,
    refetch,
  } = useDashboardData();

  if (isInitialLoading) {
    return <DashboardPageSkeleton />;
  }

  if (!kpis) {
    return (
      <PageFatalErrorState
        id="dashboard-page"
        message={kpiError ?? 'Sem dados do dashboard.'}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="page w-full max-w-full min-w-0 overflow-x-hidden space-y-8" id="dashboard-page">
      <PageHeader
        eyebrow="Início"
        title="Painel principal"
        description="Um olhar rápido sobre o que importa agora: valores, alertas e atalhos."
        toolbar={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
            icon={<RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden />}
          >
            {isFetching ? 'A atualizar…' : 'Atualizar'}
          </Button>
        }
      />

      {kpiError && (
        <div
          className="rounded-xl border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm text-text-main"
          role="status"
        >
          <strong className="font-semibold">Resumo parcial.</strong> Não foi possível carregar todos os
          indicadores: {kpiError}
        </div>
      )}

      {alertsFetchError && !kpiError && (
        <div
          className="rounded-xl border border-status-info/30 bg-status-info/10 px-4 py-3 text-sm text-text-main"
          role="status"
        >
          Os números do resumo estão disponíveis, mas a lista de alertas recentes falhou: {alertsFetchError}
        </div>
      )}

      <DashboardKpiGrid kpis={kpis} highPriorityCount={highPriorityCount} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <DashboardAlertsPanel alerts={alerts} fetchError={alertsFetchError} />
        <DashboardComplianceCard />
      </div>
    </div>
  );
};

export default DashboardPage;
