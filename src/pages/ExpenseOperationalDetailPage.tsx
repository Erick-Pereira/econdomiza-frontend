import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EcondomizaApi } from '../services';
import { formatApiError } from '../lib/api-error-message';
import { formatDatePtBr, formatDateTimePtBr } from '../lib/format-date-pt-br';
import { PageHeader } from '../components/layout/PageHeader';
import { PageFatalErrorState, PageLoadingState } from '../components/layout/PageLoadStates';
import { useToast } from '../components/ui/Toast';
import {
  approvalStatusTone,
  asRecord,
  confidenceTone,
  formatConfidencePercent,
  humanizeApprovalPt,
  humanizeProcessingPt,
  humanizeSettlementPt,
  pickBool,
  pickNum,
  pickStr,
  processingStatusTone,
  settlementStatusTone,
} from '../lib/expense-operational-ui';

type PipelineStep = { code: string; label: string; state: string };
type TimelineEntry = {
  source: string;
  at: string;
  title: string;
  detail?: string | null;
  action?: string | null;
  actorId?: string | null;
  actorName?: string | null;
};

const PAYMENT_METHODS = ['Pix', 'Boleto', 'BankTransfer', 'Cash', 'Card', 'Other'] as const;

const NEXT_ACTION_LABELS: Record<string, string> = {
  approve: 'Aprovar despesa',
  reject: 'Rejeitar (com justificativa)',
  cancel: 'Cancelar (com motivo)',
  retry_processing: 'Reiniciar processamento',
  register_payment: 'Registar pagamento',
  refund_payment: 'Estornar pagamento',
};

function badgeClass(tone: string): string {
  return `op-badge op-badge--${tone}`;
}

function parseTimeline(raw: unknown): TimelineEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: TimelineEntry[] = [];
  for (const x of raw) {
    const o = asRecord(x);
    if (!o) continue;
    const at = pickStr(o, 'at', 'At');
    if (!at) continue;
    out.push({
      source: pickStr(o, 'source', 'Source') || 'system',
      at,
      title: pickStr(o, 'title', 'Title') || 'Evento',
      detail: pickStr(o, 'detail', 'Detail') || undefined,
      action: pickStr(o, 'action', 'Action') || undefined,
      actorId: pickStr(o, 'actorId', 'ActorId') || undefined,
      actorName: pickStr(o, 'actorName', 'ActorName') || undefined,
    });
  }
  return out.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function parseSteps(raw: unknown): PipelineStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const o = asRecord(x);
      if (!o) return null;
      return {
        code: pickStr(o, 'code', 'Code'),
        label: pickStr(o, 'label', 'Label') || pickStr(o, 'code', 'Code'),
        state: pickStr(o, 'state', 'State') || 'pending',
      };
    })
    .filter((x): x is PipelineStep => x != null && !!x.code);
}

type TimelineTab = 'all' | 'audit' | 'ia';

function timelineTabFilter(tab: TimelineTab, e: TimelineEntry): boolean {
  if (tab === 'all') return true;
  const t = `${e.title} ${e.detail ?? ''} ${e.action ?? ''}`.toLowerCase();
  if (tab === 'audit') return e.source === 'audit';
  if (tab === 'ia') {
    if (e.action === 'Confidence' || /confiança|benchmark|priceanalyzed|enriquecimento/i.test(t)) return true;
    if (e.source === 'audit' && e.action === 'PriceAnalyzed') return true;
    return false;
  }
  return true;
}

const ExpenseOperationalDetailPage: React.FC = () => {
  const { expenseId = '' } = useParams<{ expenseId: string }>();
  const navigate = useNavigate();
  const { show } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [timelineTab, setTimelineTab] = useState<TimelineTab>('all');

  const [reasonOpen, setReasonOpen] = useState<'reject' | 'cancel' | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payMethod, setPayMethod] = useState<string>('Pix');
  const [payRef, setPayRef] = useState('');
  const [refundPid, setRefundPid] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!expenseId) return;
    try {
      setLoading(true);
      const res = await EcondomizaApi.getExpense(expenseId);
      const d = res.data;
      setRaw(d && typeof d === 'object' ? (d as Record<string, unknown>) : null);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(formatApiError(e));
      setRaw(null);
    } finally {
      setLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const gov = useMemo(() => asRecord(raw?.governance ?? raw?.Governance), [raw]);
  const allowed = useMemo(() => asRecord(gov?.allowedActions ?? gov?.AllowedActions), [gov]);
  const nextActions = useMemo(() => {
    const n = gov?.nextActions ?? gov?.NextActions;
    return Array.isArray(n) ? (n as string[]) : [];
  }, [gov]);

  const timeline = useMemo(() => parseTimeline(raw?.operationalTimeline ?? raw?.OperationalTimeline), [raw]);
  const filteredTimeline = useMemo(
    () => timeline.filter((e) => timelineTabFilter(timelineTab, e)),
    [timeline, timelineTab]
  );

  const processingSteps = useMemo(
    () => parseSteps(gov?.processingSteps ?? gov?.ProcessingSteps),
    [gov]
  );
  const approvalSteps = useMemo(() => parseSteps(gov?.approvalSteps ?? gov?.ApprovalSteps), [gov]);
  const settlementSteps = useMemo(() => parseSteps(gov?.settlementSteps ?? gov?.SettlementSteps), [gov]);

  const currentProcessing = useMemo(
    () => processingSteps.find((s) => s.state === 'current') ?? processingSteps.find((s) => s.code === pickStr(raw ?? {}, 'processingStatus', 'ProcessingStatus')),
    [processingSteps, raw]
  );

  const items = useMemo(() => {
    const arr = raw?.items ?? raw?.Items;
    if (!Array.isArray(arr)) return [] as Record<string, unknown>[];
    return arr.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
  }, [raw]);

  const payments = useMemo(() => {
    const arr = raw?.payments ?? raw?.Payments;
    if (!Array.isArray(arr)) return [] as Record<string, unknown>[];
    return arr.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
  }, [raw]);

  const processingCode = pickStr(raw ?? {}, 'processingStatus', 'ProcessingStatus');
  const approvalCode = pickStr(raw ?? {}, 'approvalStatus', 'ApprovalStatus');
  const settlementCode = pickStr(raw ?? {}, 'settlementStatus', 'SettlementStatus');
  const legacyStatus = pickStr(raw ?? {}, 'status', 'Status');
  const conf = pickNum(raw ?? {}, 'confidenceScore', 'ConfidenceScore');
  const lowConf = pickBool(raw ?? {}, 'lowConfidence', 'LowConfidence');
  const failReason = pickStr(raw ?? {}, 'processingFailureReason', 'ProcessingFailureReason');
  const retryCount = pickNum(raw ?? {}, 'processingRetryCount', 'ProcessingRetryCount') ?? 0;
  const failedAt = pickStr(raw ?? {}, 'processingFailedAt', 'ProcessingFailedAt');
  const lastPipe = pickStr(raw ?? {}, 'lastPipelineTransitionAt', 'LastPipelineTransitionAt');

  const money = (n: number | null) =>
    n == null || !Number.isFinite(n)
      ? '—'
      : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    try {
      setBusy(true);
      await fn();
      show(okMsg, 'success');
      await load();
    } catch (e) {
      show(formatApiError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onApprove = () =>
    run(() => EcondomizaApi.approveExpense(expenseId), 'Despesa aprovada.');

  const submitReason = async () => {
    const r = reasonText.trim();
    if (r.length < 3) {
      show('Indique uma justificativa (mín. 3 caracteres).', 'warning');
      return;
    }
    if (reasonOpen === 'reject') {
      setReasonOpen(null);
      setReasonText('');
      await run(() => EcondomizaApi.rejectExpense(expenseId, r), 'Despesa rejeitada.');
    } else if (reasonOpen === 'cancel') {
      setReasonOpen(null);
      setReasonText('');
      await run(() => EcondomizaApi.cancelExpense(expenseId, r), 'Despesa cancelada.');
    }
  };

  const onRetry = () => run(() => EcondomizaApi.retryExpenseProcessing(expenseId), 'Reprocessamento pedido.');

  const submitPayment = async () => {
    const amount = Number(String(payAmount).replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      show('Valor de pagamento inválido.', 'warning');
      return;
    }
    if (!payDate) {
      show('Indique a data do pagamento.', 'warning');
      return;
    }
    const iso = new Date(payDate).toISOString();
    setPaymentOpen(false);
    setPayAmount('');
    setPayRef('');
    await run(
      () =>
        EcondomizaApi.registerExpensePayment(expenseId, {
          amount,
          paymentDate: iso,
          method: payMethod,
          referenceCode: payRef.trim() || null,
        }),
      'Pagamento registado.'
    );
  };

  const submitRefund = async () => {
    const r = refundReason.trim();
    if (!refundPid || r.length < 3) {
      show('Motivo do estorno obrigatório.', 'warning');
      return;
    }
    const pid = refundPid;
    setRefundPid(null);
    setRefundReason('');
    await run(() => EcondomizaApi.refundExpensePayment(expenseId, pid, r), 'Estorno registado.');
  };

  if (!expenseId) {
    return <PageFatalErrorState id="expense-detail" message="Identificador em falta." onRetry={() => navigate('/compras')} />;
  }

  if (loading && !raw) {
    return <PageLoadingState id="expense-detail" message="Carregando despesa…" />;
  }

  if (error && !raw) {
    return <PageFatalErrorState id="expense-detail" message={error} onRetry={() => void load()} />;
  }

  if (!raw) {
    return <PageFatalErrorState id="expense-detail" message="Resposta vazia." onRetry={() => void load()} />;
  }

  const desc = pickStr(raw, 'description', 'Description');
  const supplier = pickStr(raw, 'supplierName', 'SupplierName');
  const supplierId = pickStr(raw, 'supplierId', 'SupplierId');
  const issue = pickStr(raw, 'issueDate', 'IssueDate');
  const total = pickNum(raw, 'totalAmount', 'TotalAmount');
  const paid = pickNum(raw, 'totalPaid', 'TotalPaid');
  const outstanding = pickNum(raw, 'outstandingBalance', 'OutstandingBalance');
  const rawDoc = pickStr(raw, 'rawDocumentId', 'RawDocumentId');

  const canApprove = !!allowed?.approve || !!allowed?.Approve;
  const canReject = !!allowed?.reject || !!allowed?.Reject;
  const canCancel = !!allowed?.cancel || !!allowed?.Cancel;
  const canRetry = !!allowed?.retryProcessing || !!allowed?.RetryProcessing;
  const canPay = !!allowed?.registerPayment || !!allowed?.RegisterPayment;
  const canRefund = !!allowed?.refundPayment || !!allowed?.RefundPayment;

  return (
    <div className="page" id="expense-operational-detail">
      <PageHeader
        title="Despesa — vista operacional"
        description="Ciclo de vida, governança, linha temporal e ações alinhadas ao processamento e às políticas do condomínio."
        quickLinks={[
          { to: '/compras', label: 'Lista de compras' },
          { to: `/conformidades/despesa/${encodeURIComponent(pickStr(raw, 'id', 'Id'))}`, label: 'Pendências desta compra' },
          { to: '/conformidades', label: 'Obrigações do condomínio' },
          { to: '/auditoria', label: 'Auditoria e documentos' },
        ]}
      />

      {error && <div className="banner banner--error">{error}</div>}

      <div className="op-detail-toolbar">
        <button type="button" className="btn-small secondary" onClick={() => navigate('/compras')}>
          ← Voltar à lista
        </button>
        <button type="button" className="btn-small secondary" disabled={busy} onClick={() => void load()}>
          Atualizar
        </button>
      </div>

      <section className="card op-hero">
        <div className="op-hero__main">
          <h2 className="op-hero__title">{desc || 'Despesa'}</h2>
          <p className="op-hero__meta">
            <span className="op-mono">{pickStr(raw, 'id', 'Id')}</span>
            {supplier && (
              <>
                {' · '}
                <span>Fornecedor: {supplier}</span>
              </>
            )}
            {!supplier && supplierId && (
              <>
                {' · '}
                <span>Fornecedor (id): {supplierId}</span>
              </>
            )}
          </p>
          <div className="op-hero__badges">
            <span className={badgeClass(processingStatusTone(processingCode))} title="Pipeline técnica">
              Pipeline: {humanizeProcessingPt(processingCode)}
            </span>
            <span className={badgeClass(approvalStatusTone(approvalCode))} title="Aprovação humana">
              Aprovação: {humanizeApprovalPt(approvalCode)}
            </span>
            <span className={badgeClass(settlementStatusTone(settlementCode))} title="Liquidação">
              Liquidação: {humanizeSettlementPt(settlementCode)}
            </span>
            <span className="op-badge op-badge--neutral" title="Espelho legado para relatórios">
              Estado legado: {legacyStatus || '—'}
            </span>
            <span className={badgeClass(confidenceTone(conf, lowConf))} title="Confiança do enriquecimento (0–1)">
              Confiança: {formatConfidencePercent(conf)}
              {lowConf ? ' · baixa' : ''}
            </span>
          </div>
        </div>
        <dl className="op-kpi-grid">
          <div>
            <dt>Total</dt>
            <dd>{money(total)}</dd>
          </div>
          <div>
            <dt>Pago</dt>
            <dd>{money(paid)}</dd>
          </div>
          <div>
            <dt>Em aberto</dt>
            <dd>{money(outstanding)}</dd>
          </div>
          <div>
            <dt>Emissão</dt>
            <dd>{issue ? formatDatePtBr(issue) : '—'}</dd>
          </div>
          <div>
            <dt>Retries pipeline</dt>
            <dd>{retryCount}</dd>
          </div>
          <div>
            <dt>Documento bruto</dt>
            <dd className="op-mono">{rawDoc || '—'}</dd>
          </div>
        </dl>
      </section>

      {(processingCode === 'Failed' || failReason) && (
        <div className="banner banner--error op-failure-banner">
          <strong>Falha de processamento</strong>
          {failedAt && <span className="op-muted"> · {formatDateTimePtBr(failedAt)}</span>}
          {failReason && <p className="op-failure-reason">{failReason}</p>}
          {lastPipe && <p className="op-muted">Última transição de pipeline: {formatDateTimePtBr(lastPipe)}</p>}
        </div>
      )}

      {processingCode === 'PartiallyCompleted' && (
        <div className="banner banner--warning">
          Processamento concluído com lacunas: validar itens e benchmark antes de aprovar.
        </div>
      )}

      <div className="op-two-col">
        <section className="card op-governance-card">
          <h3>Governança e máquina de estados</h3>
          <p className="op-muted">
            Três eixos independentes: pipeline técnica, decisão humana e liquidação. As ações disponíveis derivam do agregado
            no servidor.
          </p>

          <h4 className="op-subhead">Pipeline (técnica)</h4>
          <p className="op-current-line">
            Etapa atual:{' '}
            <strong>{currentProcessing?.label ?? humanizeProcessingPt(processingCode)}</strong>
          </p>
          <details className="op-catalog">
            <summary>Catálogo de estados da pipeline</summary>
            <ul className="op-step-list">
              {processingSteps.map((s) => (
                <li key={s.code} className={`op-step op-step--${s.state}`}>
                  <span className="op-step__code">{s.code}</span>
                  <span className="op-step__label">{s.label}</span>
                </li>
              ))}
            </ul>
          </details>

          <h4 className="op-subhead">Aprovação</h4>
          <ol className="op-track op-track--approval">
            {approvalSteps.map((s) => (
              <li key={s.code} className={`op-track__step op-track__step--${s.state}`}>
                <span className="op-track__dot" aria-hidden />
                <span>{s.label}</span>
              </li>
            ))}
          </ol>

          <h4 className="op-subhead">Liquidação</h4>
          <ol className="op-track op-track--settlement">
            {settlementSteps.map((s) => (
              <li key={s.code} className={`op-track__step op-track__step--${s.state}`}>
                <span className="op-track__dot" aria-hidden />
                <span>{s.label}</span>
              </li>
            ))}
          </ol>

          {nextActions.length > 0 && (
            <div className="op-next-actions">
              <span className="op-muted">Próximas ações possíveis (servidor):</span>
              <div className="op-next-actions__chips">
                {nextActions.map((k) => (
                  <span key={k} className="op-chip">
                    {NEXT_ACTION_LABELS[k] ?? k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="card op-side-card">
          <h3>Ações operacionais</h3>
          <div className="op-actions">
            <button type="button" className="btn-primary" disabled={busy || !canApprove} onClick={() => void onApprove()}>
              Aprovar
            </button>
            <button
              type="button"
              className="btn-small secondary"
              disabled={busy || !canReject}
              onClick={() => {
                setReasonText('');
                setReasonOpen('reject');
              }}
            >
              Rejeitar…
            </button>
            <button
              type="button"
              className="btn-small secondary"
              disabled={busy || !canCancel}
              onClick={() => {
                setReasonText('');
                setReasonOpen('cancel');
              }}
            >
              Cancelar…
            </button>
            <button type="button" className="btn-small secondary" disabled={busy || !canRetry} onClick={() => void onRetry()}>
              Reiniciar processamento
            </button>
            <button type="button" className="btn-small secondary" disabled={busy || !canPay} onClick={() => setPaymentOpen(true)}>
              Registar pagamento…
            </button>
          </div>
          <p className="op-muted op-small">
            Rejeição e cancelamento exigem justificativa (auditoria). Estorno por linha na tabela de pagamentos.
          </p>

          <h4 className="op-subhead">Conformidade e notificações</h4>
          <p className="op-muted op-small">
            Obrigações do condomínio (vistorias e prazos): use <Link to="/conformidades">Obrigações</Link>. Notificações por
            despesa não estão agregadas neste gateway — o disparo depende dos serviços de alerta configurados.
          </p>

          <h4 className="op-subhead">Benchmark (mercado)</h4>
          <p className="op-muted op-small">
            Resultados de benchmark aparecem na linha temporal como eventos de auditoria (ex.: análise de preço). Não existe
            endpoint público dedicado por despesa nesta versão do gateway.
          </p>
        </section>
      </div>

      <section className="card">
        <div className="op-timeline-header">
          <h3>Linha temporal operacional</h3>
          <div className="op-segmented" role="tablist">
            {(
              [
                ['all', 'Completa'],
                ['audit', 'Auditoria'],
                ['ia', 'IA & benchmark'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={timelineTab === key}
                className={timelineTab === key ? 'is-active' : ''}
                onClick={() => setTimelineTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ul className="op-timeline">
          {filteredTimeline.length === 0 && <li className="op-muted">Sem eventos neste filtro.</li>}
          {filteredTimeline.map((e, idx) => (
            <li key={`${e.at}-${idx}`} className={`op-timeline__item op-timeline__item--${e.source}`}>
              <time dateTime={e.at}>{formatDateTimePtBr(e.at)}</time>
              <div className="op-timeline__body">
                <strong>{e.title}</strong>
                {e.detail && <p className="op-timeline__detail">{e.detail}</p>}
                <p className="op-timeline__meta">
                  <span className="op-badge op-badge--neutral">{e.source}</span>
                  {e.action && <span className="op-mono">{e.action}</span>}
                  {e.actorName && <span>Por {e.actorName}</span>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="op-two-col">
        <section className="card">
          <h3>Itens da despesa</h3>
          {items.length === 0 ? (
            <p className="op-muted">Sem itens linha a linha.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Qtd</th>
                    <th>Unit.</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={pickStr(it, 'id', 'Id') + String(i)}>
                      <td>{pickStr(it, 'description', 'Description')}</td>
                      <td>{pickNum(it, 'quantity', 'Quantity') ?? '—'}</td>
                      <td>{money(pickNum(it, 'unitPrice', 'UnitPrice'))}</td>
                      <td>{money(pickNum(it, 'totalPrice', 'TotalPrice'))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h3>Pagamentos</h3>
          {payments.length === 0 ? (
            <p className="op-muted">Nenhum pagamento registado.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Valor</th>
                    <th>Método</th>
                    <th>Ref.</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => {
                    const pid = pickStr(p, 'id', 'Id');
                    const refunded = pickBool(p, 'isRefunded', 'IsRefunded');
                    return (
                      <tr key={pid + String(i)}>
                        <td>{formatDatePtBr(pickStr(p, 'paymentDate', 'PaymentDate'))}</td>
                        <td>{money(pickNum(p, 'amount', 'Amount'))}</td>
                        <td>{pickStr(p, 'method', 'Method')}</td>
                        <td className="op-mono">{pickStr(p, 'referenceCode', 'ReferenceCode') || '—'}</td>
                        <td>{refunded ? <span className="op-badge op-badge--warn">Estornado</span> : <span className="op-badge op-badge--ok">Ativo</span>}</td>
                        <td>
                          {!refunded && canRefund && (
                            <button
                              type="button"
                              className="btn-small secondary"
                              disabled={busy}
                              onClick={() => {
                                setRefundPid(pid);
                                setRefundReason('');
                              }}
                            >
                              Estornar…
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <h3>Justificativas e comentários</h3>
        <p className="op-muted op-small">
          Justificativas de rejeição, cancelamento e estorno são obrigatórias nas ações acima e ficam registadas no domínio e
          na linha temporal quando o backend as materializa em auditoria. Não existe ainda endpoint de comentários livres
          por despesa neste cliente.
        </p>
      </section>

      {(reasonOpen || paymentOpen || refundPid) && (
        <div
          className="op-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (busy) return;
            setReasonOpen(null);
            setPaymentOpen(false);
            setRefundPid(null);
          }}
        >
          <div
            className="op-modal"
            role="dialog"
            aria-modal="true"
            onClick={(ev) => ev.stopPropagation()}
          >
            {reasonOpen && (
              <>
                <h4>{reasonOpen === 'reject' ? 'Rejeitar despesa' : 'Cancelar despesa'}</h4>
                <textarea
                  className="op-textarea"
                  rows={4}
                  value={reasonText}
                  onChange={(ev) => setReasonText(ev.target.value)}
                  placeholder="Descreva o motivo (auditoria)."
                />
                <div className="op-modal__actions">
                  <button type="button" className="btn-small secondary" disabled={busy} onClick={() => setReasonOpen(null)}>
                    Fechar
                  </button>
                  <button type="button" className="btn-primary" disabled={busy} onClick={() => void submitReason()}>
                    Confirmar
                  </button>
                </div>
              </>
            )}
            {paymentOpen && (
              <>
                <h4>Registar pagamento</h4>
                <label className="op-field">
                  Valor (BRL)
                  <input type="text" inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                </label>
                <label className="op-field">
                  Data
                  <input type="datetime-local" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </label>
                <label className="op-field">
                  Método
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="op-field">
                  Referência (opcional)
                  <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
                </label>
                <div className="op-modal__actions">
                  <button type="button" className="btn-small secondary" disabled={busy} onClick={() => setPaymentOpen(false)}>
                    Fechar
                  </button>
                  <button type="button" className="btn-primary" disabled={busy} onClick={() => void submitPayment()}>
                    Registar
                  </button>
                </div>
              </>
            )}
            {refundPid && (
              <>
                <h4>Estornar pagamento</h4>
                <p className="op-muted op-small op-mono">{refundPid}</p>
                <textarea
                  className="op-textarea"
                  rows={3}
                  value={refundReason}
                  onChange={(ev) => setRefundReason(ev.target.value)}
                  placeholder="Motivo do estorno"
                />
                <div className="op-modal__actions">
                  <button type="button" className="btn-small secondary" disabled={busy} onClick={() => setRefundPid(null)}>
                    Fechar
                  </button>
                  <button type="button" className="btn-primary" disabled={busy} onClick={() => void submitRefund()}>
                    Confirmar estorno
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseOperationalDetailPage;
