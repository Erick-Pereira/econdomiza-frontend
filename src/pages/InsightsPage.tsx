import React, { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { PageFatalErrorState, PageLoadingState } from '../components/layout/PageLoadStates';
import { Badge, Button } from '../components/ui';
import {
  useInsightsBundle,
  useInsightsNarrative,
  useInsightsRecalculate,
} from '../features/insights/hooks/useInsightsData';
import type { OperationalInsight } from '../features/insights/lib/insights-model';
import { formatApiError } from '../lib/api-error-message';
import { cn } from '../lib/cn';

const InsightsPage: React.FC = () => {
  const { data, isLoading, isFetching, isError, error, refetch } = useInsightsBundle();
  const recalc = useInsightsRecalculate();
  const narrative = useInsightsNarrative();
  const [narrativeText, setNarrativeText] = useState<string | null>(null);
  const [narrativeIsFallback, setNarrativeIsFallback] = useState(false);

  const handleRecalc = async () => {
    try {
      await recalc.mutateAsync();
    } catch {
      /* handled by mutation state */
    }
  };

  const handleNarrative = async (items: OperationalInsight[]) => {
    if (items.length === 0) return;
    try {
      const parsed = await narrative.mutateAsync(items.slice(0, 5));
      setNarrativeText(parsed.executiveSummary);
      setNarrativeIsFallback(
        parsed.executiveSummary.includes('IA indisponível') ||
          parsed.executiveSummary.includes('Narração automática')
      );
    } catch (e) {
      setNarrativeText(formatApiError(e));
      setNarrativeIsFallback(false);
    }
  };

  if (isLoading) {
    return <PageLoadingState id="insights-page" message="Carregando insights…" skeletonMaxWidth={640} />;
  }

  if (isError && !data) {
    return (
      <PageFatalErrorState
        id="insights-page"
        message={formatApiError(error)}
        onRetry={() => void refetch()}
      />
    );
  }

  const bundle = data!;
  const items = bundle.envelope?.items ?? [];
  const partial = bundle.partialErrors?.join(' ');

  return (
    <div className="page w-full max-w-full min-w-0 overflow-x-hidden space-y-8" id="insights-page">
      <PageHeader
        eyebrow="Inteligência"
        title="Insights operacionais"
        description="Leitura consolidada de anomalias, benchmarks e conformidade — apoio à decisão da administradora."
        toolbar={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isFetching || recalc.isPending}
              onClick={() => void refetch()}
              icon={<RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden />}
            >
              Atualizar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={recalc.isPending}
              onClick={() => void handleRecalc()}
            >
              Recalcular
            </Button>
          </div>
        }
      />

      {partial && (
        <div
          className="rounded-xl border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm"
          role="status"
        >
          Dados parciais: {partial}
        </div>
      )}

      {bundle.envelope?.executiveSummary && (
        <section className="rounded-xl border border-surface-border bg-surface-card p-5 shadow-macro-sm">
          <h2 className="text-base font-semibold text-text-main">Resumo executivo</h2>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">{bundle.envelope.executiveSummary}</p>
          {items.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              disabled={narrative.isPending}
              onClick={() => void handleNarrative(items)}
              icon={<Sparkles className="h-4 w-4" aria-hidden />}
            >
              Gerar narrativa IA
            </Button>
          )}
          {narrativeText && (
            <p
              className={cn(
                'mt-4 rounded-lg p-4 text-sm leading-relaxed',
                narrativeIsFallback
                  ? 'border border-status-warning/30 bg-status-warning/10 text-text-main'
                  : 'bg-surface-muted text-text-main'
              )}
              role={narrativeIsFallback ? 'status' : undefined}
            >
              {narrativeText}
            </p>
          )}
        </section>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-macro-sm">
          <p className="text-xs font-semibold uppercase text-text-muted">Insights</p>
          <p className="mt-1 text-2xl font-bold">{items.length}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-macro-sm">
          <p className="text-xs font-semibold uppercase text-text-muted">Alertas cruzados</p>
          <p className="mt-1 text-2xl font-bold">{bundle.alerts.length}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-macro-sm">
          <p className="text-xs font-semibold uppercase text-text-muted">Score conformidade</p>
          <p className="mt-1 text-2xl font-bold">
            {bundle.complianceScore != null ? `${bundle.complianceScore}%` : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-macro-sm">
          <p className="text-xs font-semibold uppercase text-text-muted">Pendências</p>
          <p className="mt-1 text-2xl font-bold">{bundle.complianceOutstanding ?? '—'}</p>
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-surface-card shadow-macro-sm">
        <header className="border-b border-surface-border px-5 py-4">
          <h2 className="text-base font-semibold text-text-main">Insights detalhados</h2>
        </header>
        {items.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-text-muted">Nenhum insight disponível.</p>
        ) : (
          <ul className="divide-y divide-surface-border" role="list">
            {items.map((it) => (
              <li key={it.id} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-text-main">{it.title}</p>
                  <Badge
                    variant={
                      it.severity === 'high' ? 'error' : it.severity === 'medium' ? 'warning' : 'neutral'
                    }
                  >
                    {it.severity}
                  </Badge>
                </div>
                <p className="text-sm text-text-muted">{it.simpleExplanation || it.summary}</p>
                {it.recommendation && <p className="text-sm text-brand-primary">{it.recommendation}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default InsightsPage;
