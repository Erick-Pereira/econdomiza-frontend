import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  formatAlertDateTimePtBr,
  isAlertRowResolved,
  prioridadeLabelFromSeverity,
  severityUpperFromAlertRow,
} from '../lib/alert-row';
import { normalizeListPayload } from '../lib/api-normalize';
import { formatApiError } from '../lib/api-error-message';
import { EcondomizaApi } from '../services';
import { PageHeader } from '../components/layout/PageHeader';
import { PageFatalErrorState, PageLoadingState } from '../components/layout/PageLoadStates';

type InsightPeriod = { fromInclusive?: string; toInclusive?: string };

type InsightLink = { label: string; href: string };

type OperationalInsight = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  severity: string;
  confidence: string;
  primaryPeriod?: InsightPeriod | null;
  comparePeriod?: InsightPeriod | null;
  dataSources: string[];
  criteria: string;
  evidence: Record<string, string>;
  tier: string;
  impactScore: number;
  uiGroup: string;
  simpleExplanation: string;
  detailedExplanation: string;
  whyItMatters: string;
  recommendation: string;
  suggestedAction: string;
  dataOriginLabel: string;
  benchmarkNote: string;
  complianceNote: string;
  anomalyNote: string;
  operationalLinks: InsightLink[];
};

type InsightsEnvelope = {
  generatedAtUtc?: string;
  disclaimer?: string;
  executiveSummary?: string;
  items?: OperationalInsight[];
  servedFrom?: string;
  snapshotId?: string;
  expiresAtUtc?: string;
  ruleSetVersion?: string;
};

type SnapshotMetaRow = {
  id: string;
  createdAtUtc: string;
  expiresAtUtc: string;
  ruleSetVersion: string;
};

type AlertInsightRow = {
  id: string;
  type: string;
  productName: string;
  message: string;
  category: string;
  alertCategory: string;
  severity: string;
  deviationPct: string;
  currentPrice: string;
  avgPrice: string;
  analyzedAt: string;
  createdAt: string;
  resolved: boolean;
};

type IaItemNarrative = {
  simpleExplanation: string;
  whyItMatters: string;
  whatToDo: string;
  detailedExplanation: string;
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function parseLinks(raw: unknown): InsightLink[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .map((x) => {
      const o = asRecord(x);
      return {
        label: String(o.label ?? o.Label ?? ''),
        href: String(o.href ?? o.Href ?? ''),
      };
    })
    .filter((l) => l.label.trim() !== '' && l.href.trim() !== '');
}

function parseInsight(r: Record<string, unknown>): OperationalInsight {
  const evidence = asRecord(r.evidence);
  const ev: Record<string, string> = {};
  for (const [k, val] of Object.entries(evidence)) {
    ev[k] = val == null ? '' : String(val);
  }
  return {
    id: String(r.id ?? ''),
    kind: String(r.kind ?? ''),
    title: String(r.title ?? ''),
    summary: String(r.summary ?? ''),
    severity: String(r.severity ?? 'info'),
    confidence: String(r.confidence ?? 'medium'),
    primaryPeriod: r.primaryPeriod && typeof r.primaryPeriod === 'object' ? (r.primaryPeriod as InsightPeriod) : null,
    comparePeriod: r.comparePeriod && typeof r.comparePeriod === 'object' ? (r.comparePeriod as InsightPeriod) : null,
    dataSources: Array.isArray(r.dataSources) ? (r.dataSources as unknown[]).map((s) => String(s)) : [],
    criteria: String(r.criteria ?? ''),
    evidence: ev,
    tier: String(r.tier ?? 'info'),
    impactScore: Number(r.impactScore ?? r.ImpactScore ?? 0),
    uiGroup: String(r.uiGroup ?? r.UiGroup ?? 'spend'),
    simpleExplanation: String(r.simpleExplanation ?? r.SimpleExplanation ?? ''),
    detailedExplanation: String(r.detailedExplanation ?? r.DetailedExplanation ?? ''),
    whyItMatters: String(r.whyItMatters ?? r.WhyItMatters ?? ''),
    recommendation: String(r.recommendation ?? r.Recommendation ?? ''),
    suggestedAction: String(r.suggestedAction ?? r.SuggestedAction ?? ''),
    dataOriginLabel: String(r.dataOriginLabel ?? r.DataOriginLabel ?? ''),
    benchmarkNote: String(r.benchmarkNote ?? r.BenchmarkNote ?? ''),
    complianceNote: String(r.complianceNote ?? r.ComplianceNote ?? ''),
    anomalyNote: String(r.anomalyNote ?? r.AnomalyNote ?? ''),
    operationalLinks: parseLinks(r.operationalLinks ?? r.OperationalLinks),
  };
}

function parseInsightsEnvelope(data: unknown): InsightsEnvelope {
  const o = asRecord(data);
  const itemsRaw = o.items;
  const items: OperationalInsight[] = Array.isArray(itemsRaw)
    ? (itemsRaw as unknown[]).map((x) => parseInsight(asRecord(x)))
    : [];
  return {
    generatedAtUtc: o.generatedAtUtc != null ? String(o.generatedAtUtc) : undefined,
    disclaimer: o.disclaimer != null ? String(o.disclaimer) : undefined,
    executiveSummary:
      o.executiveSummary != null
        ? String(o.executiveSummary)
        : o.ExecutiveSummary != null
          ? String(o.ExecutiveSummary)
          : undefined,
    items,
    servedFrom: o.servedFrom != null ? String(o.servedFrom) : undefined,
    snapshotId: o.snapshotId != null ? String(o.snapshotId) : undefined,
    expiresAtUtc: o.expiresAtUtc != null ? String(o.expiresAtUtc) : undefined,
    ruleSetVersion: o.ruleSetVersion != null ? String(o.ruleSetVersion) : undefined,
  };
}

function tierRank(t: string): number {
  if (t === 'critical') return 0;
  if (t === 'attention') return 1;
  return 2;
}

function sortInsights(list: OperationalInsight[]): OperationalInsight[] {
  return [...list].sort((a, b) => {
    const tr = tierRank(a.tier) - tierRank(b.tier);
    if (tr !== 0) return tr;
    return (b.impactScore ?? 0) - (a.impactScore ?? 0);
  });
}

function parseIaNarrative(data: unknown): { executiveSummary: string; byId: Record<string, IaItemNarrative> } | null {
  const o = asRecord(data);
  const exec = String(o.executiveSummary ?? o.ExecutiveSummary ?? '').trim();
  const rawItems = o.items ?? o.Items;
  if (!Array.isArray(rawItems)) return null;
  const byId: Record<string, IaItemNarrative> = {};
  for (const x of rawItems) {
    const r = asRecord(x);
    const id = String(r.id ?? r.Id ?? '');
    if (!id) continue;
    byId[id] = {
      simpleExplanation: String(r.simpleExplanation ?? r.SimpleExplanation ?? ''),
      whyItMatters: String(r.whyItMatters ?? r.WhyItMatters ?? ''),
      whatToDo: String(r.whatToDo ?? r.WhatToDo ?? ''),
      detailedExplanation: String(r.detailedExplanation ?? r.DetailedExplanation ?? ''),
    };
  }
  return { executiveSummary: exec, byId };
}

function confidencePt(c: string): string {
  const u = c.toLowerCase();
  if (u === 'high') return 'Alta';
  if (u === 'medium') return 'Média';
  if (u === 'low') return 'Baixa';
  return c || '—';
}

function uiGroupEyebrow(g: string): string {
  const x = (g || '').toLowerCase();
  if (x.includes('spend') || x === 'despesas' || x === 'orcamento') return 'Despesas e orçamento';
  if (x.includes('price') || x.includes('mercado')) return 'Preços e mercado';
  if (x.includes('compliance') || x.includes('risk') || x.includes('conform')) return 'Obrigações e riscos';
  return 'Operação do condomínio';
}

function impactLabel(score: number): string {
  const s = Math.min(100, Math.max(0, score));
  if (s >= 75) return 'Impacto alto';
  if (s >= 40) return 'Impacto médio';
  return 'Impacto leve';
}

const InsightsPage: React.FC = () => {
  const [envelope, setEnvelope] = useState<InsightsEnvelope | null>(null);
  const [history, setHistory] = useState<SnapshotMetaRow[]>([]);
  const [alerts, setAlerts] = useState<AlertInsightRow[]>([]);
  const [complianceScore, setComplianceScore] = useState<number | null>(null);
  const [complianceOutstanding, setComplianceOutstanding] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaError, setIaError] = useState<string | null>(null);
  const [iaLayer, setIaLayer] = useState<{ executiveSummary: string; byId: Record<string, IaItemNarrative> } | null>(null);

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
    try {
      setLoading(true);
      const settled = await Promise.allSettled([
        EcondomizaApi.getOperationalInsights({ refresh: opts?.refresh === true }),
        EcondomizaApi.getOperationalInsightHistory(25),
        EcondomizaApi.listAlerts({ page: 1, pageSize: 50 }),
        EcondomizaApi.complianceDashboard(),
      ]);

      const messages: string[] = [];

      if (settled[0].status === 'fulfilled') {
        setEnvelope(parseInsightsEnvelope(settled[0].value.data));
        setIaLayer(null);
        setIaError(null);
      } else {
        setEnvelope(null);
        messages.push(formatApiError(settled[0].reason));
      }

      if (settled[1].status === 'fulfilled') {
        const histPayload = asRecord(settled[1].value.data);
        const histRowsRaw = histPayload.rows;
        const histList: SnapshotMetaRow[] = Array.isArray(histRowsRaw)
          ? (histRowsRaw as unknown[]).map((x) => {
              const r = asRecord(x);
              return {
                id: String(r.id ?? ''),
                createdAtUtc: String(r.createdAtUtc ?? ''),
                expiresAtUtc: String(r.expiresAtUtc ?? ''),
                ruleSetVersion: String(r.ruleSetVersion ?? ''),
              };
            })
          : [];
        setHistory(histList);
      } else {
        setHistory([]);
        messages.push(formatApiError(settled[1].reason));
      }

      if (settled[2].status === 'fulfilled') {
        const rawItems = normalizeListPayload(settled[2].value.data);
        const rows: AlertInsightRow[] = (rawItems as Record<string, unknown>[]).map((item) => {
          const sev = severityUpperFromAlertRow(item);
          const prio = prioridadeLabelFromSeverity(sev);
          const msg = String(item.message ?? item.title ?? item.titulo ?? '');
          const product = String(item.productName ?? '');
          return {
            id: String(item.id ?? ''),
            type: String(item.type ?? ''),
            productName: product || '—',
            message: msg,
            category: String(item.category ?? item.categoria ?? '—'),
            alertCategory: String(item.alertCategory ?? '—'),
            severity: prio,
            deviationPct:
              item.deviationPercentage != null && item.deviationPercentage !== ''
                ? `${Number(item.deviationPercentage).toFixed(1)}%`
                : '—',
            currentPrice:
              item.currentPrice != null
                ? Number(item.currentPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : '—',
            avgPrice:
              item.averagePrice != null
                ? Number(item.averagePrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : '—',
            analyzedAt: String(item.analyzedAt ?? ''),
            createdAt: String(item.createdAt ?? ''),
            resolved: isAlertRowResolved(item),
          };
        });
        setAlerts(rows);
      } else {
        setAlerts([]);
        messages.push(formatApiError(settled[2].reason));
      }

      if (settled[3].status === 'fulfilled') {
        const cd = asRecord(settled[3].value.data);
        const score = cd.complianceScore ?? cd.ComplianceScore;
        const out = cd.outstandingFindings ?? cd.OutstandingFindings;
        setComplianceScore(typeof score === 'number' ? score : Number(score) || null);
        setComplianceOutstanding(typeof out === 'number' ? out : Number(out) || null);
      } else {
        setComplianceScore(null);
        setComplianceOutstanding(null);
      }

      setError(messages.length > 0 ? messages.join(' · ') : null);
    } catch (e) {
      console.error(e);
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedItems = useMemo(() => sortInsights(envelope?.items ?? []), [envelope?.items]);

  const deterministicSummary = (envelope?.executiveSummary ?? '').trim();
  const iaExecutive = (iaLayer?.executiveSummary ?? '').trim();
  const heroText = iaExecutive || deterministicSummary;

  const teaserLine = useMemo(() => {
    if (heroText) return '';
    const first = sortedItems[0];
    if (!first) return '';
    return String(first.simpleExplanation || first.summary || first.title || '').trim();
  }, [heroText, sortedItems]);

  const requestIaNarrative = async () => {
    const items = envelope?.items ?? [];
    if (items.length === 0) {
      setIaError('Não há insights para narrar. Recalcule ou aguarde novos dados.');
      return;
    }
    try {
      setIaLoading(true);
      setIaError(null);
      const body = {
        language: 'pt',
        items: items.map((it) => ({
          id: it.id,
          kind: it.kind,
          title: it.title,
          summary: it.summary,
          severity: it.severity,
          tier: it.tier,
          impactScore: it.impactScore,
          uiGroup: it.uiGroup,
          simpleExplanation: it.simpleExplanation || it.summary,
          whyItMatters: it.whyItMatters,
          recommendation: it.recommendation,
          suggestedAction: it.suggestedAction,
          anomalyNote: it.anomalyNote,
          benchmarkNote: it.benchmarkNote,
          complianceNote: it.complianceNote,
          evidence: it.evidence,
        })),
      };
      const { data } = await EcondomizaApi.narrativeOperationalInsights(body);
      const parsed = parseIaNarrative(data);
      if (!parsed) {
        setIaError('Resposta da IA em formato inesperado.');
        return;
      }
      setIaLayer(parsed);
    } catch (e) {
      console.error(e);
      setIaError(formatApiError(e));
    } finally {
      setIaLoading(false);
    }
  };

  const formatDt = (iso: string) => {
    if (!iso) return '—';
    try {
      return formatAlertDateTimePtBr(iso);
    } catch {
      return iso;
    }
  };

  if (loading) {
    return <PageLoadingState id="insights-page" message="A preparar a sua leitura…" skeletonMaxWidth={720} />;
  }

  if (error && !envelope && alerts.length === 0) {
    return <PageFatalErrorState id="insights-page" message={error} onRetry={() => void load()} />;
  }

  const criticalItems = sortedItems.filter((i) => i.tier === 'critical');
  const attentionItems = sortedItems.filter((i) => i.tier === 'attention');
  const infoItems = sortedItems.filter((i) => i.tier === 'info');
  const topAlerts = alerts.slice(0, 5);

  const renderInsightCard = (it: OperationalInsight) => {
    const tierClass = it.tier === 'critical' ? 'critical' : it.tier === 'attention' ? 'attention' : 'info';
    const ia = iaLayer?.byId[it.id];
    const tierLabel = it.tier === 'critical' ? 'Urgente' : it.tier === 'attention' ? 'Acompanhar' : 'Contexto';

    const lead =
      (ia?.simpleExplanation && ia.simpleExplanation.trim()) ||
      it.simpleExplanation.trim() ||
      it.summary.trim() ||
      it.title;

    const whyBlock = (ia?.whyItMatters && ia.whyItMatters.trim()) || it.whyItMatters.trim();
    const nextStep = (ia?.whatToDo && ia.whatToDo.trim()) || it.suggestedAction.trim() || it.recommendation.trim();
    const deepIa = ia?.detailedExplanation?.trim();

    return (
      <li key={it.id} className={`insights-prose-card insights-prose-card--${tierClass}`}>
        <header className="insights-prose-card__head">
          <span className="insights-prose-card__eyebrow">{uiGroupEyebrow(it.uiGroup)}</span>
          <h3 className="insights-prose-card__title">{it.title}</h3>
          <div className="insights-prose-card__meta">
            <span className={`insights-prose-tier insights-prose-tier--${tierClass}`}>{tierLabel}</span>
            <span className="insights-prose-meta-muted">
              {impactLabel(it.impactScore)} · Confiança {confidencePt(it.confidence)}
            </span>
          </div>
        </header>

        <p className="insights-prose-lead">{lead}</p>

        {whyBlock ? (
          <figure className="insights-prose-why">
            <figcaption>Porquê isto importa</figcaption>
            <blockquote>{whyBlock}</blockquote>
          </figure>
        ) : null}

        {it.anomalyNote.trim() ? (
          <p className="insights-prose-anomaly">
            <strong>Anomalia:</strong> {it.anomalyNote}
          </p>
        ) : null}

        {it.benchmarkNote.trim() ? (
          <p className="insights-prose-bench">
            <strong>Comparando com o habitual:</strong> {it.benchmarkNote}
          </p>
        ) : null}

        {nextStep ? (
          <div className="insights-prose-next">
            <span className="insights-prose-next__label">Próximo passo sugerido</span>
            <p>{nextStep}</p>
          </div>
        ) : null}

        {ia && deepIa ? (
          <p className="insights-prose-ia-extra">{deepIa}</p>
        ) : null}

        {it.operationalLinks.length > 0 ? (
          <div className="insights-prose-actions">
            {it.operationalLinks.map((lnk) => (
              <Link key={`${it.id}-${lnk.href}`} to={lnk.href} className="btn-small">
                {lnk.label}
              </Link>
            ))}
          </div>
        ) : null}

        <details className="insights-prose-details">
          <summary>Números e detalhe técnico</summary>
          <div className="insights-prose-details__body">
            <p className="op-muted op-small">{it.detailedExplanation || it.summary}</p>
            <dl className="insights-prose-dl">
              <div>
                <dt>Origem</dt>
                <dd>{it.dataOriginLabel || (it.dataSources.length ? it.dataSources.join(' · ') : '—')}</dd>
              </div>
              {it.complianceNote.trim() ? (
                <div>
                  <dt>Obrigações (compras)</dt>
                  <dd>{it.complianceNote}</dd>
                </div>
              ) : null}
            </dl>
            <details className="insights-prose-details insights-prose-details--nested">
              <summary>Critérios e evidência bruta</summary>
              <p className="op-small op-muted">
                <strong>Critério:</strong> {it.criteria || '—'}
              </p>
              {it.primaryPeriod && (
                <p className="op-small op-muted">
                  <strong>Período principal:</strong> {formatDt(String(it.primaryPeriod.fromInclusive ?? ''))} —{' '}
                  {formatDt(String(it.primaryPeriod.toInclusive ?? ''))}
                </p>
              )}
              {it.comparePeriod && (
                <p className="op-small op-muted">
                  <strong>Comparação:</strong> {formatDt(String(it.comparePeriod.fromInclusive ?? ''))} —{' '}
                  {formatDt(String(it.comparePeriod.toInclusive ?? ''))}
                </p>
              )}
              <p className="op-small op-muted">
                <strong>Tipo técnico:</strong> <span className="insights-mono">{it.kind}</span>
              </p>
              {Object.keys(it.evidence).length > 0 && (
                <div className="table-scroll table--modern" style={{ marginTop: 8 }}>
                  <table>
                    <tbody>
                      {Object.entries(it.evidence).map(([k, v]) => (
                        <tr key={k}>
                          <th scope="row">{k}</th>
                          <td>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </details>
          </div>
        </details>
      </li>
    );
  };

  const hasAnyInsights = sortedItems.length > 0;

  return (
    <div className="page insights-page" id="insights-page">
      <PageHeader
        eyebrow="Leitura para o síndico"
        title="Insights que explicam o condomínio"
        description="Em vez de tabelas de números soltos, começamos pelo que interessa: riscos, tendências e o que fazer. Use a IA para uma leitura em português claro — ela não altera os dados, só ajuda a contar a história."
        layout="stack"
        quickLinks={[
          { to: '/conformidades', label: 'Obrigações' },
          { to: '/compras', label: 'Compras' },
          { to: '/alertas', label: 'Alertas' },
          { to: '/notificacoes', label: 'Notificações' },
        ]}
        toolbar={
          <>
            <button
              type="button"
              className="btn-primary"
              disabled={iaLoading || !hasAnyInsights}
              onClick={() => void requestIaNarrative()}
            >
              {iaLoading ? 'A gerar texto com IA…' : 'Gerar leitura com IA'}
            </button>
            <button type="button" className="btn-small secondary" disabled={loading} onClick={() => void load()}>
              {loading ? 'Atualizando…' : 'Atualizar'}
            </button>
            <button type="button" className="btn-small secondary" disabled={loading} onClick={() => void load({ refresh: true })}>
              Recalcular dados
            </button>
          </>
        }
      />

      {error && <div className="banner banner--error">{error}</div>}
      {iaError && <div className="banner banner--error">{iaError}</div>}

      <section className={`insights-exec-panel ${iaExecutive ? 'insights-exec-panel--ia' : ''}`} aria-label="Resumo executivo">
        {iaLoading ? (
          <div className="insights-exec-panel__loading" aria-busy="true">
            <p className="insights-exec-panel__loading-text">A preparar resumo e frases explicativas com IA…</p>
            <p className="op-muted op-small">Isto pode levar alguns segundos se o serviço de IA estiver ocupado.</p>
          </div>
        ) : (
          <>
            <div className="insights-exec-panel__kicker">
              {iaExecutive ? 'Resumo executivo (IA)' : deterministicSummary ? 'Resumo do sistema' : 'Comece por aqui'}
            </div>
            {heroText ? (
              <p className="insights-exec-panel__prose">{heroText}</p>
            ) : teaserLine ? (
              <>
                <p className="insights-exec-panel__prose insights-exec-panel__prose--muted">{teaserLine}</p>
                <p className="insights-exec-panel__hint">
                  Toque em <strong>Gerar leitura com IA</strong> para transformar os sinais abaixo num texto único, com
                  riscos e sugestões em linguagem natural.
                </p>
              </>
            ) : (
              <p className="insights-exec-panel__prose insights-exec-panel__prose--muted">
                Ainda não há síntese automática. Quando existirem insights calculados, poderá pedir uma leitura em IA ou
                consultar os cartões seguintes.
              </p>
            )}
          </>
        )}
      </section>

      {(complianceScore != null || complianceOutstanding != null) && (
        <section className="insights-context-rail" aria-label="Obrigações nas compras">
          <div>
            <span className="insights-context-rail__label">Documentação e compras</span>
            <p className="insights-context-rail__line">
              {complianceScore != null && (
                <>
                  Indicador <strong>{complianceScore}</strong>
                  {complianceOutstanding != null ? (
                    <>
                      {' '}
                      · <strong>{complianceOutstanding}</strong> pendência(s) em aberto nas compras
                    </>
                  ) : null}
                </>
              )}
              {complianceScore == null && complianceOutstanding != null && (
                <>
                  <strong>{complianceOutstanding}</strong> pendência(s) em aberto nas compras
                </>
              )}
            </p>
          </div>
          <Link to="/conformidades" className="btn-small">
            Ver obrigações
          </Link>
        </section>
      )}

      {criticalItems.length > 0 && (
        <section className="insights-band" aria-labelledby="insights-urgent">
          <div className="insights-band__header">
            <h2 id="insights-urgent">Urgente — precisa de decisão</h2>
            <span className="insights-band__count">{criticalItems.length}</span>
          </div>
          <ul className="insights-prose-list">{criticalItems.map(renderInsightCard)}</ul>
        </section>
      )}

      {attentionItems.length > 0 && (
        <section className="insights-band" aria-labelledby="insights-watch">
          <div className="insights-band__header">
            <h2 id="insights-watch">Acompanhar</h2>
            <span className="insights-band__count">{attentionItems.length}</span>
          </div>
          <ul className="insights-prose-list">{attentionItems.map(renderInsightCard)}</ul>
        </section>
      )}

      <section className="insights-band" aria-labelledby="insights-context">
        <div className="insights-band__header">
          <h2 id="insights-context">Contexto e tendências</h2>
          <span className="insights-band__count">{infoItems.length}</span>
        </div>
        {infoItems.length === 0 && criticalItems.length === 0 && attentionItems.length === 0 ? (
          <p className="empty-state">
            Sem insights neste momento: pode faltar histórico suficiente ou os limiares ainda não foram atingidos.
          </p>
        ) : infoItems.length === 0 ? (
          <p className="empty-state op-muted">Sem outros sinais além dos prioritários.</p>
        ) : (
          <ul className="insights-prose-list">{infoItems.map(renderInsightCard)}</ul>
        )}
      </section>

      <section className="insights-band" aria-labelledby="insights-alerts">
        <h2 id="insights-alerts">Alertas recentes</h2>
        <p className="insights-band__sub">Amostra dos últimos avisos de preço e mercado — a lista completa está em Alertas.</p>
        {topAlerts.length === 0 ? (
          <p className="empty-state">Sem alertas na amostra.</p>
        ) : (
          <div className="insights-alert-deck">
            {topAlerts.map((a) => (
              <article
                key={a.id}
                className={`insights-alert-snap ${a.severity === 'alta' ? 'insights-alert-snap--crit' : a.severity === 'media' ? 'insights-alert-snap--high' : ''}`}
              >
                <header className="insights-alert-snap__head">
                  <span className="insights-alert-snap__prio">{a.severity}</span>
                  <span className="insights-alert-snap__state">{a.resolved ? 'Resolvido' : 'Aberto'}</span>
                </header>
                <h3 className="insights-alert-snap__product">{a.productName}</h3>
                <p className="insights-alert-snap__msg">{a.message}</p>
                <dl className="insights-alert-snap__nums">
                  <div>
                    <dt>Variação</dt>
                    <dd>{a.deviationPct}</dd>
                  </div>
                  <div>
                    <dt>Preço agora</dt>
                    <dd>{a.currentPrice}</dd>
                  </div>
                  <div>
                    <dt>Média</dt>
                    <dd>{a.avgPrice}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
        <div style={{ marginTop: '1rem' }}>
          <Link to="/alertas" className="btn-small secondary">
            Ver todos os alertas
          </Link>
        </div>
      </section>

      <details className="insights-audit-fold">
        <summary>Detalhes técnicos e histórico de cálculos</summary>
        <div className="insights-audit-fold__body">
          <p className="op-muted op-small insights-meta-line" style={{ marginTop: 0 }}>
            {envelope?.servedFrom && (
              <span className="badge">
                Origem: {envelope.servedFrom === 'snapshot' ? 'cópia em cache' : 'cálculo em tempo real'}
              </span>
            )}
            {envelope?.ruleSetVersion && <span className="badge">Regras: {envelope.ruleSetVersion}</span>}
            {envelope?.expiresAtUtc && <span className="badge">Válido até: {formatDt(envelope.expiresAtUtc)}</span>}
          </p>
          {envelope?.disclaimer && <p className="form-help">{envelope.disclaimer}</p>}
          {envelope?.generatedAtUtc && <p className="form-help">Gerado: {formatDt(envelope.generatedAtUtc)}</p>}
          {envelope?.snapshotId && (
            <p className="form-help op-mono" style={{ fontSize: '0.78rem' }}>
              Snapshot: {envelope.snapshotId}
            </p>
          )}
          {history.length > 0 && (
            <>
              <h3 className="insights-audit-fold__h">Histórico de snapshots</h3>
              <div className="table-scroll">
                <div className="table--modern">
                  <table>
                    <thead>
                      <tr>
                        <th>Id</th>
                        <th>Criado</th>
                        <th>Expira</th>
                        <th>Versão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id}>
                          <td className="insights-mono op-small">{h.id}</td>
                          <td>{formatDt(h.createdAtUtc)}</td>
                          <td>{formatDt(h.expiresAtUtc)}</td>
                          <td>{h.ruleSetVersion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </details>
    </div>
  );
};

export default InsightsPage;
