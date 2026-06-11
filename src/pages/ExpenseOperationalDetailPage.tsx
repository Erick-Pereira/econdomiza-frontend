import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EcondomizaApi } from '../services';
import { formatApiError } from '../lib/api-error-message';
import { formatDatePtBr, formatDateTimePtBr } from '../lib/format-date-pt-br';
import { readIsoTimestamp } from '../lib/sort-by-date';
import { PageHeader } from '../components/layout/PageHeader';
import { PageFatalErrorState, PageLoadingState } from '../components/layout/PageLoadStates';
import { Card, Button, Badge } from '../components/ui';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/useToast';
import { useAuth } from '../context/AuthContext';
import { hasRole } from '../lib/permissions/rbac';
import { formatBrlInput, parseBrlInput } from '../lib/currency-br-input';
import {
  humanizeApprovalPt,
  humanizeProcessingPt,
  effectiveOutstandingBalance,
  humanizeSettlementPt,
  pickNum,
  readAllowedFlag,
  readDisabledReason,
  readEntityId,
} from '../lib/expense-operational-ui';
import { PriceAnalysisMarketProof } from '../components/expenses/PriceAnalysisMarketProof';
import { summarizePriceAnalyses } from '../lib/market-price-proof';
import {
  humanizeTimelineAction,
  humanizeTimelineDetail,
  TIMELINE_TAB_LABELS,
  timelineTabFilter,
  type TimelineTab,
} from '../lib/expense-timeline-humanize';

// Tipos e utilitários
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

import { ArrowLeft, CheckCircle2, AlertCircle, Clock, FileText, TrendingUp, CreditCard } from 'lucide-react';

const PAYMENT_METHOD_OPTIONS = [
  { value: 'Pix', label: 'Pix' },
  { value: 'Boleto', label: 'Boleto' },
  { value: 'BankTransfer', label: 'Transferência bancária' },
  { value: 'Cash', label: 'Dinheiro' },
  { value: 'Card', label: 'Cartão' },
  { value: 'Other', label: 'Outro' },
] as const;

const TIMELINE_SOURCE_PT: Record<string, string> = {
  system: 'Sistema',
  audit: 'Auditoria',
};

const NEXT_ACTION_LABELS: Record<string, string> = {
  approve: 'Aprovar despesa',
  reject: 'Rejeitar (com justificativa)',
  cancel: 'Cancelar (com motivo)',
  retry_processing: 'Reiniciar processamento',
  register_payment: 'Registar pagamento',
  refund_payment: 'Estornar pagamento',
};

function parseTimeline(raw: unknown): TimelineEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: TimelineEntry[] = [];
  for (const x of raw) {
    const o = typeof x === 'object' && x !== null ? x : {};
    if (!o) continue;
    const at = String(o.at || '');
    if (!at) continue;
    out.push({
      source: String(o.source || 'system'),
      at,
      title: String(o.title || 'Evento'),
      detail: o.detail ? String(o.detail) : undefined,
      action: o.action ? String(o.action) : undefined,
      actorId: o.actorId ? String(o.actorId) : undefined,
      actorName: o.actorName ? String(o.actorName) : undefined,
    });
  }
  return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function parseSteps(raw: unknown): PipelineStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const o = typeof x === 'object' && x !== null ? x : {};
      if (!o) return null;
      return {
        code: String(o.code || ''),
        label: String(o.label || o.code),
        state: String(o.state || 'pending'),
      };
    })
    .filter((x): x is PipelineStep => x != null && !!x.code);
}

const formatCurrency = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatStatusBadge = (label: string, tone: 'success' | 'warning' | 'error' | 'neutral') => {
  const variant =
    tone === 'success' ? 'ok' : tone === 'warning' ? 'warning' : tone === 'error' ? 'error' : 'neutral';
  return <Badge variant={variant}>{label}</Badge>;
};

const processingTone = (code: string) =>
  code === 'Failed'
    ? 'error'
    : code === 'PartiallyCompleted'
      ? 'warning'
      : code === 'Completed'
        ? 'success'
        : 'neutral';

const approvalTone = (code: string) =>
  code === 'Rejected' || code === 'Cancelled'
    ? 'error'
    : code === 'PendingApproval'
      ? 'warning'
      : code === 'Approved'
        ? 'success'
        : 'neutral';

const settlementTone = (code: string) =>
  code === 'Unpaid' || code === 'PartiallyPaid' ? 'warning' : code === 'Paid' ? 'success' : 'neutral';

const ExpenseOperationalDetailPage: React.FC = () => {
  const { expenseId = '' } = useParams<{ expenseId: string }>();
  const navigate = useNavigate();
  const { add } = useToast();
  const { profile } = useAuth();
  const isMoradorViewer = hasRole(profile?.role, 'MORADOR');
  const listBackPath = isMoradorViewer ? '/auditoria' : '/compras';
  const listBackLabel = isMoradorViewer ? 'Relatório de auditoria' : 'Lista de compras';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [timelineTab, setTimelineTab] = useState<TimelineTab>('decisions');
  const [expandedTimelineTechnical, setExpandedTimelineTechnical] = useState<number | null>(null);
  const [showPipelineDiagnostic, setShowPipelineDiagnostic] = useState(false);

  // Estados dos modais
  const [reasonOpen, setReasonOpen] = useState<'reject' | 'cancel' | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payMethod, setPayMethod] = useState<string>('Pix');
  const [payRef, setPayRef] = useState('');
  const [refundPid, setRefundPid] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

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

  // Parseamento de dados - corrigido para evitar erro de sintaxe com ?? e &&
  const gov = useMemo(() => {
    const governanceRaw = raw?.governance ?? raw?.Governance;
    return typeof governanceRaw === 'object' && governanceRaw !== null
      ? (governanceRaw as Record<string, unknown>)
      : {};
  }, [raw]);

  const allowedActionsRaw = gov?.allowedActions ?? gov?.AllowedActions;
  const allowed =
    typeof allowedActionsRaw === 'object' && allowedActionsRaw !== null
      ? (allowedActionsRaw as Record<string, unknown>)
      : {};

  const nextActionsRaw = gov?.nextActions ?? gov?.NextActions;
  const nextActions = Array.isArray(nextActionsRaw) ? nextActionsRaw : [];

  const timeline = useMemo(() => parseTimeline(raw?.operationalTimeline ?? raw?.OperationalTimeline), [raw]);
  const filteredTimeline = useMemo(
    () => timeline.filter((e) => timelineTabFilter(timelineTab, e)),
    [timeline, timelineTab]
  );

  const processingSteps = useMemo(() => parseSteps(gov?.processingSteps ?? gov?.ProcessingSteps), [gov]);

  const currentProcessing = useMemo(
    () =>
      processingSteps.find((s) => s.state === 'current') ??
      processingSteps.find((s) => s.code === String(raw?.processingStatus ?? raw?.ProcessingStatus)),
    [processingSteps, raw]
  );

  const items = useMemo(() => {
    const arr = raw?.items ?? raw?.Items;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
  }, [raw]);

  const payments = useMemo(() => {
    const arr = raw?.payments ?? raw?.Payments;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
  }, [raw]);

  // Status e valores - corrigido para evitar erro de sintaxe com ?? e ||
  const processingCode = String((raw?.processingStatus ?? raw?.ProcessingStatus) || '');
  const approvalCode = String((raw?.approvalStatus ?? raw?.ApprovalStatus) || '');
  const settlementCode = String((raw?.settlementStatus ?? raw?.SettlementStatus) || '');
  const legacyStatus = String((raw?.status ?? raw?.Status) || '');
  const conf = Number(raw?.confidenceScore ?? raw?.ConfidenceScore);
  const lowConf = Boolean(raw?.lowConfidence ?? raw?.LowConfidence);
  const failReason = String((raw?.processingFailureReason ?? raw?.ProcessingFailureReason) || '');
  const retryCount = Number(raw?.processingRetryCount ?? raw?.ProcessingRetryCount ?? 0);
  const failedAt = String((raw?.processingFailedAt ?? raw?.ProcessingFailedAt) || '');
  const lastPipe = String((raw?.lastPipelineTransitionAt ?? raw?.LastPipelineTransitionAt) || '');

  const desc = String((raw?.description ?? raw?.Description) || '');
  const supplier = String((raw?.supplierName ?? raw?.SupplierName) || '');
  const supplierId = String((raw?.supplierId ?? raw?.SupplierId) || '');
  const issue = String((raw?.issueDate ?? raw?.IssueDate) || '');
  const total = Number(raw?.totalAmount ?? raw?.TotalAmount);
  const paid = Number(raw?.totalPaid ?? raw?.TotalPaid);
  const outstanding = effectiveOutstandingBalance(
    approvalCode,
    pickNum(raw ?? {}, 'outstandingBalance', 'OutstandingBalance')
  );
  const rawDoc = String((raw?.rawDocumentId ?? raw?.RawDocumentId) || '');

  // Permissões
  const canApprove = readAllowedFlag(allowed, 'approve', 'Approve');
  const canReject = readAllowedFlag(allowed, 'reject', 'Reject');
  const canCancel = readAllowedFlag(allowed, 'cancel', 'Cancel');
  const canRetry = readAllowedFlag(allowed, 'retryProcessing', 'RetryProcessing');
  const canPay = readAllowedFlag(allowed, 'registerPayment', 'RegisterPayment');
  const canRefund = readAllowedFlag(allowed, 'refundPayment', 'RefundPayment');

  const disabledReasonRetry = readDisabledReason(allowed, 'retryProcessing');
  const disabledReasonCancel = readDisabledReason(allowed, 'cancel');
  const disabledReasonApprove = readDisabledReason(allowed, 'approve');

  const priceAnalyses = useMemo(() => {
    const arr = raw?.priceAnalyses ?? raw?.PriceAnalyses;
    if (!Array.isArray(arr)) return [];
    return [...arr]
      .filter((x) => x && typeof x === 'object')
      .sort(
        (a, b) =>
          readIsoTimestamp(b as Record<string, unknown>, 'analyzedAt', 'AnalyzedAt') -
          readIsoTimestamp(a as Record<string, unknown>, 'analyzedAt', 'AnalyzedAt')
      ) as Record<string, unknown>[];
  }, [raw]);

  const priceAnalysisSummary = useMemo(() => summarizePriceAnalyses(priceAnalyses), [priceAnalyses]);

  const headerDescription = useMemo(() => {
    const parts: string[] = [];
    if (supplier) parts.push(`Fornecedor: ${supplier}`);
    if (issue) parts.push(`Emissão: ${formatDatePtBr(issue)}`);
    if (Number.isFinite(total)) parts.push(`Total: ${formatCurrency(total)}`);
    return parts.length > 0 ? parts.join(' · ') : undefined;
  }, [supplier, issue, total]);

  const operationalStatusLine = useMemo(() => {
    const parts = [
      humanizeProcessingPt(processingCode),
      humanizeApprovalPt(approvalCode),
      humanizeSettlementPt(settlementCode, approvalCode),
    ];
    if (outstanding > 0) {
      parts.push(`${formatCurrency(outstanding)} em aberto`);
    }
    return parts.filter(Boolean).join(' · ');
  }, [processingCode, approvalCode, settlementCode, outstanding]);

  const MIN_REASON_LEN = 3;

  const validateReason = (text: string): string | null => {
    const r = text.trim();
    if (r.length < MIN_REASON_LEN) {
      return `Informe uma justificativa (mínimo ${MIN_REASON_LEN} caracteres).`;
    }
    return null;
  };

  // Ações
  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    try {
      setBusy(true);
      await fn();
      add(okMsg, 'success');
      await load();
    } catch (e) {
      add(formatApiError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onApprove = async () => {
    setApproveOpen(false);
    await run(() => EcondomizaApi.approveExpense(expenseId), 'Despesa aprovada.');
  };

  const submitReject = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const err = validateReason(reasonText);
    if (err) {
      setReasonError(err);
      add(err, 'info');
      return;
    }
    const r = reasonText.trim();
    try {
      setBusy(true);
      await EcondomizaApi.rejectExpense(expenseId, r);
      setReasonOpen(null);
      setReasonText('');
      setReasonError(null);
      add('Despesa rejeitada.', 'success');
      await load();
    } catch (err) {
      add(formatApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitCancel = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const err = validateReason(reasonText);
    if (err) {
      setReasonError(err);
      add(err, 'info');
      return;
    }
    const r = reasonText.trim();
    try {
      setBusy(true);
      await EcondomizaApi.cancelExpense(expenseId, r);
      setReasonOpen(null);
      setReasonText('');
      setReasonError(null);
      add('Despesa cancelada.', 'success');
      await load();
    } catch (err) {
      add(formatApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onRetry = () => run(() => EcondomizaApi.retryExpenseProcessing(expenseId), 'Reprocessamento pedido.');

  const submitPayment = async () => {
    const amount = parseBrlInput(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      add('Informe um valor de pagamento válido.', 'info');
      return;
    }
    if (!payDate) {
      add('Indique a data do pagamento.', 'info');
      return;
    }
    const iso = new Date(payDate).toISOString();
    try {
      setBusy(true);
      await EcondomizaApi.registerExpensePayment(expenseId, {
        amount,
        paymentDate: iso,
        method: payMethod,
        referenceCode: payRef.trim() || null,
      });
      setPaymentOpen(false);
      setPayAmount('');
      setPayRef('');
      add('Pagamento registado.', 'success');
      await load();
    } catch (e) {
      add(formatApiError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const openPaymentModal = () => {
    setPayAmount('');
    setPayRef('');
    setPayMethod('Pix');
    setPayDate(new Date().toISOString().slice(0, 16));
    setPaymentOpen(true);
  };

  const submitRefund = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const err = validateReason(refundReason);
    if (!refundPid) {
      const msg = 'Pagamento inválido — recarregue a página e tente novamente.';
      setRefundError(msg);
      add(msg, 'error');
      return;
    }
    if (err) {
      setRefundError(err);
      add(err, 'info');
      return;
    }
    const pid = refundPid;
    const r = refundReason.trim();
    try {
      setBusy(true);
      await EcondomizaApi.refundExpensePayment(expenseId, pid, r);
      setRefundPid(null);
      setRefundReason('');
      setRefundError(null);
      add('Estorno registado.', 'success');
      await load();
    } catch (err) {
      add(formatApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const openRefundModal = (paymentId: string) => {
    if (!paymentId) {
      add('Não foi possível identificar o pagamento.', 'error');
      return;
    }
    setRefundPid(paymentId);
    setRefundReason('');
    setRefundError(null);
  };

  if (!expenseId) {
    return (
      <PageFatalErrorState
        id="expense-detail"
        message="Identificador em falta."
        onRetry={() => navigate(listBackPath)}
      />
    );
  }

  if (loading && !raw) {
    return <PageLoadingState id="expense-detail" message="Carregando despesa…" />;
  }

  if (error && !raw) {
    return (
      <PageFatalErrorState
        id="expense-detail"
        message={error}
        onRetry={() => void load()}
        lead={
          <p className="text-sm text-[var(--text-muted)] mb-2">
            <button type="button" className="link-button" onClick={() => navigate(listBackPath)}>
              ← Voltar ao {listBackLabel.toLowerCase()}
            </button>
          </p>
        }
      />
    );
  }

  if (!raw) {
    return <PageFatalErrorState id="expense-detail" message="Resposta vazia." onRetry={() => void load()} />;
  }

  // Renderização
  return (
    <div className="page" id="expense-operational-detail">
      <PageHeader
        title={desc || 'Detalhes da Despesa'}
        description={headerDescription}
        breadcrumbs={[
          { to: listBackPath, label: isMoradorViewer ? 'Auditoria' : 'Despesas' },
          { label: desc || 'Detalhe' },
        ]}
        quickLinks={[
          {
            to: `/conformidades/despesa/${encodeURIComponent(expenseId)}`,
            label: 'Pendências de conformidade',
          },
        ]}
      />

      {isMoradorViewer && (
        <div
          className="rounded-xl border border-surface-border bg-surface-muted/50 px-4 py-3 text-sm text-text-muted mb-4"
          role="status"
        >
          <strong className="text-text-main">Modo leitura.</strong> Você pode consultar os dados da nota
          fiscal, mas não pode aprovar, pagar ou alterar esta despesa.
        </div>
      )}

      {error && <div className="banner banner--error">{error}</div>}

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(listBackPath)}
          icon={<ArrowLeft size={16} />}
        >
          Voltar
        </Button>
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => void load()}>
          Atualizar
        </Button>
      </div>

      {/* Hero Card */}
      <Card padding="lg">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Informações principais */}
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-bold text-text-main">{desc || 'Despesa'}</h2>

            <div className="flex flex-wrap items-center gap-3">
              {supplier && (
                <span className="text-sm text-text-muted">
                  Fornecedor: <strong>{supplier}</strong>
                </span>
              )}
              {!supplier && (
                <span className="text-sm text-text-muted">Fornecedor não identificado na nota</span>
              )}
            </div>

            {/* Badges de status */}
            <div className="flex flex-wrap items-center gap-2">
              {formatStatusBadge(humanizeProcessingPt(processingCode), processingTone(processingCode))}
              {formatStatusBadge(humanizeApprovalPt(approvalCode), approvalTone(approvalCode))}
              {formatStatusBadge(
                humanizeSettlementPt(settlementCode, approvalCode),
                settlementTone(settlementCode)
              )}
            </div>

            {/* Confiança */}
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-text-muted" />
              <span className="text-sm text-text-muted">
                Confiança: {conf != null ? `${(conf * 100).toFixed(0)}%` : '—'}
              </span>
              {lowConf && <Badge variant="warning">Baixa confiança</Badge>}
            </div>
          </div>

          {/* KPIs */}
          <div className="lg:w-64 space-y-3">
            <Card padding="none" hoverEffect={false}>
              <div className="flex items-center justify-between p-3">
                <span className="text-sm text-text-muted">Total</span>
                <span className="font-bold text-brand-primary">{formatCurrency(total)}</span>
              </div>
            </Card>
            <Card padding="none" hoverEffect={false}>
              <div className="flex items-center justify-between p-3">
                <span className="text-sm text-text-muted">Pago</span>
                <span className="font-bold text-green-600">{formatCurrency(paid)}</span>
              </div>
            </Card>
            <Card padding="none" hoverEffect={false}>
              <div className="flex items-center justify-between p-3">
                <span className="text-sm text-text-muted">Em aberto</span>
                <span className="font-bold text-yellow-600">{formatCurrency(outstanding)}</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Detalhes adicionais */}
        <div className="mt-4 pt-4 border-t border-surface-border">
          <button
            type="button"
            className="text-sm font-medium text-brand-primary hover:text-brand-secondary"
            onClick={() => setShowTechnicalDetails((v) => !v)}
            aria-expanded={showTechnicalDetails}
          >
            {showTechnicalDetails ? 'Ocultar detalhes técnicos' : 'Mostrar detalhes técnicos'}
          </button>
          {showTechnicalDetails && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-3">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">ID da despesa</p>
                <p className="font-medium text-sm break-all">{expenseId || '—'}</p>
              </div>
              {supplierId ? (
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide">ID do fornecedor</p>
                  <p className="font-medium text-sm break-all">{supplierId}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Emissão</p>
                <p className="font-medium">{issue ? formatDatePtBr(issue) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Retries pipeline</p>
                <p className="font-medium">{retryCount}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Documento origem</p>
                <p className="font-medium text-sm break-all" title={rawDoc}>
                  {rawDoc || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Status legado (API)</p>
                <p className="font-medium">{legacyStatus || '—'}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Análise de preços / benchmark */}
      {priceAnalyses.length > 0 && (
        <Card padding="lg" className="mb-4">
          <h3 className="text-lg font-semibold text-text-main mb-3 flex items-center gap-2">
            <TrendingUp size={18} />
            Análise de preços (auditoria)
          </h3>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="neutral">{priceAnalysisSummary.total} linha(s)</Badge>
            {priceAnalysisSummary.criticalCount > 0 && (
              <Badge variant="error">
                {priceAnalysisSummary.criticalCount}{' '}
                {priceAnalysisSummary.criticalCount === 1 ? 'crítico' : 'críticos'}
              </Badge>
            )}
            {Number.isFinite(priceAnalysisSummary.worstDeviation) &&
              priceAnalysisSummary.worstDeviation !== 0 && (
                <Badge variant="warning">
                  Pior desvio: {priceAnalysisSummary.worstDeviation.toFixed(1)}%
                </Badge>
              )}
            {priceAnalysisSummary.needsLinkConfirmation && <Badge variant="warn">Confirme links</Badge>}
          </div>
          <p className="text-sm text-text-muted mb-4">
            Valores da NF, referências de mercado e links para verificação independente.
          </p>
          <div className="space-y-3">
            {priceAnalyses.map((row, idx) => (
              <PriceAnalysisMarketProof
                key={`${String(row.productId ?? row.ProductId ?? idx)}-${idx}`}
                row={row as Record<string, unknown>}
                expenseItems={items}
                formatCurrency={formatCurrency}
                formatAnalyzedAt={formatDateTimePtBr}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Banner de falha */}
      {(processingCode === 'Failed' || failReason) && (
        <div className="banner banner--error mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <strong>Falha de processamento</strong>
            {failedAt && <span className="op-muted"> · {formatDateTimePtBr(failedAt)}</span>}
          </div>
          {failReason && <p className="mt-2">{failReason}</p>}
          {lastPipe && (
            <p className="text-sm text-text-muted mt-1">Última transição: {formatDateTimePtBr(lastPipe)}</p>
          )}
        </div>
      )}

      {/* Processamento parcial */}
      {processingCode === 'PartiallyCompleted' && (
        <div className="banner banner--warning mb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <strong>Processamento incompleto</strong>
          </div>
          <p className="mt-1">Validar itens e benchmark antes de aprovar.</p>
        </div>
      )}

      {/* Duas colunas: Governança + Ações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Governança */}
        <Card padding="lg" className={isMoradorViewer ? 'lg:col-span-3' : 'lg:col-span-2'}>
          <h3 className="text-lg font-semibold text-text-main mb-2 flex items-center gap-2">
            <FileText size={18} />
            Status da despesa
          </h3>
          <p className="text-sm text-text-main mb-4">{operationalStatusLine}</p>

          {nextActions.length > 0 && (
            <div className="mb-4 rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3">
              <h4 className="font-medium text-text-main mb-2 flex items-center gap-2">
                <TrendingUp size={16} />O que fazer agora
              </h4>
              <div className="flex flex-wrap gap-2">
                {nextActions.map((k) => (
                  <Badge key={String(k)} variant="neutral">
                    {NEXT_ACTION_LABELS[String(k)] ?? String(k)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <button
              type="button"
              className="text-sm font-medium text-brand-primary hover:text-brand-secondary"
              onClick={() => setShowPipelineDiagnostic((v) => !v)}
              aria-expanded={showPipelineDiagnostic}
            >
              {showPipelineDiagnostic ? 'Ocultar diagnóstico técnico' : 'Mostrar diagnóstico técnico'}
            </button>
            {showPipelineDiagnostic && (
              <div className="mt-3 rounded-lg border border-surface-border bg-surface-muted/30 p-3 text-sm">
                <p>
                  Etapa de processamento:{' '}
                  <strong>{currentProcessing?.label ?? humanizeProcessingPt(processingCode)}</strong>
                </p>
                {processingSteps.length > 0 && (
                  <ul className="mt-2 space-y-1 text-text-muted">
                    {processingSteps.map((s) => (
                      <li key={s.code}>
                        {s.label} —{' '}
                        {s.state === 'current' ? 'atual' : s.state === 'done' ? 'concluída' : 'pendente'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h4 className="font-medium text-text-main flex items-center gap-2">
                <Clock size={16} />
                Histórico
              </h4>
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar histórico">
                {TIMELINE_TAB_LABELS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={timelineTab === tab.id}
                    className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                      timelineTab === tab.id
                        ? 'border-brand-primary bg-brand-primary/10 font-medium text-brand-primary'
                        : 'border-surface-border text-text-muted hover:border-brand-primary/30'
                    }`}
                    onClick={() => setTimelineTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div
              className="space-y-2 max-h-64 overflow-y-auto"
              role="tabpanel"
              aria-live="polite"
              aria-label="Eventos do histórico"
            >
              {filteredTimeline.length === 0 ? (
                <p className="text-sm text-text-muted">Sem eventos neste filtro.</p>
              ) : (
                filteredTimeline.map((e, idx) => {
                  const human = humanizeTimelineDetail(e);
                  const actionLabel = humanizeTimelineAction(e.action);
                  return (
                    <div
                      key={`${e.at}-${idx}`}
                      className="flex gap-3 p-3 rounded-lg border border-surface-border bg-surface-muted/30"
                    >
                      <time dateTime={e.at} className="text-xs text-text-muted whitespace-nowrap">
                        {formatDateTimePtBr(e.at)}
                      </time>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-text-main">{e.title}</p>
                        {human.summary ? (
                          <p className="text-xs text-text-muted mt-0.5">{human.summary}</p>
                        ) : null}
                        {human.technicalDetail ? (
                          <div className="mt-1">
                            <button
                              type="button"
                              className="text-xs text-brand-primary hover:underline"
                              onClick={() =>
                                setExpandedTimelineTechnical((cur) => (cur === idx ? null : idx))
                              }
                              aria-expanded={expandedTimelineTechnical === idx}
                            >
                              {expandedTimelineTechnical === idx
                                ? 'Ocultar dados técnicos'
                                : 'Ver dados técnicos'}
                            </button>
                            {expandedTimelineTechnical === idx ? (
                              <pre className="mt-1 max-h-32 overflow-auto rounded bg-surface-card p-2 text-[10px] text-text-muted whitespace-pre-wrap break-all">
                                {human.technicalDetail}
                              </pre>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="neutral">{TIMELINE_SOURCE_PT[e.source] ?? e.source}</Badge>
                          {actionLabel ? (
                            <span className="text-xs text-text-muted">{actionLabel}</span>
                          ) : null}
                          {e.actorName ? (
                            <span className="text-xs text-text-muted">Por {e.actorName}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>

        {/* Ações */}
        {!isMoradorViewer && (
          <Card padding="lg">
            <h3 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
              <CheckCircle2 size={18} />
              Ações Operacionais
            </h3>

            <div className="space-y-2 mb-4">
              <Button
                variant="primary"
                fullWidth
                disabled={busy || !canApprove}
                title={!canApprove ? (disabledReasonApprove ?? undefined) : undefined}
                onClick={() => setApproveOpen(true)}
              >
                Aprovar…
              </Button>
              <Button
                variant="secondary"
                fullWidth
                disabled={busy || !canReject}
                onClick={() => {
                  setReasonText('');
                  setReasonError(null);
                  setReasonOpen('reject');
                }}
              >
                Rejeitar…
              </Button>
              <Button
                variant="secondary"
                fullWidth
                disabled={busy || !canCancel}
                title={!canCancel ? (disabledReasonCancel ?? undefined) : undefined}
                onClick={() => {
                  setReasonText('');
                  setReasonError(null);
                  setReasonOpen('cancel');
                }}
              >
                Cancelar…
              </Button>
              <Button
                variant="secondary"
                fullWidth
                disabled={busy || !canRetry}
                title={
                  !canRetry ? (disabledReasonRetry ?? 'Reinício disponível após falha técnica.') : undefined
                }
                onClick={() => void onRetry()}
              >
                Reiniciar processamento
              </Button>
              {!canRetry && disabledReasonRetry && (
                <p className="text-xs text-text-muted -mt-1">{disabledReasonRetry}</p>
              )}
            </div>

            <p className="text-xs text-text-muted mb-4">Rejeição e cancelamento exigem justificativa.</p>

            {/* Pagamentos */}
            <div className="border-t border-surface-border pt-4">
              <h4 className="font-medium text-text-main mb-2 flex items-center gap-2">
                <CreditCard size={16} />
                Pagamentos
              </h4>
              {payments.length === 0 ? (
                <p className="text-sm text-text-muted">Nenhum pagamento registado.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {payments.map((p, i) => {
                    const pid = readEntityId(p);
                    const refunded = Boolean(p?.isRefunded ?? p?.IsRefunded);
                    return (
                      <div
                        key={pid || `payment-${i}`}
                        className="flex items-center justify-between p-2 rounded border border-surface-border"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {formatCurrency(Number((p?.amount ?? p?.Amount) || 0))}
                          </p>
                          <p className="text-xs text-text-muted">
                            {(p?.paymentDate ?? p?.PaymentDate)
                              ? formatDatePtBr(String(p?.paymentDate ?? p?.PaymentDate))
                              : '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={refunded ? 'warn' : 'ok'}>{refunded ? 'Estornado' : 'Ativo'}</Badge>
                          {!refunded && canRefund && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={!pid || busy}
                              onClick={() => openRefundModal(pid)}
                            >
                              Estornar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button
                variant="secondary"
                fullWidth
                className="mt-3"
                disabled={busy || !canPay}
                onClick={openPaymentModal}
              >
                Registar pagamento…
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Itens da despesa */}
      <Card padding="lg" className="mb-6">
        <h3 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
          <FileText size={18} />
          Itens da Despesa
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-text-muted">Sem itens linha a linha.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left py-2 text-sm font-medium text-text-muted">Descrição</th>
                  <th className="text-right py-2 text-sm font-medium text-text-muted">Qtd</th>
                  <th className="text-right py-2 text-sm font-medium text-text-muted">Unit.</th>
                  <th className="text-right py-2 text-sm font-medium text-text-muted">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const qtyRaw = it?.quantity ?? it?.Quantity;
                  const qtyDisplay =
                    qtyRaw != null && qtyRaw !== '' && !Number.isNaN(Number(qtyRaw)) ? Number(qtyRaw) : '—';
                  return (
                    <tr
                      key={String((it?.id ?? it?.Id) || '') + String(i)}
                      className="border-b border-surface-border/50"
                    >
                      <td className="py-2 text-sm">{String((it?.description ?? it?.Description) || '—')}</td>
                      <td className="py-2 text-sm text-right">{qtyDisplay}</td>
                      <td className="py-2 text-sm text-right">
                        {formatCurrency(Number((it?.unitPrice ?? it?.UnitPrice) || 0))}
                      </td>
                      <td className="py-2 text-sm font-medium text-right">
                        {formatCurrency(Number((it?.totalPrice ?? it?.TotalPrice) || 0))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modais */}
      <Modal
        open={approveOpen}
        onClose={() => {
          if (!busy) setApproveOpen(false);
        }}
        title="Aprovar despesa"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setApproveOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              loading={busy}
              onClick={() => void onApprove()}
            >
              Confirmar aprovação
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Confirma a aprovação desta despesa para o condomínio? Esta ação fica registada na trilha de
          auditoria.
        </p>
      </Modal>

      <Modal
        open={reasonOpen === 'reject'}
        onClose={() => {
          if (!busy) {
            setReasonOpen(null);
            setReasonText('');
            setReasonError(null);
          }
        }}
        title="Rejeitar despesa"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setReasonOpen(null);
                setReasonText('');
                setReasonError(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" form="reject-expense-form" variant="primary" disabled={busy} loading={busy}>
              Confirmar rejeição
            </Button>
          </>
        }
      >
        <form id="reject-expense-form" onSubmit={(e) => void submitReject(e)}>
          <textarea
            rows={4}
            value={reasonText}
            onChange={(e) => {
              setReasonText(e.target.value);
              if (reasonError) setReasonError(null);
            }}
            placeholder="Descreva o motivo da rejeição (auditoria)."
            className="w-full px-3 py-2 text-sm rounded-lg border border-surface-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-brand-primary"
            aria-invalid={!!reasonError}
          />
          {reasonError && (
            <p className="mt-2 text-sm text-status-error" role="alert">
              {reasonError}
            </p>
          )}
        </form>
      </Modal>

      <Modal
        open={reasonOpen === 'cancel'}
        onClose={() => {
          if (!busy) {
            setReasonOpen(null);
            setReasonText('');
            setReasonError(null);
          }
        }}
        title="Cancelar despesa"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setReasonOpen(null);
                setReasonText('');
                setReasonError(null);
              }}
            >
              Voltar
            </Button>
            <Button type="submit" form="cancel-expense-form" variant="primary" disabled={busy} loading={busy}>
              Confirmar cancelamento
            </Button>
          </>
        }
      >
        <form id="cancel-expense-form" onSubmit={(e) => void submitCancel(e)}>
          <textarea
            rows={4}
            value={reasonText}
            onChange={(e) => {
              setReasonText(e.target.value);
              if (reasonError) setReasonError(null);
            }}
            placeholder="Descreva o motivo do cancelamento (auditoria)."
            className="w-full px-3 py-2 text-sm rounded-lg border border-surface-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-brand-primary"
            aria-invalid={!!reasonError}
          />
          {reasonError && (
            <p className="mt-2 text-sm text-status-error" role="alert">
              {reasonError}
            </p>
          )}
        </form>
      </Modal>

      <Modal
        open={paymentOpen}
        onClose={() => {
          if (!busy) setPaymentOpen(false);
        }}
        title="Registar pagamento"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setPaymentOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              loading={busy}
              onClick={() => void submitPayment()}
            >
              Registar pagamento
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="pay-amount" className="block text-sm font-medium text-text-main mb-1">
              Valor (R$)
            </label>
            <input
              id="pay-amount"
              type="text"
              inputMode="numeric"
              value={payAmount}
              onChange={(e) => setPayAmount(formatBrlInput(e.target.value))}
              placeholder="0,00"
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <div>
            <label htmlFor="pay-date" className="block text-sm font-medium text-text-main mb-1">
              Data e hora
            </label>
            <input
              id="pay-date"
              type="datetime-local"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <div>
            <label htmlFor="pay-method" className="block text-sm font-medium text-text-main mb-1">
              Forma de pagamento
            </label>
            <select
              id="pay-method"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              {PAYMENT_METHOD_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pay-ref" className="block text-sm font-medium text-text-main mb-1">
              Referência (opcional)
            </label>
            <input
              id="pay-ref"
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="Código ou comprovante"
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!refundPid}
        onClose={() => {
          if (!busy) {
            setRefundPid(null);
            setRefundReason('');
            setRefundError(null);
          }
        }}
        title="Estornar pagamento"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setRefundPid(null);
                setRefundReason('');
                setRefundError(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" form="refund-payment-form" variant="primary" disabled={busy} loading={busy}>
              Confirmar estorno
            </Button>
          </>
        }
      >
        <form id="refund-payment-form" onSubmit={(e) => void submitRefund(e)}>
          <p className="text-sm text-text-muted font-mono mb-3">{refundPid}</p>
          <textarea
            rows={3}
            value={refundReason}
            onChange={(e) => {
              setRefundReason(e.target.value);
              if (refundError) setRefundError(null);
            }}
            placeholder="Motivo do estorno"
            className="w-full px-3 py-2 text-sm rounded-lg border border-surface-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-brand-primary"
            aria-invalid={!!refundError}
          />
          {refundError && (
            <p className="mt-2 text-sm text-status-error" role="alert">
              {refundError}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default ExpenseOperationalDetailPage;
