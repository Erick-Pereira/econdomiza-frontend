import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatApiError } from '../../lib/api-error-message';
import { formatDateTimePtBr } from '../../lib/format-date-pt-br';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageFatalErrorState, PageLoadingState } from '../../components/layout/PageLoadStates';
import {
  useExpenseCompliance,
  useExpenseComplianceMutations,
} from '../../features/conformidades/hooks/useExpenseComplianceData';
import {
  buildEvidenceDrafts,
  parseDocumentIdList,
  pickNum,
  pickStr,
  UUID_RE,
} from '../../features/conformidades/lib/expense-compliance-map';

const ExpenseCompliancePage: React.FC = () => {
  const { expenseId = '' } = useParams<{ expenseId: string }>();
  const navigate = useNavigate();
  const {
    raw,
    findings,
    isInitialLoading,
    errorMessage: queryError,
    refetch,
  } = useExpenseCompliance(expenseId);
  const { reevaluate, saveEvidence, addComment, waiveFinding, isMutating } =
    useExpenseComplianceMutations(expenseId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, string>>({});
  const [waiveDrafts, setWaiveDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (findings.length > 0) {
      setEvidenceDrafts((prev) => ({ ...buildEvidenceDrafts(findings), ...prev }));
    }
  }, [findings]);

  const error = actionError ?? queryError;

  const score = pickNum(raw ?? {}, 'complianceScore', 'ComplianceScore');
  const outstanding = pickNum(raw ?? {}, 'outstandingCount', 'OutstandingCount');
  const clear = pickNum(raw ?? {}, 'clearCount', 'ClearCount');
  const waived = pickNum(raw ?? {}, 'waivedCount', 'WaivedCount');
  const highOpen = pickNum(raw ?? {}, 'highRiskOpenCount', 'HighRiskOpenCount');

  const onReevaluate = async () => {
    setActionError(null);
    try {
      await reevaluate.mutateAsync();
    } catch (e) {
      setActionError(formatApiError(e));
    }
  };

  const onSaveEvidence = async (findingId: string) => {
    const rawIds = parseDocumentIdList(evidenceDrafts[findingId] ?? '');
    const guids: string[] = [];
    for (const id of rawIds) {
      if (UUID_RE.test(id)) {
        guids.push(id);
      } else {
        setActionError(
          `Identificador de documento inválido: "${id}". Use um GUID por linha ou separados por vírgula (ex.: 3fa85f64-5717-4562-b3fc-2c963f66afa6).`
        );
        return;
      }
    }
    setActionError(null);
    try {
      await saveEvidence.mutateAsync({ findingId, documentIds: guids });
    } catch (e) {
      setActionError(formatApiError(e));
    }
  };

  const onAddComment = async (findingId: string) => {
    const body = (commentDrafts[findingId] ?? '').trim();
    if (!body) return;
    setActionError(null);
    try {
      await addComment.mutateAsync({ findingId, body });
      setCommentDrafts((p) => ({ ...p, [findingId]: '' }));
    } catch (e) {
      setActionError(formatApiError(e));
    }
  };

  const onWaive = async (findingId: string) => {
    const reason = (waiveDrafts[findingId] ?? '').trim();
    if (!reason) return;
    setActionError(null);
    try {
      await waiveFinding.mutateAsync({ findingId, reason });
      setWaiveDrafts((p) => ({ ...p, [findingId]: '' }));
    } catch (e) {
      setActionError(formatApiError(e));
    }
  };

  if (!expenseId) {
    return (
      <div className="card">
        <p>Identificador da despesa em falta.</p>
        <button type="button" className="btn-small secondary" onClick={() => navigate('/conformidades')}>
          Voltar
        </button>
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <PageLoadingState
        id="expense-compliance"
        message="Carregando conformidade da despesa…"
        skeletonMaxWidth={640}
      />
    );
  }

  if (queryError && !raw) {
    return (
      <PageFatalErrorState id="expense-compliance" message={queryError} onRetry={() => void refetch()} />
    );
  }

  return (
    <div id="expense-compliance" className="w-full max-w-full min-w-0 space-y-6 overflow-x-hidden">
      <PageHeader
        eyebrow="Conformidade da despesa"
        title="Achados e validações"
        description="Pendências de auditoria nesta despesa: evidências, comentários ao conselho e dispensa fundamentada quando aplicável."
        layout="stack"
        quickLinks={[
          { to: `/compras/${encodeURIComponent(expenseId)}`, label: 'Voltar à despesa' },
          { to: '/conformidades', label: 'Central de obrigações' },
        ]}
      />
      {error && <div className="banner banner--error">{error}</div>}

      <div className="op-detail-toolbar flex flex-col gap-3 rounded-xl border border-surface-border bg-surface-card p-4 shadow-macro-sm sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className="btn-small secondary"
          onClick={() => void refetch()}
          disabled={isMutating}
        >
          Atualizar
        </button>
        <button
          type="button"
          className="btn-small secondary"
          onClick={() => void onReevaluate()}
          disabled={isMutating}
        >
          Reavaliar motor
        </button>
      </div>

      <section className="card compliance-expense-summary rounded-xl border border-surface-border bg-surface-card p-4 shadow-macro-sm">
        <h3 className="compliance-expense-summary__title">Indicadores desta despesa</h3>
        <dl className="op-kpi-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div>
            <dt>Score</dt>
            <dd>{score != null ? score : '—'}</dd>
          </div>
          <div>
            <dt>Pendentes</dt>
            <dd>{outstanding != null ? outstanding : '—'}</dd>
          </div>
          <div>
            <dt>Conformes</dt>
            <dd>{clear != null ? clear : '—'}</dd>
          </div>
          <div>
            <dt>Exceções (waived)</dt>
            <dd>{waived != null ? waived : '—'}</dd>
          </div>
          <div>
            <dt>Risco alto aberto</dt>
            <dd>{highOpen != null ? highOpen : '—'}</dd>
          </div>
        </dl>
        <p className="op-muted op-small">
          SLA de aprovação e pipeline técnico continuam visíveis na{' '}
          <Link to={`/compras/${encodeURIComponent(expenseId)}`}>detalhe da despesa</Link>.
        </p>
      </section>

      {findings.map((f) => {
        const id = pickStr(f, 'id', 'Id');
        const status = pickStr(f, 'status', 'Status');
        const sev = pickStr(f, 'severity', 'Severity');
        const origin = pickStr(f, 'origin', 'Origin');
        const conf = pickNum(f, 'confidence', 'Confidence');
        const detail = pickStr(f, 'detailJson', 'DetailJson');
        const comments = Array.isArray(f.comments) ? f.comments : Array.isArray(f.Comments) ? f.Comments : [];
        const waivedReason = pickStr(f, 'waivedReason', 'WaivedReason');
        const waivedBy = pickStr(f, 'waivedByUserName', 'WaivedByUserName');
        const waivedAt = pickStr(f, 'waivedAtUtc', 'WaivedAtUtc');
        const evaluated = pickStr(f, 'evaluatedAtUtc', 'EvaluatedAtUtc');
        const created = pickStr(f, 'createdAtUtc', 'CreatedAtUtc');
        const updated = pickStr(f, 'updatedAtUtc', 'UpdatedAtUtc');

        const sevClass =
          sev === 'CRITICAL'
            ? 'op-badge op-badge--error'
            : sev === 'HIGH'
              ? 'op-badge op-badge--warning'
              : 'op-badge op-badge--neutral';

        return (
          <section key={id} className="card compliance-finding-card">
            <header className="compliance-finding-card__head">
              <div>
                <h3 className="compliance-finding-card__rule">{pickStr(f, 'ruleCode', 'RuleCode')}</h3>
                <p className="compliance-finding-card__title">{pickStr(f, 'title', 'Title')}</p>
              </div>
              <div className="op-list-badges flex flex-wrap gap-2">
                <span className={badgeForStatus(status)}>{status}</span>
                <span className={sevClass}>{sev}</span>
                <span className="op-badge op-badge--info">{origin}</span>
                {conf != null && (
                  <span className="op-badge op-badge--neutral" title="Confiança associada ao achado">
                    Conf.: {(conf <= 1 ? conf * 100 : conf).toFixed(0)}
                    {conf <= 1 ? '%' : ''}
                  </span>
                )}
              </div>
            </header>
            <p className="compliance-finding-card__desc text-sm leading-6 text-text-muted">
              {pickStr(f, 'description', 'Description')}
            </p>
            <dl className="compliance-finding-meta grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt>Avaliado (UTC)</dt>
                <dd>{evaluated ? formatDateTimePtBr(evaluated) : '—'}</dd>
              </div>
              <div>
                <dt>Criado / atualizado</dt>
                <dd>
                  {created ? formatDateTimePtBr(created) : '—'} ·{' '}
                  {updated ? formatDateTimePtBr(updated) : '—'}
                </dd>
              </div>
              <div>
                <dt>Responsável (override)</dt>
                <dd>
                  {status === 'WAIVED' ? (
                    <>
                      {waivedBy || '—'}
                      {waivedAt && <span className="op-muted"> · {formatDateTimePtBr(waivedAt)}</span>}
                    </>
                  ) : (
                    <span className="op-muted">
                      Definido na aprovação da despesa; override regista actor aqui.
                    </span>
                  )}
                </dd>
              </div>
            </dl>
            {waivedReason && (
              <div className="banner banner--warning compliance-finding-waive">
                <strong>Justificativa de exceção</strong>
                <p>{waivedReason}</p>
              </div>
            )}
            {detail && (
              <details className="compliance-finding-detail">
                <summary>Detalhe técnico (JSON)</summary>
                <pre>{detail}</pre>
              </details>
            )}

            <div className="compliance-finding-block space-y-3 rounded-2xl border border-surface-border bg-surface-muted/60 p-4">
              <h4>Evidências (IDs de documento)</h4>
              <p className="op-small op-muted">
                Informe os IDs dos documentos (GUID), separados por vírgula.
              </p>
              <textarea
                className="compliance-textarea min-h-[96px] w-full min-w-0 rounded-lg border border-surface-border bg-surface-background px-3 py-2 text-sm text-text-main shadow-atomic"
                rows={2}
                value={evidenceDrafts[id] ?? ''}
                onChange={(e) => setEvidenceDrafts((p) => ({ ...p, [id]: e.target.value }))}
                placeholder="ex.: 3fa85f64-5717-4562-b3fc-2c963f66afa6, …"
              />
              <button
                type="button"
                className="btn-small secondary"
                disabled={isMutating}
                onClick={() => void onSaveEvidence(id)}
              >
                Salvar evidências
              </button>
            </div>

            <div className="compliance-finding-block space-y-3 rounded-2xl border border-surface-border bg-surface-muted/60 p-4">
              <h4>Comentários</h4>
              <ul className="compliance-comment-list space-y-4">
                {comments.map((c) => {
                  if (!c || typeof c !== 'object') return null;
                  const row = c as Record<string, unknown>;
                  const cid = pickStr(row, 'id', 'Id');
                  const body = pickStr(row, 'body', 'Body');
                  const author = pickStr(row, 'authorUserName', 'AuthorUserName');
                  const at = pickStr(row, 'createdAtUtc', 'CreatedAtUtc');
                  return (
                    <li key={cid}>
                      <span className="op-muted op-small">
                        {author || 'Usuário'} · {at ? formatDateTimePtBr(at) : ''}
                      </span>
                      <p>{body}</p>
                    </li>
                  );
                })}
              </ul>
              <textarea
                className="compliance-textarea min-h-[96px] w-full min-w-0 rounded-lg border border-surface-border bg-surface-background px-3 py-2 text-sm text-text-main shadow-atomic"
                rows={2}
                value={commentDrafts[id] ?? ''}
                onChange={(e) => setCommentDrafts((p) => ({ ...p, [id]: e.target.value }))}
                placeholder="Nota de fiscalização ou pedido de esclarecimento…"
              />
              <button
                type="button"
                className="btn-small secondary"
                disabled={isMutating}
                onClick={() => void onAddComment(id)}
              >
                Adicionar comentário
              </button>
            </div>

            {status === 'OUTSTANDING' && (
              <div className="compliance-finding-block compliance-finding-block--waive space-y-3 rounded-2xl border border-status-warning/30 bg-status-warning/10 p-4">
                <h4>Override (exceção) com justificativa</h4>
                <p className="op-small op-muted">Gera trilho de auditoria no serviço de processamento.</p>
                <textarea
                  className="compliance-textarea min-h-[120px] w-full min-w-0 rounded-lg border border-surface-border bg-surface-background px-3 py-2 text-sm text-text-main shadow-atomic"
                  rows={3}
                  onChange={(e) => setWaiveDrafts((p) => ({ ...p, [id]: e.target.value }))}
                  placeholder="Justificativa obrigatória para auditoria…"
                />
                <button
                  type="button"
                  className="btn-small"
                  disabled={isMutating}
                  onClick={() => void onWaive(id)}
                >
                  Registar exceção
                </button>
              </div>
            )}
          </section>
        );
      })}

      {findings.length === 0 && !error && (
        <p className="op-muted">Sem achados. Use &quot;Reavaliar motor&quot; após processar a despesa.</p>
      )}
    </div>
  );
};

function badgeForStatus(status: string): string {
  if (status === 'OUTSTANDING') return 'op-badge op-badge--warning';
  if (status === 'WAIVED') return 'op-badge op-badge--info';
  if (status === 'CLEAR') return 'op-badge op-badge--progress';
  return 'op-badge op-badge--neutral';
}

export default ExpenseCompliancePage;
