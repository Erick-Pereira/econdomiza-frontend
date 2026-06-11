import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthSession } from '../../context/AuthSessionContext';
import { formatApiError } from '../../lib/api-error-message';
import { formatDatePtBr } from '../../lib/format-date-pt-br';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageFatalErrorState, PageLoadingState } from '../../components/layout/PageLoadStates';
import { Card, Button, Badge, Modal } from '../../components/ui';
import { canManageObrigacoes } from '../../lib/permissions/rbac';
import type { BadgeVariant } from '../../components/ui/Badge';
import type { ButtonVariant } from '../../components/ui/Button';
import {
  useConformidadesHubData,
  useConformidadesMutations,
} from '../../features/conformidades/hooks/useConformidadesHubData';
import {
  BUCKET_META,
  bucketForDisplay,
  DIAS_PARA_CRITICO,
  MORADOR_VIEW_BUCKETS,
  pickNum,
  severityPt,
  strRow,
  type ObrigacaoBucket,
  type ObrigacaoItem,
} from '../../features/conformidades/lib/obrigacao-map';

type HubVisao = 'lista' | 'calendario' | 'compras';

const ComplianceObrigacoesHubPage: React.FC = () => {
  const { profile } = useAuthSession();
  const canManage = canManageObrigacoes(profile?.role);
  const mergeCriticoIntoVencido = !canManage;
  const displayBuckets: ObrigacaoBucket[] = canManage
    ? (Object.keys(BUCKET_META) as ObrigacaoBucket[])
    : MORADOR_VIEW_BUCKETS;
  const [searchParams, setSearchParams] = useSearchParams();
  const visao = (searchParams.get('visao') as HubVisao) || 'lista';
  const setVisao = (v: HubVisao) => {
    const next = new URLSearchParams(searchParams);
    if (v === 'lista') next.delete('visao');
    else next.set('visao', v);
    setSearchParams(next, { replace: true });
  };

  const {
    condominioId,
    items,
    dashboard,
    findings,
    findingsError,
    isInitialLoading,
    errorMessage: queryError,
    refetch,
  } = useConformidadesHubData(profile?.tenantId);
  const { addConformity, completeConformity, reopenConformity, isMutating } = useConformidadesMutations(
    profile?.tenantId
  );

  const [actionError, setActionError] = useState<string | null>(null);
  const error = actionError ?? queryError;

  const [filterBucket, setFilterBucket] = useState<ObrigacaoBucket | 'todos'>('todos');
  const [query, setQuery] = useState('');

  const [newDesc, setNewDesc] = useState('');
  const [newDue, setNewDue] = useState('');
  const [adding, setAdding] = useState(false);

  const [completeForId, setCompleteForId] = useState<string | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');

  const counts = useMemo(() => {
    const c: Record<ObrigacaoBucket, number> = {
      pendente: 0,
      'em-dia': 0,
      vencido: 0,
      critico: 0,
    };
    for (const it of items) {
      c[bucketForDisplay(it, mergeCriticoIntoVencido)] += 1;
    }
    return c;
  }, [items, mergeCriticoIntoVencido]);

  const comprasPendentes = pickNum(dashboard, 'outstandingFindings', 'OutstandingFindings');
  const comprasRisco = pickNum(dashboard, 'highRiskOpen', 'HighRiskOpen');

  const severityRank = (sev: string): number => {
    const u = sev.toUpperCase();
    if (u === 'CRITICAL') return 0;
    if (u === 'HIGH') return 1;
    if (u === 'MEDIUM' || u === 'WARNING') return 2;
    if (u === 'LOW' || u === 'INFO') return 3;
    return 4;
  };

  const sortedFindings = useMemo(() => {
    return [...findings].sort((a, b) => {
      const sa = severityRank(strRow(a, 'severity', 'Severity'));
      const sb = severityRank(strRow(b, 'severity', 'Severity'));
      if (sa !== sb) return sa - sb;
      const ta = strRow(a, 'title', 'Title');
      const tb = strRow(b, 'title', 'Title');
      return ta.localeCompare(tb, 'pt-BR');
    });
  }, [findings]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const displayBucket = bucketForDisplay(it, mergeCriticoIntoVencido);
      if (filterBucket !== 'todos' && displayBucket !== filterBucket) return false;
      if (!q) return true;
      return (
        it.description.toLowerCase().includes(q) ||
        it.typeLabel.toLowerCase().includes(q) ||
        it.typeKey.toLowerCase().includes(q)
      );
    });
  }, [items, filterBucket, query, mergeCriticoIntoVencido]);

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

  const formatDatePt = (iso: string | null): string => formatDatePtBr(iso, 'Sem data');

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
    setActionError(null);
    try {
      const dueIso =
        newDue.trim() === ''
          ? null
          : (() => {
              const d = new Date(newDue);
              return Number.isNaN(d.getTime()) ? null : d.toISOString();
            })();
      await addConformity.mutateAsync({
        condominioId,
        payload: { description: newDesc.trim(), dueDate: dueIso },
      });
      setNewDesc('');
      setNewDue('');
    } catch (err) {
      setActionError(formatApiError(err));
    } finally {
      setAdding(false);
    }
  };

  const onComplete = async () => {
    if (!condominioId || !completeForId) return;
    setActionError(null);
    try {
      await completeConformity.mutateAsync({
        condominioId,
        itemId: completeForId,
        notes: completeNotes.trim(),
      });
      setCompleteForId(null);
      setCompleteNotes('');
    } catch (err) {
      setActionError(formatApiError(err));
    }
  };

  const handleReopen = async (itemId: string) => {
    if (!condominioId) return;
    setActionError(null);
    try {
      await reopenConformity.mutateAsync({ condominioId, itemId });
    } catch (err) {
      setActionError(formatApiError(err));
    }
  };

  const alertaTopo =
    canManage && (counts.critico > 0 || comprasRisco > 0)
      ? {
          tone: 'error' as const,
          text:
            counts.critico > 0 && comprasRisco > 0
              ? `Existem ${counts.critico} obrigação(ões) em estado crítico e ${comprasRisco} ponto(s) de alto risco nas compras.`
              : counts.critico > 0
                ? `Existem ${counts.critico} obrigação(ões) em estado crítico (atraso superior a ${DIAS_PARA_CRITICO} dias).`
                : `Há ${comprasRisco} ponto(s) de alto risco em aberto nas compras — reveja a fila "Compras".`,
        }
      : counts.vencido > 0 || (!canManage && comprasRisco > 0)
        ? {
            tone: 'warning' as const,
            text:
              counts.vencido > 0 && comprasRisco > 0
                ? `${counts.vencido} obrigação(ões) com prazo vencido e ${comprasRisco} ponto(s) de alto risco nas compras.`
                : counts.vencido > 0
                  ? `${counts.vencido} obrigação(ões) com prazo vencido — organize a vistoria ou a renovação.`
                  : `Há ${comprasRisco} ponto(s) de alto risco em aberto nas compras.`,
          }
        : null;

  if (isInitialLoading) {
    return (
      <PageLoadingState
        id="obligation-hub-loading"
        message="Carregando obrigações do condomínio…"
        skeletonMaxWidth={640}
      />
    );
  }

  if (queryError && items.length === 0) {
    return <PageFatalErrorState id="obligation-hub" message={queryError} onRetry={() => void refetch()} />;
  }

  const getBadgeVariant = (bucket: ObrigacaoBucket): BadgeVariant => {
    switch (bucket) {
      case 'em-dia':
        return 'ok';
      case 'pendente':
        return 'warn';
      case 'vencido':
        return 'danger';
      default:
        return 'error';
    }
  };

  const getButtonVariant = (bucket: ObrigacaoBucket): ButtonVariant => {
    switch (bucket) {
      case 'em-dia':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  return (
    <div className="obligation-hub space-y-6 md:space-y-8" id="obligation-hub">
      <div className="mb-6">
        <PageHeader
          eyebrow="Inspeções e obrigações legais"
          title="Obrigações do condomínio"
          description="Conformidade regulatória na auditoria do condomínio: vistorias, licenças, AVCB e prazos — apoio à fiscalização, não gestão operacional."
          layout="stack"
        />
      </div>

      {!canManage && (
        <div
          className="rounded-2xl border border-surface-border bg-surface-muted/50 p-4 text-sm text-text-muted"
          role="status"
        >
          <strong className="text-text-main">Modo leitura.</strong> Você pode consultar os serviços e status
          (Em dia, Pendente, Vencido), mas não pode marcar obrigações como concluídas.
        </div>
      )}

      {(error || alertaTopo) && (
        <div className="space-y-2 mb-4">
          {error && (
            <div className="banner banner--error rounded-2xl border p-4 shadow-sm" role="alert">
              {error}
            </div>
          )}

          {alertaTopo && (
            <div
              className={`banner banner--${alertaTopo.tone} rounded-2xl border p-4 shadow-sm`}
              role="status"
            >
              {alertaTopo.text}
            </div>
          )}
        </div>
      )}

      {/* KPIs de Estado */}
      <Card padding="none" className="rounded-2xl border shadow-sm mb-4 md:mb-6">
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5 ${canManage ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
        >
          {displayBuckets.map((b) => (
            <button
              key={b}
              type="button"
              className={`flex flex-col items-center justify-center min-h-[120px] rounded-2xl border-2 bg-surface-background p-4 transition-all hover:shadow-md ${
                filterBucket === b ? 'border-brand-primary bg-surface-muted' : 'border-surface-border'
              }`}
              onClick={() => setFilterBucket((prev) => (prev === b ? 'todos' : b))}
              title={BUCKET_META[b].hint}
            >
              <span className="text-sm font-medium text-text-main">{BUCKET_META[b].label}</span>
              <span className="text-2xl font-bold text-brand-primary mt-1">{counts[b]}</span>
              <span className="text-xs text-text-muted mt-1">{BUCKET_META[b].hint}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Strip de Compras Pendentes */}
      {(comprasPendentes > 0 || findings.length > 0) && (
        <Card padding="lg" hoverEffect={false} className="rounded-2xl border shadow-sm mb-4 md:mb-6">
          <div className="flex flex-col gap-4 lg:flex-row items-start lg:items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-text-main">Pendências nas compras</h3>
              <p className="text-sm text-text-muted mt-1">
                Validações de documentos e regras operacionais ligadas a despesas — abra cada item para anexar
                provas ou regularizar.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="neutral"
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
              >
                {comprasPendentes} em aberto
              </Badge>
              {comprasRisco > 0 && (
                <Badge
                  variant="danger"
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                >
                  {comprasRisco} alto risco
                </Badge>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Tabs de Visão */}
      <p className="text-xs text-text-muted md:hidden -mt-2 mb-1">Deslize para ver as vistas</p>
      <div
        className="flex gap-2 mt-4 mb-6 overflow-x-auto pb-2 scrollbar-thin"
        role="tablist"
        aria-label="Vista do hub"
      >
        <button
          type="button"
          role="tab"
          aria-selected={visao === 'lista'}
          className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
            visao === 'lista'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'bg-surface-muted text-text-main hover:bg-surface-border'
          }`}
          onClick={() => setVisao('lista')}
        >
          Checklist
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={visao === 'calendario'}
          className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
            visao === 'calendario'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'bg-surface-muted text-text-main hover:bg-surface-border'
          }`}
          onClick={() => setVisao('calendario')}
        >
          Calendário
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={visao === 'compras'}
          className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
            visao === 'compras'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'bg-surface-muted text-text-main hover:bg-surface-border'
          }`}
          onClick={() => setVisao('compras')}
        >
          Fila compras
        </button>
      </div>

      {/* Filtros */}
      <Card padding="lg" hoverEffect={false} className="rounded-2xl border shadow-sm mb-4 md:mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="flex-1 min-w-0">
            <span className="text-sm font-medium text-text-main">Procurar</span>
            <input
              type="search"
              placeholder="Ex.: bombeiros, elevador, AVCB…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              className="w-full mt-2 rounded-xl border border-surface-border bg-surface-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                filterBucket === 'todos'
                  ? 'bg-brand-primary text-white'
                  : 'bg-surface-muted text-text-main hover:bg-surface-border'
              }`}
              onClick={() => setFilterBucket('todos')}
            >
              Todas ({items.length})
            </button>
            {(displayBuckets as ObrigacaoBucket[]).map((b) => (
              <button
                key={b}
                type="button"
                className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  filterBucket === b
                    ? 'bg-brand-primary text-white'
                    : 'bg-surface-muted text-text-main hover:bg-surface-border'
                }`}
                onClick={() => setFilterBucket(b)}
              >
                {BUCKET_META[b].label} ({counts[b]})
              </button>
            ))}
          </div>
        </div>
      </Card>
      {/* Vista: Lista de Obrigações */}
      {visao === 'lista' && (
        <section aria-label="Checklist de obrigações" className="space-y-4">
          <Card padding="none" hoverEffect={false} className="rounded-2xl border shadow-sm mb-4 md:mb-6">
            <div className="p-4 border-b border-surface-border">
              <h2 className="font-semibold text-text-main">O que precisa da sua atenção</h2>
              <p className="text-sm text-text-muted mt-1">
                Toque no estado acima para filtrar. Itens concluídos ficam em "Em dia".
              </p>
            </div>

            <div className="p-4 space-y-4">
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-text-muted">Nenhuma obrigação neste filtro.</p>
                </div>
              ) : (
                filteredItems.map((it) => {
                  const b = bucketForDisplay(it, mergeCriticoIntoVencido);
                  return (
                    <Card
                      key={it.id}
                      padding="lg"
                      hoverEffect={false}
                      className="rounded-2xl border shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge
                              variant={getBadgeVariant(b)}
                              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                            >
                              {BUCKET_META[b].label}
                            </Badge>
                            <span className="text-sm text-text-muted">{it.typeLabel}</span>
                          </div>
                          <h3 className="font-medium text-text-main mb-2">{it.description}</h3>
                          <dl className="space-y-1.5 text-sm">
                            <div>
                              <dt className="text-text-muted">Prazo</dt>
                              <dd>
                                {it.lifecycle === 'completed'
                                  ? `Concluído em ${formatDatePt(it.completedAt)}`
                                  : formatDatePt(it.dueDate)}
                              </dd>
                            </div>
                            {it.notes && (
                              <div>
                                <dt className="text-text-muted">Notas</dt>
                                <dd>{it.notes}</dd>
                              </div>
                            )}
                          </dl>
                        </div>
                        {canManage ? (
                          <Button
                            variant={getButtonVariant(b)}
                            size="sm"
                            onClick={() => {
                              if (b === 'em-dia') {
                                void handleReopen(it.id);
                              } else {
                                setCompleteForId(it.id);
                                setCompleteNotes('');
                              }
                            }}
                          >
                            {b === 'em-dia' ? 'Reabrir' : 'Marcar como feito'}
                          </Button>
                        ) : null}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </Card>
        </section>
      )}

      {/* Vista: Calendário */}
      {visao === 'calendario' && (
        <section aria-label="Obrigações por mês de vencimento" className="space-y-4">
          <Card padding="none" hoverEffect={false} className="rounded-2xl border shadow-sm mb-4 md:mb-6">
            {calendarGroups.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-text-muted">Nenhum item neste filtro.</p>
              </div>
            ) : (
              calendarGroups.map(({ key, items: group }) => (
                <div key={key} className="border-b border-surface-border last:border-0 p-4 space-y-4">
                  <h3 className="font-semibold text-text-main mb-3">{formatMonthPt(key)}</h3>
                  <ul className="space-y-3">
                    {group.map((it) => {
                      const b = bucketForDisplay(it, mergeCriticoIntoVencido);
                      return (
                        <li
                          className="rounded-xl border border-surface-border bg-surface-muted/30 p-3"
                          key={it.id}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                                b === 'em-dia'
                                  ? 'bg-green-500'
                                  : b === 'pendente'
                                    ? 'bg-yellow-500'
                                    : b === 'vencido'
                                      ? 'bg-red-500'
                                      : 'bg-orange-500'
                              }`}
                              aria-hidden
                            />
                            <div className="flex-1 min-w-0">
                              <strong>{it.typeLabel}</strong>
                              <p className="text-sm text-text-muted mt-0.5 truncate">{it.description}</p>
                              <p className="text-xs text-text-muted mt-1">
                                {it.lifecycle === 'completed'
                                  ? `Feito em ${formatDatePt(it.completedAt)}`
                                  : `Vence ${formatDatePt(it.dueDate)} · ${BUCKET_META[b].label}`}
                              </p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </Card>
        </section>
      )}

      {/* Vista: Fila de Compras */}
      {visao === 'compras' && (
        <section aria-label="Fila de pendências nas compras" className="space-y-4">
          <Card padding="lg" hoverEffect={false} className="rounded-2xl border shadow-sm mb-4 md:mb-6">
            <h2 className="font-semibold text-text-main mb-4">Documentação e validações nas compras</h2>
            {findingsError && <p className="text-sm text-status-error">{findingsError}</p>}
            {!findingsError && sortedFindings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-text-muted">Nenhuma pendência global neste momento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedFindings.map((r, i) => {
                  const eid = strRow(r, 'expenseId', 'ExpenseId');
                  const title = strRow(r, 'title', 'Title');
                  const rule = strRow(r, 'ruleCode', 'RuleCode');
                  const sev = strRow(r, 'severity', 'Severity');
                  const fid = strRow(r, 'id', 'Id');
                  const high = sev.toUpperCase() === 'HIGH' || sev.toUpperCase() === 'CRITICAL';
                  return (
                    <Card
                      key={fid + String(i)}
                      padding="lg"
                      hoverEffect={false}
                      className="rounded-2xl border shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={high ? 'danger' : 'neutral'}
                              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                            >
                              Prioridade {severityPt(sev)}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-text-main">{title}</h3>
                          <p className="text-sm text-text-muted mt-1">
                            Referência interna: {rule}
                            {eid !== '—' ? ` · Despesa ${eid.slice(0, 8)}…` : ''}
                          </p>
                        </div>
                        {eid !== '—' && (
                          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                            <Link
                              to={`/compras/${encodeURIComponent(eid)}`}
                              className="btn-primary text-center"
                            >
                              Abrir despesa
                            </Link>
                            {canManage && (
                              <Link
                                to={`/conformidades/despesa/${encodeURIComponent(eid)}`}
                                className="inline-flex items-center justify-center rounded-xl border border-surface-border bg-surface-background px-4 py-2 text-sm font-medium text-brand-primary hover:bg-surface-muted"
                              >
                                Conformidade
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
            <p className="text-sm text-text-muted mt-4">
              O detalhe técnico (comentários, evidências, excepções) continua disponível ao abrir cada
              despesa.
            </p>
          </Card>
        </section>
      )}

      {/* Formulário de Nova Obrigação */}
      <Card padding="lg" hoverEffect={false} className="rounded-2xl border shadow-sm mb-4 md:mb-6">
        {!canManage ? (
          <div className="text-center py-6">
            <strong className="text-text-main">Modo leitura.</strong>
            <p className="text-sm text-text-muted mt-1">
              Apenas perfis com permissão de escrita (ex.: Síndico) podem cadastrar novas obrigações.
            </p>
          </div>
        ) : (
          <form onSubmit={onAdd} className="space-y-4">
            <h2 className="font-semibold text-text-main mb-2">Registar nova obrigação ou vistoria</h2>
            <p className="text-sm text-text-muted mb-4">
              Ex.: inspeção de elevadores, limpeza de caixa d'água, licença municipal. Só precisa de uma
              descrição clara; o prazo é opcional mas ajuda o calendário.
            </p>
            <label className="block">
              <span className="text-sm font-medium text-text-main">O quê precisa ser feito?</span>
              <input
                required
                maxLength={500}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Ex.: Vistoria anual do elevador — contrato com manutenção X"
                className="w-full mt-2 rounded-xl border border-surface-border bg-surface-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-text-main">
                Prazo ou próxima data prevista (opcional)
              </span>
              <input
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="w-full mt-2 rounded-xl border border-surface-border bg-surface-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </label>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={adding || !condominioId}
              className="mt-2"
            >
              {adding ? 'Salvando…' : 'Adicionar à lista'}
            </Button>
          </form>
        )}
      </Card>

      {/* Modal de Confirmação */}
      {canManage && completeForId && (
        <Modal
          open={!!completeForId}
          onClose={() => setCompleteForId(null)}
          title="Marcar obrigação como concluída"
          footer={null}
        >
          <div className="space-y-4 p-6">
            <p className="text-sm text-text-muted">
              Opcional: deixe uma nota para o conselho (ex.: número do protocolo, data da vistoria).
            </p>
            <textarea
              rows={3}
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              placeholder="Notas para histórico…"
              className="w-full rounded-xl border border-surface-border bg-surface-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCompleteForId(null)}>
                Cancelar
              </Button>
              <Button variant="primary" disabled={isMutating} onClick={() => void onComplete()}>
                Confirmar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ComplianceObrigacoesHubPage;
