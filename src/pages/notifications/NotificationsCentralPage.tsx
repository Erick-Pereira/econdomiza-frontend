import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthSession } from '../../context/AuthSessionContext';
import { formatApiError } from '../../lib/api-error-message';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageFatalErrorState, PageLoadingState } from '../../components/layout/PageLoadStates';
import { Badge, Button } from '../../components/ui';
import { cn } from '../../lib/cn';
import {
  useNotificationsDashboard,
  useNotificationsDeliveries,
  useNotificationsMeta,
  useNotificationRetryDelivery,
} from '../../features/notificacoes/hooks/useNotificationsHubData';
import {
  deliveryPriority,
  EMPTY_DASHBOARD,
  pickNum,
  pickStr,
  severityPt,
  sortDeliveriesRecent,
  statusPt,
} from '../../features/notificacoes/lib/notifications-model';
import type { DeliveryListParams } from '../../features/notificacoes/query-keys';
import NotificationsPreferencesPanel from './NotificationsPreferencesPanel';

type Visao = 'recentes' | 'historico' | 'preferencias' | 'canais';

const STATUS_BADGE: Record<string, 'warning' | 'ok' | 'error' | 'neutral'> = {
  Pending: 'warning',
  Sent: 'ok',
  Failed: 'error',
  Suppressed: 'neutral',
  Filtered: 'neutral',
};

function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
  onClick,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: 'default' | 'pending' | 'ok' | 'risk' | 'muted';
  onClick: () => void;
}) {
  const toneClass =
    tone === 'pending'
      ? 'border-status-warning/40 bg-status-warning/5'
      : tone === 'ok'
        ? 'border-status-success/40 bg-status-success/5'
        : tone === 'risk'
          ? 'border-status-error/40 bg-status-error/5'
          : tone === 'muted'
            ? 'border-surface-border bg-surface-muted/50'
            : 'border-surface-border bg-surface-card';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border p-4 text-left shadow-macro-sm transition hover:border-brand-primary/40 hover:shadow-macro-md',
        toneClass
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</span>
      <span className="mt-1 block text-2xl font-bold text-text-main">{value}</span>
      {hint ? <span className="mt-1 block text-xs text-text-muted">{hint}</span> : null}
    </button>
  );
}

function DeliveryCard({
  row,
  actionId,
  onRetry,
  onFilterStatus,
  showCorrelation,
}: {
  row: Record<string, unknown>;
  actionId: string | null;
  onRetry: (id: string) => void;
  onFilterStatus?: (status: string) => void;
  showCorrelation?: boolean;
}) {
  const id = pickStr(row, 'id', 'Id');
  const st = pickStr(row, 'status', 'Status');
  const sev = pickStr(row, 'severity', 'Severity');
  const pr = deliveryPriority(row);
  const canRetry = st === 'Failed' && id !== '—';
  const sum = pickStr(row, 'payloadSummary', 'PayloadSummary');
  const channel = pickStr(row, 'channel', 'Channel');
  const opLink = pickStr(row, 'operationalLink', 'OperationalLink');

  return (
    <li
      className={cn(
        'space-y-3 px-5 py-4',
        pr === 'critico' && 'bg-status-error/5',
        pr === 'atencao' && 'bg-status-warning/5'
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_BADGE[st] ?? 'neutral'}>{statusPt(st)}</Badge>
        <Badge variant={sev.toLowerCase().includes('crit') ? 'error' : 'neutral'}>{severityPt(sev)}</Badge>
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{channel}</span>
      </div>
      {showCorrelation && (
        <p className="font-mono text-xs text-text-muted">{pickStr(row, 'correlationId', 'CorrelationId')}</p>
      )}
      <p className="text-sm text-text-main">{sum.length > 200 ? `${sum.slice(0, 200)}…` : sum}</p>
      <div className="flex flex-col gap-2 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>{pickStr(row, 'createdAt', 'CreatedAt')}</span>
        {pickNum(row, 'retryCount', 'RetryCount') > 0 && (
          <span>Reenvios: {pickNum(row, 'retryCount', 'RetryCount')}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {canRetry ? (
          <Button type="button" size="sm" disabled={actionId === id} onClick={() => onRetry(id)}>
            {actionId === id ? 'A reenviar…' : 'Tentar de novo'}
          </Button>
        ) : null}
        {opLink !== '—' && (
          <a
            className="inline-flex items-center rounded-lg border border-surface-border bg-surface-background px-3 py-1.5 text-sm font-medium text-text-main shadow-atomic transition hover:bg-surface-muted"
            href={opLink}
            target="_blank"
            rel="noreferrer"
          >
            Abrir contexto
          </a>
        )}
        {onFilterStatus ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onFilterStatus(st)}>
            Ver no histórico
          </Button>
        ) : null}
      </div>
    </li>
  );
}

const NotificationsCentralPage: React.FC = () => {
  const { profile } = useAuthSession();
  const userId = profile?.id?.trim() ?? '';
  const [searchParams, setSearchParams] = useSearchParams();

  const visao = (searchParams.get('visao') as Visao) || 'recentes';
  const estadoFiltro = searchParams.get('estado') ?? '';
  const canalFiltro = searchParams.get('canal') ?? '';
  const pagina = Math.max(1, Number(searchParams.get('pagina') || '1') || 1);
  const [canalDraft, setCanalDraft] = useState(canalFiltro);

  useEffect(() => {
    setCanalDraft(canalFiltro);
  }, [canalFiltro, visao]);

  const setVisao = (v: Visao) => {
    const next = new URLSearchParams(searchParams);
    if (v === 'recentes') {
      next.delete('visao');
      next.delete('estado');
      next.delete('canal');
      next.delete('pagina');
    } else {
      next.set('visao', v);
      if (v !== 'historico') {
        next.delete('estado');
        next.delete('canal');
        next.delete('pagina');
      }
    }
    setSearchParams(next, { replace: true });
  };

  const setHistoricoFiltros = (patch: { estado?: string; canal?: string; pagina?: number }) => {
    const next = new URLSearchParams(searchParams);
    next.set('visao', 'historico');
    if (patch.estado !== undefined) {
      if (patch.estado) next.set('estado', patch.estado);
      else next.delete('estado');
    }
    if (patch.canal !== undefined) {
      if (patch.canal) next.set('canal', patch.canal);
      else next.delete('canal');
    }
    if (patch.pagina !== undefined) {
      if (patch.pagina <= 1) next.delete('pagina');
      else next.set('pagina', String(patch.pagina));
    }
    setSearchParams(next, { replace: true });
  };

  const deliveryParams: DeliveryListParams = useMemo(
    () => ({
      visao: visao === 'historico' ? 'historico' : 'recentes',
      page: visao === 'historico' ? pagina : 1,
      pageSize: visao === 'historico' ? 20 : 30,
      status: estadoFiltro.trim() || undefined,
      channel: canalFiltro.trim() || undefined,
    }),
    [visao, pagina, estadoFiltro, canalFiltro]
  );

  const {
    dashboard: dash,
    isLoading: dashLoading,
    errorMessage: dashError,
    refetch: refetchDashboard,
  } = useNotificationsDashboard(userId);

  const {
    page: rawPage,
    isLoading: delLoading,
    errorMessage: delError,
    refetch: refetchDeliveries,
  } = useNotificationsDeliveries(userId, deliveryParams);

  const {
    gov,
    templates,
    isLoading: metaLoading,
    errorMessage: metaError,
  } = useNotificationsMeta(visao === 'canais');

  const retryDelivery = useNotificationRetryDelivery(userId);
  const [retryError, setRetryError] = useState<string | null>(null);

  const refetchAll = async () => {
    await Promise.all([refetchDashboard(), refetchDeliveries()]);
  };

  const d = dash ?? EMPTY_DASHBOARD;

  const displayRows = useMemo(() => {
    const items = rawPage?.items ?? [];
    return visao === 'recentes' ? sortDeliveriesRecent(items) : items;
  }, [rawPage, visao]);

  const onRetry = async (deliveryId: string) => {
    if (!userId) return;
    setRetryError(null);
    try {
      await retryDelivery.mutateAsync(deliveryId);
    } catch (e) {
      setRetryError(formatApiError(e));
    }
  };

  const actionId = retryDelivery.isPending ? (retryDelivery.variables ?? null) : null;
  const bannerError = retryError ?? dashError ?? delError;

  const total = rawPage?.total ?? 0;
  const pageSize = rawPage?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = rawPage?.page ?? pagina;

  const criticoCount = useMemo(
    () => displayRows.filter((r) => deliveryPriority(r) === 'critico').length,
    [displayRows]
  );

  const initialLoad = dashLoading && !dash && !dashError;
  if (initialLoad) {
    return <PageLoadingState id="notif-central" message="Carregando notificações…" skeletonMaxWidth={720} />;
  }

  if (dashError && !dash && userId) {
    return <PageFatalErrorState id="notif-central" message={dashError} onRetry={() => void refetchAll()} />;
  }

  return (
    <div className="page w-full max-w-full min-w-0 space-y-8 overflow-x-hidden" id="notif-central">
      <PageHeader
        eyebrow="Alertas e auditoria"
        title="Central de notificações"
        description="Acompanhe envios ligados a alertas e fiscalização: o que foi entregue, o que falhou e preferências de canal."
        layout="stack"
        quickLinks={[{ to: '/alertas', label: 'Alertas do mercado' }]}
        toolbar={
          <Button type="button" variant="secondary" size="sm" onClick={() => void refetchAll()}>
            Atualizar
          </Button>
        }
      />

      {bannerError && (
        <div
          className="rounded-xl border border-status-error/30 bg-status-error/10 px-4 py-3 text-sm text-text-main"
          role="alert"
        >
          {bannerError}
        </div>
      )}

      {!userId && (
        <div className="rounded-xl border border-status-error/30 bg-status-error/10 px-4 py-3 text-sm text-text-main">
          Faça login para ver notificações.
        </div>
      )}

      {userId && d.failed > 0 && visao === 'recentes' && (
        <div
          className="rounded-xl border border-status-error/30 bg-status-error/10 px-4 py-3 text-sm text-text-main"
          role="status"
        >
          <strong>{d.failed}</strong> envio(s) em falha — reveja em «Histórico» com filtro «Falhou» ou tente
          reenviar cada item.
        </div>
      )}

      {userId && criticoCount > 0 && visao === 'recentes' && (
        <div
          className="rounded-xl border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm text-text-main"
          role="status"
        >
          {criticoCount} notificação(ões) nesta lista com prioridade alta ou falha.
        </div>
      )}

      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        role="group"
        aria-label="Resumo de entregas"
      >
        <KpiCard
          label="Total"
          value={d.total}
          hint="Histórico completo"
          onClick={() => setHistoricoFiltros({ estado: '', canal: '', pagina: 1 })}
        />
        <KpiCard
          label="Pendentes"
          value={d.pending}
          tone="pending"
          onClick={() => setHistoricoFiltros({ estado: 'Pending', canal: '', pagina: 1 })}
        />
        <KpiCard
          label="Enviadas"
          value={d.sent}
          tone="ok"
          onClick={() => setHistoricoFiltros({ estado: 'Sent', canal: '', pagina: 1 })}
        />
        <KpiCard
          label="Falhas"
          value={d.failed}
          tone="risk"
          onClick={() => setHistoricoFiltros({ estado: 'Failed', canal: '', pagina: 1 })}
        />
        <KpiCard
          label="Suprimidas"
          value={d.suppressed}
          tone="muted"
          onClick={() => setHistoricoFiltros({ estado: 'Suppressed', canal: '', pagina: 1 })}
        />
        <KpiCard
          label="Filtradas"
          value={d.filtered}
          tone="muted"
          onClick={() => setHistoricoFiltros({ estado: 'Filtered', canal: '', pagina: 1 })}
        />
      </div>

      <div
        className="flex flex-wrap gap-2 rounded-xl border border-surface-border bg-surface-card p-2 shadow-macro-sm"
        role="tablist"
        aria-label="Seções"
      >
        {(
          [
            ['recentes', 'Recentes'],
            ['historico', 'Histórico'],
            ['preferencias', 'Preferências'],
            ['canais', 'Canais e modelos'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={visao === key}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition',
              visao === key
                ? 'bg-brand-primary text-white shadow-macro-sm'
                : 'text-text-muted hover:bg-surface-muted'
            )}
            onClick={() => setVisao(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {visao === 'recentes' && (
        <section
          className="rounded-xl border border-surface-border bg-surface-card shadow-macro-sm"
          aria-label="Notificações recentes"
        >
          <header className="border-b border-surface-border px-5 py-4">
            <h2 className="text-base font-semibold text-text-main">Últimas entregas</h2>
            <p className="mt-1 text-sm text-text-muted">
              Ordenadas por urgência (falhas e pendentes primeiro). Para mais linhas ou filtros use
              «Histórico».
            </p>
          </header>
          {delLoading && !rawPage ? (
            <p className="px-5 py-8 text-sm text-text-muted">Carregando…</p>
          ) : displayRows.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-text-muted">Sem notificações nesta vista.</p>
          ) : (
            <ul className="divide-y divide-surface-border" role="list">
              {displayRows.map((r) => (
                <DeliveryCard
                  key={pickStr(r, 'id', 'Id')}
                  row={r}
                  actionId={actionId}
                  onRetry={(id) => void onRetry(id)}
                  onFilterStatus={(st) => setHistoricoFiltros({ estado: st, pagina: 1 })}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {visao === 'historico' && (
        <section className="space-y-4" aria-label="Histórico de entregas">
          <div className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-macro-sm">
            <h2 className="text-base font-semibold text-text-main">Histórico e filtros</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(200px,280px)_minmax(200px,1fr)_auto_auto] md:items-end">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-text-main">Estado</span>
                <select
                  className="rounded-lg border border-surface-border bg-surface-background px-3 py-2 text-sm"
                  value={estadoFiltro}
                  onChange={(e) => setHistoricoFiltros({ estado: e.target.value, pagina: 1 })}
                >
                  <option value="">Todos</option>
                  <option value="Pending">Pendente</option>
                  <option value="Sent">Enviada</option>
                  <option value="Failed">Falhou</option>
                  <option value="Suppressed">Suprimida</option>
                  <option value="Filtered">Filtrada</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-text-main">Canal</span>
                <input
                  type="search"
                  className="rounded-lg border border-surface-border bg-surface-background px-3 py-2 text-sm"
                  placeholder="email, sms…"
                  value={canalDraft}
                  onChange={(e) => setCanalDraft(e.target.value)}
                />
              </label>
              <Button
                type="button"
                size="sm"
                onClick={() => setHistoricoFiltros({ canal: canalDraft.trim(), pagina: 1 })}
              >
                Aplicar canal
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => void refetchDeliveries()}>
                Recarregar
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-card shadow-macro-sm">
            {delLoading && !rawPage ? (
              <p className="px-5 py-8 text-sm text-text-muted">Carregando…</p>
            ) : displayRows.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-text-muted">
                Sem registos com estes filtros.
              </p>
            ) : (
              <ul className="divide-y divide-surface-border" role="list">
                {displayRows.map((r) => (
                  <DeliveryCard
                    key={pickStr(r, 'id', 'Id')}
                    row={r}
                    actionId={actionId}
                    onRetry={(id) => void onRetry(id)}
                    showCorrelation
                  />
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={currentPage <= 1 || delLoading}
              onClick={() => setHistoricoFiltros({ pagina: currentPage - 1 })}
            >
              Anterior
            </Button>
            <span className="text-sm text-text-muted">
              Página {currentPage} de {totalPages} ({total} linhas)
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={currentPage >= totalPages || delLoading}
              onClick={() => setHistoricoFiltros({ pagina: currentPage + 1 })}
            >
              Seguinte
            </Button>
          </div>
        </section>
      )}

      {visao === 'preferencias' && (
        <section
          className="rounded-xl border border-surface-border bg-surface-card p-5 shadow-macro-sm"
          aria-label="Preferências"
        >
          <h2 className="text-base font-semibold text-text-main">As suas preferências</h2>
          <p className="mt-1 text-sm text-text-muted">Alterações aplicam-se à sua conta neste condomínio.</p>
          <div className="mt-4">
            <NotificationsPreferencesPanel userId={userId} profileEmail={profile?.email} />
          </div>
        </section>
      )}

      {visao === 'canais' && (
        <section className="space-y-6" aria-label="Canais e modelos de mensagem">
          {metaLoading && <p className="text-sm text-text-muted">Carregando dados do serviço…</p>}
          {metaError && (
            <div className="rounded-xl border border-status-error/30 bg-status-error/10 px-4 py-3 text-sm">
              {metaError}
            </div>
          )}
          {!metaLoading && gov && (
            <>
              <div>
                <h2 className="text-base font-semibold text-text-main">Canais disponíveis</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Formas como o sistema pode contactar utilizadores.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {gov.channels.map((c) => (
                    <article
                      key={String(c.code ?? c.displayName)}
                      className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-macro-sm"
                    >
                      <h3 className="font-medium text-text-main">
                        {String(c.displayName ?? c.code ?? 'Canal')}
                      </h3>
                      <p className="mt-1 font-mono text-xs text-text-muted">{String(c.code ?? '—')}</p>
                      <p className="mt-2 text-sm text-text-muted">{String(c.description ?? '')}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-base font-semibold text-text-main">Regras gerais</h2>
                <details className="mt-3 rounded-xl border border-surface-border bg-surface-card p-4">
                  <summary className="cursor-pointer text-sm font-medium text-text-main">
                    Ver políticas técnicas (rate limit, deduplicação…)
                  </summary>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-border text-left text-text-muted">
                          <th className="py-2 pr-4">Chave</th>
                          <th className="py-2 pr-4">Valor</th>
                          <th className="py-2">Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gov.policies.map((p) => (
                          <tr key={String(p.key)} className="border-b border-surface-border/60">
                            <td className="py-2 pr-4 font-mono text-xs">{String(p.key ?? '—')}</td>
                            <td className="py-2 pr-4">{String(p.value ?? '—')}</td>
                            <td className="py-2 text-text-muted">{String(p.description ?? '—')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
                {gov.notes.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text-muted">
                    {gov.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h2 className="text-base font-semibold text-text-main">Modelos de mensagem</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Textos base usados pelo sistema (somente leitura).
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {templates.map((t) => (
                    <article
                      key={String(t.code ?? t.channel)}
                      className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-macro-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="neutral">{String(t.channel ?? '—')}</Badge>
                        <span className="font-mono text-xs text-text-muted">{String(t.code ?? '—')}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-text-main">
                        {String(t.subjectPattern ?? t.SubjectPattern ?? '—')}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {String(t.sourceEvent ?? t.SourceEvent ?? '')}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      <p className="text-sm text-text-muted">
        Dúvidas sobre alertas de preços e mercado? Consulte também a página de{' '}
        <Link to="/alertas" className="text-brand-primary hover:underline">
          Alertas
        </Link>
        .
      </p>
    </div>
  );
};

export default NotificationsCentralPage;
