import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthSession } from '../../context/AuthSessionContext';
import { normalizeListPayload } from '../../lib/api-normalize';
import { formatApiError } from '../../lib/api-error-message';
import { EcondomizaApi } from '../../services';
import { PageHeader } from '../../components/layout/PageHeader';

/** Estado visual para obrigações com prazo (não confundir com enums técnicos da API). */
type ObrigacaoBucket = 'pendente' | 'em-dia' | 'vencido' | 'critico';

const DIAS_PARA_CRITICO = 14;

const TIPO_PT: Record<string, string> = {
  PREFEITURA: 'Prefeitura / cadastro',
  LICENCA: 'Licença de funcionamento',
  AUDITORIACONTABIL: 'Auditoria contábil',
  SEGUROPREDIAL: 'Seguro predial',
  CERTIFICADOSEGURANCA: 'AVCB / segurança',
  CUSTOM: 'Obrigação personalizada',
};

function strField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && v !== '') return String(v);
  }
  return '';
}

function mapConformityRow(raw: unknown): ObrigacaoItem | null {
  if (raw == null || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  const id = strField(c, 'id', 'Id');
  if (!id) return null;

  const apiStatus = String(c.status ?? c.Status ?? '').toUpperCase();
  const now = new Date();
  const dueRaw = c.dueDate ?? c.DueDate;
  const doneRaw = c.completedAt ?? c.CompletedAt;
  const dueDate = dueRaw != null && String(dueRaw) !== '' ? String(dueRaw) : null;
  const completedAt = doneRaw != null && String(doneRaw) !== '' ? String(doneRaw) : null;
  const due = dueDate ? new Date(dueDate) : null;
  const completed = completedAt ? new Date(completedAt) : null;

  let lifecycle: 'completed' | 'pending' | 'overdue' = 'pending';
  if (apiStatus === 'COMPLETED' || (completed && !Number.isNaN(completed.getTime()))) {
    lifecycle = 'completed';
  } else if (apiStatus === 'OVERDUE' || (due && !Number.isNaN(due.getTime()) && due < now)) {
    lifecycle = 'overdue';
  }

  const typeKey = strField(c, 'type', 'Type').replace(/\s/g, '');
  const typeNorm = typeKey.toUpperCase();

  return {
    id,
    typeKey: typeNorm,
    typeLabel: (TIPO_PT[typeNorm] ?? typeKey) || 'Obrigação',
    description: strField(c, 'description', 'Description') || '—',
    lifecycle,
    dueDate,
    completedAt,
    notes: c.notes != null || c.Notes != null ? String(c.notes ?? c.Notes) : null,
  };
}

interface ObrigacaoItem {
  id: string;
  typeKey: string;
  typeLabel: string;
  description: string;
  lifecycle: 'completed' | 'pending' | 'overdue';
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
}

function bucketForItem(it: ObrigacaoItem): ObrigacaoBucket {
  if (it.lifecycle === 'completed') return 'em-dia';
  if (it.lifecycle === 'overdue') {
    const due = it.dueDate ? new Date(it.dueDate) : null;
    if (due && !Number.isNaN(due.getTime())) {
      const days = (Date.now() - due.getTime()) / 86400000;
      if (days > DIAS_PARA_CRITICO) return 'critico';
    }
    return 'vencido';
  }
  return 'pendente';
}

async function resolveCondominioId(sessionTenantId: string): Promise<string> {
  const tid = sessionTenantId?.trim();
  if (tid) return tid;
  const condominioResult = await EcondomizaApi.getMyCondominio();
  const raw = condominioResult.data as Record<string, unknown> | undefined;
  if (raw && typeof raw === 'object') {
    const id = strField(raw, 'id', 'Id');
    if (id) return id;
  }
  throw new Error('Condomínio inválido: sem tenantId na sessão e sem id no perfil do condomínio.');
}

function pickNum(raw: Record<string, unknown> | null, ...keys: string[]): number {
  if (!raw) return 0;
  for (const k of keys) {
    const v = raw[k];
    if (v == null) continue;
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function strRow(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (v != null && v !== '') return String(v);
  }
  return '—';
}

function severityPt(sev: string): string {
  const u = sev.toUpperCase();
  if (u === 'CRITICAL') return 'Crítica';
  if (u === 'HIGH') return 'Alta';
  if (u === 'MEDIUM') return 'Média';
  if (u === 'LOW') return 'Baixa';
  return sev || '—';
}

const BUCKET_META: Record<
  ObrigacaoBucket,
  { label: string; hint: string; cardClass: string }
> = {
  pendente: {
    label: 'Pendente',
    hint: 'Ainda há prazo ou sem data definida',
    cardClass: 'obligation-kpi obligation-kpi--pendente',
  },
  'em-dia': {
    label: 'Em dia',
    hint: 'Registadas como concluídas',
    cardClass: 'obligation-kpi obligation-kpi--ok',
  },
  vencido: {
    label: 'Vencido',
    hint: 'Passou do prazo — precisa de atenção',
    cardClass: 'obligation-kpi obligation-kpi--vencido',
  },
  critico: {
    label: 'Crítico',
    hint: `Atraso superior a ${DIAS_PARA_CRITICO} dias`,
    cardClass: 'obligation-kpi obligation-kpi--critico',
  },
};

type HubVisao = 'lista' | 'calendario' | 'compras';

const ComplianceObrigacoesHubPage: React.FC = () => {
  const { profile } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const visao = (searchParams.get('visao') as HubVisao) || 'lista';
  const setVisao = (v: HubVisao) => {
    const next = new URLSearchParams(searchParams);
    if (v === 'lista') next.delete('visao');
    else next.set('visao', v);
    setSearchParams(next, { replace: true });
  };

  const [condominioId, setCondominioId] = useState<string | null>(null);
  const [items, setItems] = useState<ObrigacaoItem[]>([]);
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [findings, setFindings] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [findingsError, setFindingsError] = useState<string | null>(null);

  const [filterBucket, setFilterBucket] = useState<ObrigacaoBucket | 'todos'>('todos');
  const [query, setQuery] = useState('');

  const [newDesc, setNewDesc] = useState('');
  const [newDue, setNewDue] = useState('');
  const [adding, setAdding] = useState(false);

  const [completeForId, setCompleteForId] = useState<string | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const loadAll = useCallback(async () => {
    if (!profile?.tenantId?.trim()) {
      setError('Não foi possível identificar o condomínio da sessão. Recarregue a página ou faça login novamente.');
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setFindingsError(null);

    try {
      const cid = await resolveCondominioId(profile.tenantId.trim());
      setCondominioId(cid);

      const [confRes, dashRes, findRes] = await Promise.all([
        EcondomizaApi.listConformities(cid),
        EcondomizaApi.complianceDashboard().catch(() => null),
        EcondomizaApi.complianceFindings({ page: 1, pageSize: 80, status: 'OUTSTANDING' }).catch(() => null),
      ]);

      const mapped: ObrigacaoItem[] = [];
      for (const row of normalizeListPayload(confRes.data)) {
        const it = mapConformityRow(row);
        if (it) mapped.push(it);
      }
      setItems(mapped);

      if (dashRes?.data && typeof dashRes.data === 'object') {
        setDashboard(dashRes.data as Record<string, unknown>);
      } else {
        setDashboard(null);
      }

      if (findRes?.data) {
        const data = findRes.data as Record<string, unknown>;
        const list = normalizeListPayload(data ?? findRes.data);
        setFindings(list.filter((x) => x && typeof x === 'object') as Record<string, unknown>[]);
      } else {
        setFindings([]);
        if (findRes === null) setFindingsError('Não foi possível carregar pendências das compras.');
      }
    } catch (e) {
      setError(formatApiError(e));
      setItems([]);
      setDashboard(null);
      setFindings([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.tenantId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const counts = useMemo(() => {
    const c: Record<ObrigacaoBucket, number> = {
      pendente: 0,
      'em-dia': 0,
      vencido: 0,
      critico: 0,
    };
    for (const it of items) {
      c[bucketForItem(it)] += 1;
    }
    return c;
  }, [items]);

  const comprasPendentes = pickNum(dashboard, 'outstandingFindings', 'OutstandingFindings');
  const comprasRisco = pickNum(dashboard, 'highRiskOpen', 'HighRiskOpen');

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (filterBucket !== 'todos' && bucketForItem(it) !== filterBucket) return false;
      if (!q) return true;
      return (
        it.description.toLowerCase().includes(q) ||
        it.typeLabel.toLowerCase().includes(q) ||
        it.typeKey.toLowerCase().includes(q)
      );
    });
  }, [items, filterBucket, query]);

  const calendarGroups = useMemo(() => {
    const map = new Map<string, ObrigacaoItem[]>();
    for (const it of filteredItems) {
      const key = it.dueDate ? it.dueDate.slice(0, 7) : 'sem-prazo';
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    const keys = [...map.keys()].sort((a, b) => {
      if (a === 'sem-prazo') return 1;
      if (b === 'sem-prazo') return -1;
      return a.localeCompare(b);
    });
    return keys.map((k) => ({ key: k, items: map.get(k)! }));
  }, [filteredItems]);

  const formatDatePt = (iso: string | null): string => {
    if (!iso) return 'Sem data';
    try {
      return new Date(iso).toLocaleDateString('pt-BR');
    } catch {
      return '—';
    }
  };

  const formatMonthPt = (yyyyMm: string): string => {
    if (yyyyMm === 'sem-prazo') return 'Sem prazo definido';
    try {
      const [y, m] = yyyyMm.split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } catch {
      return yyyyMm;
    }
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condominioId || !newDesc.trim()) return;
    setAdding(true);
    try {
      const dueIso =
        newDue.trim() === ''
          ? null
          : (() => {
              const d = new Date(newDue);
              return Number.isNaN(d.getTime()) ? null : d.toISOString();
            })();
      await EcondomizaApi.addConformity(condominioId, { description: newDesc.trim(), dueDate: dueIso });
      setNewDesc('');
      setNewDue('');
      await loadAll();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setAdding(false);
    }
  };

  const onComplete = async () => {
    if (!condominioId || !completeForId) return;
    setActionBusy(true);
    try {
      await EcondomizaApi.completeConformity(condominioId, completeForId, completeNotes.trim());
      setCompleteForId(null);
      setCompleteNotes('');
      await loadAll();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setActionBusy(false);
    }
  };

  const onReopen = async (itemId: string) => {
    if (!condominioId) return;
    setActionBusy(true);
    try {
      await EcondomizaApi.reopenConformity(condominioId, itemId);
      await loadAll();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setActionBusy(false);
    }
  };

  const alertaTopo =
    counts.critico > 0 || comprasRisco > 0
      ? {
          tone: 'error' as const,
          text:
            counts.critico > 0 && comprasRisco > 0
              ? `Existem ${counts.critico} obrigação(ões) em estado crítico e ${comprasRisco} ponto(s) de alto risco nas compras.`
              : counts.critico > 0
                ? `Existem ${counts.critico} obrigação(ões) em estado crítico (atraso superior a ${DIAS_PARA_CRITICO} dias).`
                : `Há ${comprasRisco} ponto(s) de alto risco em aberto nas compras — reveja a fila “Compras”.`,
        }
      : counts.vencido > 0
        ? {
            tone: 'warning' as const,
            text: `${counts.vencido} obrigação(ões) com prazo vencido — organize a vistoria ou a renovação.`,
          }
        : null;

  if (loading && items.length === 0 && !error) {
    return (
      <div className="page-state" id="obligation-hub-loading">
        <p>Carregando obrigações do condomínio…</p>
      </div>
    );
  }

  return (
    <div className="obligation-hub" id="obligation-hub">
      <PageHeader
        eyebrow="Inspeções e obrigações legais"
        title="Obrigações do condomínio"
        description="Vistorias, licenças, AVCB, elevadores e manutenções obrigatórias — num só lugar. Use a lista ou o calendário para não perder vencimentos."
        layout="stack"
      />

      {error && (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      )}

      {alertaTopo && (
        <div className={`obligation-hub__alert obligation-hub__alert--${alertaTopo.tone}`} role="status">
          {alertaTopo.text}
        </div>
      )}

      <div className="obligation-hub__kpis" role="group" aria-label="Resumo por estado">
        {(Object.keys(BUCKET_META) as ObrigacaoBucket[]).map((b) => (
          <button
            key={b}
            type="button"
            className={`${BUCKET_META[b].cardClass} obligation-kpi--clickable ${filterBucket === b ? 'is-active' : ''}`}
            onClick={() => setFilterBucket((prev) => (prev === b ? 'todos' : b))}
            title={BUCKET_META[b].hint}
          >
            <span className="obligation-kpi__label">{BUCKET_META[b].label}</span>
            <span className="obligation-kpi__value">{counts[b]}</span>
            <span className="obligation-kpi__hint">{BUCKET_META[b].hint}</span>
          </button>
        ))}
      </div>

      {(comprasPendentes > 0 || findings.length > 0) && (
        <section className="card obligation-compras-strip" aria-label="Resumo das compras">
          <div className="obligation-compras-strip__main">
            <strong>Pendências nas compras</strong>
            <p className="op-muted op-small" style={{ margin: '0.35rem 0 0' }}>
              Validações de documentos e regras operacionais ligadas a despesas — abra cada item para anexar provas ou
              regularizar.
            </p>
          </div>
          <div className="obligation-compras-strip__nums">
            <span className="obligation-pill obligation-pill--neutral">{comprasPendentes} em aberto</span>
            {comprasRisco > 0 && (
              <span className="obligation-pill obligation-pill--risk">{comprasRisco} alto risco</span>
            )}
          </div>
        </section>
      )}

      <div className="obligation-segment" role="tablist" aria-label="Vista do hub">
        <button
          type="button"
          role="tab"
          aria-selected={visao === 'lista'}
          className={visao === 'lista' ? 'is-active' : undefined}
          onClick={() => setVisao('lista')}
        >
          Checklist
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={visao === 'calendario'}
          className={visao === 'calendario' ? 'is-active' : undefined}
          onClick={() => setVisao('calendario')}
        >
          Calendário
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={visao === 'compras'}
          className={visao === 'compras' ? 'is-active' : undefined}
          onClick={() => setVisao('compras')}
        >
          Fila compras
        </button>
      </div>

      <section className="card obligation-filters" aria-label="Filtros">
        <label className="op-field">
          <span>Procurar</span>
          <input
            type="search"
            placeholder="Ex.: bombeiros, elevador, AVCB…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </label>
        <div className="obligation-filters__chips">
          <button
            type="button"
            className={`obligation-chip ${filterBucket === 'todos' ? 'is-active' : ''}`}
            onClick={() => setFilterBucket('todos')}
          >
            Todas ({items.length})
          </button>
          {(Object.keys(BUCKET_META) as ObrigacaoBucket[]).map((b) => (
            <button
              key={b}
              type="button"
              className={`obligation-chip ${filterBucket === b ? 'is-active' : ''}`}
              onClick={() => setFilterBucket(b)}
            >
              {BUCKET_META[b].label} ({counts[b]})
            </button>
          ))}
        </div>
      </section>

      {visao === 'lista' && (
        <section className="obligation-checklist" aria-label="Checklist de obrigações">
          <header className="obligation-checklist__head">
            <h2 className="obligation-checklist__title">O que precisa da sua atenção</h2>
            <p className="op-muted op-small" style={{ margin: 0 }}>
              Toque no estado acima para filtrar. Itens concluídos ficam em “Em dia”.
            </p>
          </header>

          <div className="obligation-card-list">
            {filteredItems.length === 0 ? (
              <p className="empty-state">Nenhuma obrigação neste filtro.</p>
            ) : (
              filteredItems.map((it) => {
                const b = bucketForItem(it);
                const badgeClass =
                  b === 'em-dia'
                    ? 'obligation-status obligation-status--ok'
                    : b === 'pendente'
                      ? 'obligation-status obligation-status--pendente'
                      : b === 'vencido'
                        ? 'obligation-status obligation-status--vencido'
                        : 'obligation-status obligation-status--critico';

                return (
                  <article key={it.id} className={`obligation-card obligation-card--${b}`}>
                    <div className="obligation-card__top">
                      <span className={badgeClass}>{BUCKET_META[b].label}</span>
                      <span className="obligation-card__tipo">{it.typeLabel}</span>
                    </div>
                    <h3 className="obligation-card__desc">{it.description}</h3>
                    <dl className="obligation-card__meta">
                      <div>
                        <dt>Prazo</dt>
                        <dd>{it.lifecycle === 'completed' ? `Concluído em ${formatDatePt(it.completedAt)}` : formatDatePt(it.dueDate)}</dd>
                      </div>
                      {it.notes ? (
                        <div>
                          <dt>Notas</dt>
                          <dd>{it.notes}</dd>
                        </div>
                      ) : null}
                    </dl>
                    <div className="obligation-card__actions">
                      {it.lifecycle !== 'completed' ? (
                        <button
                          type="button"
                          className="btn-small"
                          disabled={actionBusy}
                          onClick={() => {
                            setCompleteForId(it.id);
                            setCompleteNotes('');
                          }}
                        >
                          Marcar como feito
                        </button>
                      ) : (
                        <button type="button" className="btn-small secondary" disabled={actionBusy} onClick={() => void onReopen(it.id)}>
                          Reabrir
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}

      {visao === 'calendario' && (
        <section className="obligation-calendar" aria-label="Obrigações por mês de vencimento">
          {calendarGroups.length === 0 ? (
            <p className="empty-state">Nenhum item neste filtro.</p>
          ) : (
            calendarGroups.map(({ key, items: group }) => (
              <div key={key} className="obligation-calendar__month">
                <h3 className="obligation-calendar__month-title">{formatMonthPt(key)}</h3>
                <ul className="obligation-calendar__list">
                  {group.map((it) => {
                    const b = bucketForItem(it);
                    return (
                      <li key={it.id}>
                        <span className={`obligation-dot obligation-dot--${b}`} aria-hidden />
                        <div>
                          <strong>{it.typeLabel}</strong>
                          <div className="op-small op-muted">{it.description}</div>
                          <div className="op-small">
                            {it.lifecycle === 'completed'
                              ? `Feito em ${formatDatePt(it.completedAt)}`
                              : `Vence ${formatDatePt(it.dueDate)} · ${BUCKET_META[b].label}`}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </section>
      )}

      {visao === 'compras' && (
        <section className="card" aria-label="Fila de pendências nas compras">
          <h2 className="obligation-checklist__title" style={{ marginTop: 0 }}>
            Documentação e validações nas compras
          </h2>
          {findingsError && <p className="form-help">{findingsError}</p>}
          {!findingsError && findings.length === 0 ? (
            <p className="empty-state" style={{ marginBottom: 0 }}>
              Nenhuma pendência global neste momento.
            </p>
          ) : (
            <div className="obligation-compras-cards">
              {findings.map((r, i) => {
                const eid = strRow(r, 'expenseId', 'ExpenseId');
                const title = strRow(r, 'title', 'Title');
                const rule = strRow(r, 'ruleCode', 'RuleCode');
                const sev = strRow(r, 'severity', 'Severity');
                const fid = strRow(r, 'id', 'Id');
                const high = sev.toUpperCase() === 'HIGH' || sev.toUpperCase() === 'CRITICAL';
                return (
                  <article key={fid + String(i)} className={`obligation-compra-card ${high ? 'obligation-compra-card--risk' : ''}`}>
                    <div className="obligation-compra-card__head">
                      <span className={high ? 'obligation-pill obligation-pill--risk' : 'obligation-pill obligation-pill--neutral'}>
                        Prioridade {severityPt(sev)}
                      </span>
                      {eid !== '—' && (
                        <Link className="btn-small" to={`/conformidades/despesa/${encodeURIComponent(eid)}`}>
                          Resolver
                        </Link>
                      )}
                    </div>
                    <h3>{title}</h3>
                    <p className="op-muted op-small" style={{ margin: 0 }}>
                      Referência interna: {rule}
                      {eid !== '—' ? ` · Despesa ${eid.slice(0, 8)}…` : ''}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
          <p className="op-muted op-small" style={{ marginTop: '1rem', marginBottom: 0 }}>
            O detalhe técnico (comentários, evidências, excepções) continua disponível ao abrir cada despesa.
          </p>
        </section>
      )}

      <section className="card obligation-add" aria-label="Registar nova obrigação">
        <h2 className="obligation-checklist__title" style={{ marginTop: 0 }}>
          Registar nova obrigação ou vistoria
        </h2>
        <p className="op-muted op-small" style={{ marginTop: 0 }}>
          Ex.: inspeção de elevadores, limpeza de caixa d&apos;água, licença municipal. Só precisa de uma descrição clara;
          o prazo é opcional mas ajuda o calendário.
        </p>
        <form className="obligation-add__form" onSubmit={onAdd}>
          <label className="op-field">
            <span>O quê precisa ser feito?</span>
            <input
              required
              maxLength={500}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Ex.: Vistoria anual do elevador — contrato com manutenção X"
            />
          </label>
          <label className="op-field">
            <span>Prazo ou próxima data prevista (opcional)</span>
            <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
          </label>
          <div className="obligation-add__submit">
            <button type="submit" className="btn-primary" disabled={adding || !condominioId}>
              {adding ? 'Salvando…' : 'Adicionar à lista'}
            </button>
          </div>
        </form>
      </section>

      {completeForId && (
        <div className="op-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="obligation-complete-title">
          <div className="op-modal">
            <h3 id="obligation-complete-title">Marcar obrigação como concluída</h3>
            <p className="op-muted op-small">Opcional: deixe uma nota para o conselho (ex.: número do protocolo, data da vistoria).</p>
            <textarea
              className="compliance-textarea"
              rows={3}
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              placeholder="Notas para histórico…"
            />
            <div className="op-modal__actions">
              <button type="button" className="btn-small secondary" disabled={actionBusy} onClick={() => setCompleteForId(null)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" disabled={actionBusy} onClick={() => void onComplete()}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceObrigacoesHubPage;
