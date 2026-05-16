import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthSession } from '../../context/AuthSessionContext';
import { EcondomizaApi } from '../../services';
import { formatApiError } from '../../lib/api-error-message';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageLoadingState } from '../../components/layout/PageLoadStates';
import NotificationsPreferencesPanel from './NotificationsPreferencesPanel';

type DeliveryRow = Record<string, unknown>;
type Visao = 'recentes' | 'historico' | 'preferencias' | 'canais';

interface DashboardCounts {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  suppressed: number;
  filtered: number;
}

type GovChannel = { code?: string; displayName?: string; description?: string };
type GovPolicy = { key?: string; value?: string; description?: string };
type TemplateRow = {
  code?: string;
  channel?: string;
  subjectPattern?: string;
  bodyPattern?: string;
  sourceEvent?: string;
  SubjectPattern?: string;
  BodyPattern?: string;
  SourceEvent?: string;
};

function pickStr(r: DeliveryRow, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '—';
}

function pickNum(r: DeliveryRow, ...keys: string[]): number {
  for (const k of keys) {
    const v = r[k];
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function readDashboard(raw: unknown): DashboardCounts {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    total: Number(o.total ?? o.Total ?? 0),
    pending: Number(o.pending ?? o.Pending ?? 0),
    sent: Number(o.sent ?? o.Sent ?? 0),
    failed: Number(o.failed ?? o.Failed ?? 0),
    suppressed: Number(o.suppressed ?? o.Suppressed ?? 0),
    filtered: Number(o.filtered ?? o.Filtered ?? 0),
  };
}

function readItemsPage(raw: unknown): { items: DeliveryRow[]; total: number; page: number; pageSize: number } {
  const o = (raw ?? {}) as Record<string, unknown>;
  const itemsRaw = o.items ?? o.Items;
  const items = Array.isArray(itemsRaw) ? (itemsRaw as DeliveryRow[]) : [];
  return {
    items,
    total: Number(o.total ?? o.Total ?? items.length),
    page: Number(o.page ?? o.Page ?? 1),
    pageSize: Number(o.pageSize ?? o.PageSize ?? 20),
  };
}

function statusPt(st: string): string {
  const u = st.trim();
  switch (u) {
    case 'Pending':
      return 'Pendente';
    case 'Sent':
      return 'Enviada';
    case 'Failed':
      return 'Falhou';
    case 'Suppressed':
      return 'Suprimida';
    case 'Filtered':
      return 'Filtrada';
    default:
      return u || '—';
  }
}

function severityPt(sev: string): string {
  const u = sev.toUpperCase();
  if (u === 'CRITICAL') return 'Crítica';
  if (u === 'HIGH') return 'Alta';
  if (u === 'MEDIUM') return 'Média';
  if (u === 'LOW') return 'Baixa';
  if (u === 'INFO') return 'Info';
  return sev || '—';
}

function deliveryPriority(r: DeliveryRow): 'critico' | 'atencao' | 'normal' {
  const st = pickStr(r, 'status', 'Status');
  const sev = pickStr(r, 'severity', 'Severity').toUpperCase();
  if (st === 'Failed' || sev === 'CRITICAL') return 'critico';
  if (st === 'Pending' || sev === 'HIGH') return 'atencao';
  return 'normal';
}

function readGov(raw: unknown): {
  channels: GovChannel[];
  policies: GovPolicy[];
  notes: string[];
} {
  const o = (raw ?? {}) as Record<string, unknown>;
  const ch = o.channels ?? o.Channels;
  const pol = o.policies ?? o.Policies;
  const notes = o.operationalNotes ?? o.OperationalNotes;
  return {
    channels: Array.isArray(ch) ? (ch as GovChannel[]) : [],
    policies: Array.isArray(pol) ? (pol as GovPolicy[]) : [],
    notes: Array.isArray(notes) ? (notes as string[]).map(String) : [],
  };
}

function readTemplates(raw: unknown): TemplateRow[] {
  return Array.isArray(raw) ? (raw as TemplateRow[]) : [];
}

function slugStatus(st: string): string {
  const u = st.trim().toLowerCase();
  if (['pending', 'sent', 'failed', 'suppressed', 'filtered'].includes(u)) return u;
  return 'other';
}

function slugSeverity(sev: string): string {
  const u = sev.trim().toLowerCase();
  if (['critical', 'high', 'medium', 'low', 'info'].includes(u)) return u;
  return 'info';
}

function sortDeliveriesRecent(items: DeliveryRow[]): DeliveryRow[] {
  const rank = (r: DeliveryRow) => {
    const p = deliveryPriority(r);
    if (p === 'critico') return 0;
    if (p === 'atencao') return 1;
    return 2;
  };
  const t = (r: DeliveryRow) => {
    const s = pickStr(r, 'createdAt', 'CreatedAt');
    const n = new Date(s).getTime();
    return Number.isFinite(n) ? n : 0;
  };
  return [...items].sort((a, b) => {
    const dr = rank(a) - rank(b);
    if (dr !== 0) return dr;
    return t(b) - t(a);
  });
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

  const [dash, setDash] = useState<DashboardCounts | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);

  const [rawPage, setRawPage] = useState<{ items: DeliveryRow[]; total: number; page: number; pageSize: number } | null>(
    null
  );
  const [delLoading, setDelLoading] = useState(true);
  const [delError, setDelError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [gov, setGov] = useState<ReturnType<typeof readGov> | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!userId) {
      setDashError('Perfil sem identificador de utilizador.');
      setDashLoading(false);
      return;
    }
    try {
      setDashLoading(true);
      const { data } = await EcondomizaApi.notificationOperationalDashboard(userId);
      setDash(readDashboard(data));
      setDashError(null);
    } catch (e) {
      console.error(e);
      setDashError(formatApiError(e));
      setDash(null);
    } finally {
      setDashLoading(false);
    }
  }, [userId]);

  const loadDeliveries = useCallback(async () => {
    if (!userId) {
      setDelError('Perfil sem identificador de utilizador.');
      setDelLoading(false);
      return;
    }
    try {
      setDelLoading(true);
      const params: { status?: string; channel?: string; page: number; pageSize: number } = {
        page: visao === 'historico' ? pagina : 1,
        pageSize: visao === 'historico' ? 20 : 30,
      };
      if (estadoFiltro.trim()) params.status = estadoFiltro.trim();
      if (canalFiltro.trim()) params.channel = canalFiltro.trim();
      const { data } = await EcondomizaApi.notificationDeliveries(userId, params);
      setRawPage(readItemsPage(data));
      setDelError(null);
    } catch (e) {
      console.error(e);
      setDelError(formatApiError(e));
      setRawPage(null);
    } finally {
      setDelLoading(false);
    }
  }, [userId, visao, pagina, estadoFiltro, canalFiltro]);

  const loadMeta = useCallback(async () => {
    setMetaLoading(true);
    setMetaError(null);
    try {
      const [gRes, tRes] = await Promise.all([
        EcondomizaApi.notificationGovernance(),
        EcondomizaApi.notificationTemplates(),
      ]);
      setGov(readGov(gRes.data));
      setTemplates(readTemplates(tRes.data));
    } catch (e) {
      console.error(e);
      setMetaError(formatApiError(e));
      setGov(null);
      setTemplates([]);
    } finally {
      setMetaLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    void loadDeliveries();
  }, [loadDeliveries]);

  useEffect(() => {
    if (visao === 'canais') void loadMeta();
  }, [visao, loadMeta]);

  const d = dash ?? { total: 0, pending: 0, sent: 0, failed: 0, suppressed: 0, filtered: 0 };

  const displayRows = useMemo(() => {
    const items = rawPage?.items ?? [];
    return visao === 'recentes' ? sortDeliveriesRecent(items) : items;
  }, [rawPage, visao]);

  const onRetry = async (deliveryId: string) => {
    if (!userId) return;
    try {
      setActionId(deliveryId);
      await EcondomizaApi.notificationRetryDelivery(deliveryId, userId);
      await loadDeliveries();
      await loadDashboard();
    } catch (e) {
      console.error(e);
      setDelError(formatApiError(e));
    } finally {
      setActionId(null);
    }
  };

  const total = rawPage?.total ?? 0;
  const pageSize = rawPage?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = rawPage?.page ?? pagina;

  const criticoCount = useMemo(() => displayRows.filter((r) => deliveryPriority(r) === 'critico').length, [displayRows]);

  const initialLoad = dashLoading && !dash && !dashError;
  if (initialLoad) {
    return <PageLoadingState id="notif-central" message="Carregando notificações…" skeletonMaxWidth={720} />;
  }

  return (
    <div className="notif-hub" id="notif-central">
      <PageHeader
        eyebrow="Comunicações do condomínio"
        title="Central de notificações"
        description="Veja o que foi enviado, o que falhou e ajuste os seus canais em poucos cliques. Tudo num só sítio."
        layout="stack"
        quickLinks={[{ to: '/alertas', label: 'Alertas do mercado' }]}
        toolbar={
          <button
            type="button"
            className="btn-small secondary"
            onClick={() => {
              void Promise.all([loadDashboard(), loadDeliveries()]);
            }}
          >
            Atualizar
          </button>
        }
      />

      {(dashError || delError) && (
        <div className="banner banner--error" role="alert">
          {dashError || delError}
        </div>
      )}

      {!userId && <div className="banner banner--error">Faça login para ver notificações.</div>}

      {userId && d.failed > 0 && visao === 'recentes' && (
        <div className="obligation-hub__alert obligation-hub__alert--error" role="status">
          <strong>{d.failed}</strong> envio(s) em falha — reveja em «Histórico» com filtro «Falhou» ou tente reenviar
          cada item.
        </div>
      )}

      {userId && criticoCount > 0 && visao === 'recentes' && (
        <div className="obligation-hub__alert obligation-hub__alert--warning" role="status">
          {criticoCount} notificação(ões) nesta lista com prioridade alta ou falha — destacadas a vermelho.
        </div>
      )}

      <div className="notif-hub__kpis" role="group" aria-label="Resumo de entregas">
        <button
          type="button"
          className="notif-kpi notif-kpi--clickable"
          onClick={() => setHistoricoFiltros({ estado: '', canal: '', pagina: 1 })}
        >
          <span className="notif-kpi__label">Total</span>
          <span className="notif-kpi__value">{d.total}</span>
          <span className="notif-kpi__hint">Histórico completo</span>
        </button>
        <button
          type="button"
          className="notif-kpi notif-kpi--pendente notif-kpi--clickable"
          onClick={() => setHistoricoFiltros({ estado: 'Pending', canal: '', pagina: 1 })}
        >
          <span className="notif-kpi__label">Pendentes</span>
          <span className="notif-kpi__value">{d.pending}</span>
        </button>
        <button type="button" className="notif-kpi notif-kpi--ok notif-kpi--clickable" onClick={() => setHistoricoFiltros({ estado: 'Sent', canal: '', pagina: 1 })}>
          <span className="notif-kpi__label">Enviadas</span>
          <span className="notif-kpi__value">{d.sent}</span>
        </button>
        <button
          type="button"
          className="notif-kpi notif-kpi--risk notif-kpi--clickable"
          onClick={() => setHistoricoFiltros({ estado: 'Failed', canal: '', pagina: 1 })}
        >
          <span className="notif-kpi__label">Falhas</span>
          <span className="notif-kpi__value">{d.failed}</span>
        </button>
        <button
          type="button"
          className="notif-kpi notif-kpi--muted notif-kpi--clickable"
          onClick={() => setHistoricoFiltros({ estado: 'Suppressed', canal: '', pagina: 1 })}
        >
          <span className="notif-kpi__label">Suprimidas</span>
          <span className="notif-kpi__value">{d.suppressed}</span>
        </button>
        <button
          type="button"
          className="notif-kpi notif-kpi--muted notif-kpi--clickable"
          onClick={() => setHistoricoFiltros({ estado: 'Filtered', canal: '', pagina: 1 })}
        >
          <span className="notif-kpi__label">Filtradas</span>
          <span className="notif-kpi__value">{d.filtered}</span>
        </button>
      </div>

      <div className="obligation-segment notif-hub__segment" role="tablist" aria-label="Seções">
        <button type="button" role="tab" aria-selected={visao === 'recentes'} className={visao === 'recentes' ? 'is-active' : undefined} onClick={() => setVisao('recentes')}>
          Recentes
        </button>
        <button type="button" role="tab" aria-selected={visao === 'historico'} className={visao === 'historico' ? 'is-active' : undefined} onClick={() => setVisao('historico')}>
          Histórico
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={visao === 'preferencias'}
          className={visao === 'preferencias' ? 'is-active' : undefined}
          onClick={() => setVisao('preferencias')}
        >
          Preferências
        </button>
        <button type="button" role="tab" aria-selected={visao === 'canais'} className={visao === 'canais' ? 'is-active' : undefined} onClick={() => setVisao('canais')}>
          Canais e modelos
        </button>
      </div>

      {visao === 'recentes' && (
        <section className="notif-hub__section" aria-label="Notificações recentes">
          <h2 className="obligation-checklist__title">Últimas entregas</h2>
          <p className="op-muted op-small" style={{ marginTop: 0 }}>
            Ordenadas por urgência (falhas e pendentes primeiro). Para mais linhas ou filtros use «Histórico».
          </p>
          {delLoading && !rawPage ? (
            <p className="op-muted">Carregando…</p>
          ) : displayRows.length === 0 ? (
            <p className="empty-state">Sem notificações nesta vista.</p>
          ) : (
            <ul className="notif-delivery-list">
              {displayRows.map((r) => {
                const id = pickStr(r, 'id', 'Id');
                const st = pickStr(r, 'status', 'Status');
                const sev = pickStr(r, 'severity', 'Severity');
                const pr = deliveryPriority(r);
                const canRetry = st === 'Failed' && id !== '—';
                const sum = pickStr(r, 'payloadSummary', 'PayloadSummary');
                const channel = pickStr(r, 'channel', 'Channel');
                return (
                  <li key={id} className={`notif-delivery-card notif-delivery-card--${pr}`}>
                    <div className="notif-delivery-card__head">
                      <span className={`notif-pill notif-pill--status notif-pill--st-${slugStatus(st)}`}>{statusPt(st)}</span>
                      <span className={`notif-pill notif-pill--sev notif-pill--sev-${slugSeverity(sev)}`}>{severityPt(sev)}</span>
                      <span className="notif-delivery-card__channel">{channel}</span>
                    </div>
                    <p className="notif-delivery-card__summary">{sum.length > 160 ? `${sum.slice(0, 160)}…` : sum}</p>
                    <div className="notif-delivery-card__meta">
                      <span>{pickStr(r, 'createdAt', 'CreatedAt')}</span>
                      {pickNum(r, 'retryCount', 'RetryCount') > 0 && (
                        <span className="op-muted op-small">Reenvios: {pickNum(r, 'retryCount', 'RetryCount')}</span>
                      )}
                    </div>
                    <div className="notif-delivery-card__actions">
                      {canRetry ? (
                        <button type="button" className="btn-small" disabled={actionId === id} onClick={() => void onRetry(id)}>
                          {actionId === id ? 'A reenviar…' : 'Tentar de novo'}
                        </button>
                      ) : null}
                      {pickStr(r, 'operationalLink', 'OperationalLink') !== '—' && (
                        <a className="btn-small secondary" href={pickStr(r, 'operationalLink', 'OperationalLink')} target="_blank" rel="noreferrer">
                          Abrir contexto
                        </a>
                      )}
                      <button type="button" className="btn-small secondary" onClick={() => setHistoricoFiltros({ estado: st, pagina: 1 })}>
                        Ver no histórico
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {visao === 'historico' && (
        <section className="notif-hub__section" aria-label="Histórico de entregas">
          <h2 className="obligation-checklist__title">Histórico e filtros</h2>
          <div className="card notif-hub__filters">
            <div className="notif-filter-row">
              <label className="op-field op-field--inline">
                <span>Estado</span>
                <select value={estadoFiltro} onChange={(e) => setHistoricoFiltros({ estado: e.target.value, pagina: 1 })}>
                  <option value="">Todos</option>
                  <option value="Pending">Pendente</option>
                  <option value="Sent">Enviada</option>
                  <option value="Failed">Falhou</option>
                  <option value="Suppressed">Suprimida</option>
                  <option value="Filtered">Filtrada</option>
                </select>
              </label>
              <label className="op-field op-field--inline notif-filter-canal">
                <span>Canal</span>
                <input
                  type="search"
                  placeholder="email, sms…"
                  value={canalDraft}
                  onChange={(e) => setCanalDraft(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn-small"
                onClick={() => setHistoricoFiltros({ canal: canalDraft.trim(), pagina: 1 })}
              >
                Aplicar canal
              </button>
              <button type="button" className="btn-small secondary" onClick={() => void loadDeliveries()}>
                Recarregar lista
              </button>
            </div>
          </div>
          {delLoading && !rawPage ? (
            <p className="op-muted">Carregando…</p>
          ) : displayRows.length === 0 ? (
            <p className="empty-state">Sem registos com estes filtros.</p>
          ) : (
            <ul className="notif-delivery-list">
              {displayRows.map((r) => {
                const id = pickStr(r, 'id', 'Id');
                const st = pickStr(r, 'status', 'Status');
                const sev = pickStr(r, 'severity', 'Severity');
                const pr = deliveryPriority(r);
                const canRetry = st === 'Failed' && id !== '—';
                const sum = pickStr(r, 'payloadSummary', 'PayloadSummary');
                return (
                  <li key={id} className={`notif-delivery-card notif-delivery-card--${pr}`}>
                    <div className="notif-delivery-card__head">
                      <span className={`notif-pill notif-pill--status notif-pill--st-${slugStatus(st)}`}>{statusPt(st)}</span>
                      <span className={`notif-pill notif-pill--sev notif-pill--sev-${slugSeverity(sev)}`}>{severityPt(sev)}</span>
                      <span className="notif-delivery-card__channel">{pickStr(r, 'channel', 'Channel')}</span>
                    </div>
                    <p className="notif-delivery-card__mono notif-delivery-card__corr">
                      {pickStr(r, 'correlationId', 'CorrelationId')}
                    </p>
                    <p className="notif-delivery-card__summary">{sum}</p>
                    <div className="notif-delivery-card__meta">
                      <span>{pickStr(r, 'createdAt', 'CreatedAt')}</span>
                      <span className="op-muted op-small">Reenvios: {pickNum(r, 'retryCount', 'RetryCount')}</span>
                    </div>
                    <div className="notif-delivery-card__actions">
                      {canRetry ? (
                        <button type="button" className="btn-small" disabled={actionId === id} onClick={() => void onRetry(id)}>
                          {actionId === id ? 'A reenviar…' : 'Tentar de novo'}
                        </button>
                      ) : null}
                      {pickStr(r, 'operationalLink', 'OperationalLink') !== '—' && (
                        <a className="btn-small secondary" href={pickStr(r, 'operationalLink', 'OperationalLink')} target="_blank" rel="noreferrer">
                          Contexto
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="pagination-bar notif-hub__pager">
            <button
              type="button"
              className="btn-small secondary"
              disabled={currentPage <= 1 || delLoading}
              onClick={() => setHistoricoFiltros({ pagina: currentPage - 1 })}
            >
              Anterior
            </button>
            <span className="op-muted op-small">
              Página {currentPage} de {totalPages} ({total} linhas)
            </span>
            <button
              type="button"
              className="btn-small secondary"
              disabled={currentPage >= totalPages || delLoading}
              onClick={() => setHistoricoFiltros({ pagina: currentPage + 1 })}
            >
              Seguinte
            </button>
          </div>
        </section>
      )}

      {visao === 'preferencias' && (
        <section className="card notif-hub__section" aria-label="Preferências">
          <h2 className="obligation-checklist__title" style={{ marginTop: 0 }}>
            As suas preferências
          </h2>
          <p className="op-muted op-small">Alterações aplicam-se à sua conta neste condomínio.</p>
          <NotificationsPreferencesPanel userId={userId} />
        </section>
      )}

      {visao === 'canais' && (
        <section className="notif-hub__section" aria-label="Canais e modelos de mensagem">
          {metaLoading && (
            <p className="op-muted">Carregando dados do serviço…</p>
          )}
          {metaError && <div className="banner banner--error">{metaError}</div>}
          {!metaLoading && gov && (
            <>
              <h2 className="obligation-checklist__title">Canais disponíveis</h2>
              <p className="op-muted op-small">Formas como o sistema pode contactar utilizadores.</p>
              <div className="notif-channel-grid">
                {gov.channels.map((c) => (
                  <article key={String(c.code ?? c.displayName)} className="notif-channel-card">
                    <h3>{String(c.displayName ?? c.code ?? 'Canal')}</h3>
                    <p className="notif-channel-card__code">{String(c.code ?? '—')}</p>
                    <p className="op-muted op-small">{String(c.description ?? '')}</p>
                  </article>
                ))}
              </div>

              <h2 className="obligation-checklist__title" style={{ marginTop: '2rem' }}>
                Regras gerais
              </h2>
              <details className="notif-details-block">
                <summary>Ver políticas técnicas (rate limit, deduplicação…)</summary>
                <div className="table-scroll table--modern" style={{ marginTop: '0.75rem' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Chave</th>
                        <th>Valor</th>
                        <th>Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gov.policies.map((p) => (
                        <tr key={String(p.key)}>
                          <td className="op-mono op-small">{String(p.key ?? '—')}</td>
                          <td>{String(p.value ?? '—')}</td>
                          <td>{String(p.description ?? '—')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              {gov.notes.length > 0 && (
                <ul className="notif-notes-list">
                  {gov.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}

              <h2 className="obligation-checklist__title" style={{ marginTop: '2rem' }}>
                Modelos de mensagem
              </h2>
              <p className="op-muted op-small">Textos base usados pelo sistema (somente leitura).</p>
              <div className="notif-template-grid">
                {templates.map((t) => (
                  <article key={String(t.code ?? t.channel)} className="notif-template-card">
                    <div className="notif-template-card__head">
                      <span className="notif-pill notif-pill--neutral">{String(t.channel ?? '—')}</span>
                      <span className="op-mono op-small">{String(t.code ?? '—')}</span>
                    </div>
                    <p className="notif-template-card__subject">{String(t.subjectPattern ?? t.SubjectPattern ?? '—')}</p>
                    <p className="op-muted op-small">{String(t.sourceEvent ?? t.SourceEvent ?? '')}</p>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <p className="op-muted op-small notif-hub__foot">
        Dúvidas sobre alertas de preços e mercado? Consulte também a página de{' '}
        <Link to="/alertas">Alertas</Link>.
      </p>
    </div>
  );
};

export default NotificationsCentralPage;
