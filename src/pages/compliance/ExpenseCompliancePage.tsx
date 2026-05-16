import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatApiError } from '../../lib/api-error-message';
import { formatDateTimePtBr } from '../../lib/format-date-pt-br';
import { EcondomizaApi } from '../../services';
import { PageHeader } from '../../components/layout/PageHeader';

function pickStr(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (v != null && v !== '') return String(v);
  }
  return '';
}

function pickNum(o: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = o[k];
    if (v == null) continue;
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseEvidenceIds(json: string | null | undefined): string[] {
  if (!json || !json.trim()) return [];
  try {
    const v = JSON.parse(json) as unknown;
    if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  } catch {
    /* ignore */
  }
  return [];
}

const ExpenseCompliancePage: React.FC = () => {
  const { expenseId = '' } = useParams<{ expenseId: string }>();
  const navigate = useNavigate();
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, string>>({});
  const [waiveDrafts, setWaiveDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!expenseId) return;
    try {
      const res = await EcondomizaApi.getExpenseCompliance(expenseId);
      const d = res.data && typeof res.data === 'object' ? (res.data as Record<string, unknown>) : null;
      setRaw(d);
      setError(null);
      if (d) {
        const findings = Array.isArray(d.findings) ? d.findings : Array.isArray(d.Findings) ? d.Findings : [];
        const nextE: Record<string, string> = {};
        for (const f of findings) {
          if (!f || typeof f !== 'object') continue;
          const row = f as Record<string, unknown>;
          const id = pickStr(row, 'id', 'Id');
          const ej = pickStr(row, 'evidenceDocumentIdsJson', 'EvidenceDocumentIdsJson');
          if (id) nextE[id] = parseEvidenceIds(ej).join(', ');
        }
        setEvidenceDrafts((prev) => ({ ...nextE, ...prev }));
      }
    } catch (e) {
      setError(formatApiError(e));
      setRaw(null);
    }
  }, [expenseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const findings = useMemo(() => {
    if (!raw) return [];
    const f = raw.findings ?? raw.Findings;
    if (!Array.isArray(f)) return [];
    return f.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
  }, [raw]);

  const score = pickNum(raw ?? {}, 'complianceScore', 'ComplianceScore');
  const outstanding = pickNum(raw ?? {}, 'outstandingCount', 'OutstandingCount');
  const clear = pickNum(raw ?? {}, 'clearCount', 'ClearCount');
  const waived = pickNum(raw ?? {}, 'waivedCount', 'WaivedCount');
  const highOpen = pickNum(raw ?? {}, 'highRiskOpenCount', 'HighRiskOpenCount');

  const onReevaluate = async () => {
    if (!expenseId) return;
    setBusy(true);
    try {
      const res = await EcondomizaApi.reevaluateExpenseCompliance(expenseId);
      const d = res.data && typeof res.data === 'object' ? (res.data as Record<string, unknown>) : null;
      setRaw(d);
      setError(null);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const parseIdList = (s: string): string[] =>
    s
      .split(/[\s,;]+/)
      .map((x) => x.trim())
      .filter(Boolean);

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const onSaveEvidence = async (findingId: string) => {
    if (!expenseId) return;
    const rawIds = parseIdList(evidenceDrafts[findingId] ?? '');
    const guids: string[] = [];
    for (const id of rawIds) {
      if (uuidRe.test(id)) {
        guids.push(id);
      } else {
        setError(`Identificador de documento inválido: "${id}". Use um GUID por linha ou separados por vírgula (ex.: 3fa85f64-5717-4562-b3fc-2c963f66afa6).`);
        return;
      }
    }
    setBusy(true);
    try {
      await EcondomizaApi.setExpenseComplianceEvidence(expenseId, findingId, guids);
      setError(null);
      await load();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const onAddComment = async (findingId: string) => {
    const body = (commentDrafts[findingId] ?? '').trim();
    if (!body || !expenseId) return;
    setBusy(true);
    try {
      await EcondomizaApi.addExpenseComplianceComment(expenseId, findingId, body);
      setCommentDrafts((p) => ({ ...p, [findingId]: '' }));
      await load();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const onWaive = async (findingId: string) => {
    const reason = (waiveDrafts[findingId] ?? '').trim();
    if (!reason || !expenseId) return;
    setBusy(true);
    try {
      await EcondomizaApi.waiveExpenseComplianceFinding(expenseId, findingId, reason);
      setWaiveDrafts((p) => ({ ...p, [findingId]: '' }));
      await load();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
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

  return (
    <div id="expense-compliance">
      <PageHeader
        eyebrow="Documentação desta compra"
        title="Pendências e validações da despesa"
        description="O que falta para esta compra ficar regularizada: anexos, comentários ao conselho e registo de excepções quando aplicável."
        layout="stack"
        quickLinks={[
          { to: `/compras/${encodeURIComponent(expenseId)}`, label: 'Voltar à despesa' },
          { to: '/conformidades', label: 'Central de obrigações' },
        ]}
      />
      {error && <div className="banner banner--error">{error}</div>}

      <div className="op-detail-toolbar">
        <button type="button" className="btn-small secondary" onClick={() => void load()} disabled={busy}>
          Atualizar
        </button>
        <button type="button" className="btn-small secondary" onClick={() => void onReevaluate()} disabled={busy}>
          Reavaliar motor
        </button>
      </div>

      <section className="card compliance-expense-summary">
        <h3 className="compliance-expense-summary__title">Indicadores desta despesa</h3>
        <dl className="op-kpi-grid">
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
          <Link to={`/compras/${encodeURIComponent(expenseId)}`}>vista operacional</Link>.
        </p>
      </section>

      {findings.map((f) => {
        const id = pickStr(f, 'id', 'Id');
        const status = pickStr(f, 'status', 'Status');
        const sev = pickStr(f, 'severity', 'Severity');
        const origin = pickStr(f, 'origin', 'Origin');
        const conf = pickNum(f, 'confidence', 'Confidence');
        const detail = pickStr(f, 'detailJson', 'DetailJson');
        const comments = Array.isArray(f.comments)
          ? f.comments
          : Array.isArray(f.Comments)
            ? f.Comments
            : [];
        const waivedReason = pickStr(f, 'waivedReason', 'WaivedReason');
        const waivedBy = pickStr(f, 'waivedByUserName', 'WaivedByUserName');
        const waivedAt = pickStr(f, 'waivedAtUtc', 'WaivedAtUtc');
        const evaluated = pickStr(f, 'evaluatedAtUtc', 'EvaluatedAtUtc');
        const created = pickStr(f, 'createdAtUtc', 'CreatedAtUtc');
        const updated = pickStr(f, 'updatedAtUtc', 'UpdatedAtUtc');

        const sevClass =
          sev === 'CRITICAL' ? 'op-badge op-badge--error' : sev === 'HIGH' ? 'op-badge op-badge--warning' : 'op-badge op-badge--neutral';

        return (
          <section key={id} className="card compliance-finding-card">
            <header className="compliance-finding-card__head">
              <div>
                <h3 className="compliance-finding-card__rule">{pickStr(f, 'ruleCode', 'RuleCode')}</h3>
                <p className="compliance-finding-card__title">{pickStr(f, 'title', 'Title')}</p>
              </div>
              <div className="op-list-badges">
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
            <p className="compliance-finding-card__desc">{pickStr(f, 'description', 'Description')}</p>
            <dl className="compliance-finding-meta">
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
                      {waivedAt && (
                        <span className="op-muted"> · {formatDateTimePtBr(waivedAt)}</span>
                      )}
                    </>
                  ) : (
                    <span className="op-muted">Definido na aprovação da despesa; override regista actor aqui.</span>
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

            <div className="compliance-finding-block">
              <h4>Evidências (IDs de documento)</h4>
              <p className="op-small op-muted">Informe os IDs dos documentos (GUID), separados por vírgula.</p>
              <textarea
                className="compliance-textarea"
                rows={2}
                value={evidenceDrafts[id] ?? ''}
                onChange={(e) => setEvidenceDrafts((p) => ({ ...p, [id]: e.target.value }))}
                placeholder="ex.: 3fa85f64-5717-4562-b3fc-2c963f66afa6, …"
              />
              <button type="button" className="btn-small secondary" disabled={busy} onClick={() => void onSaveEvidence(id)}>
                Salvar evidências
              </button>
            </div>

            <div className="compliance-finding-block">
              <h4>Comentários</h4>
              <ul className="compliance-comment-list">
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
                className="compliance-textarea"
                rows={2}
                value={commentDrafts[id] ?? ''}
                onChange={(e) => setCommentDrafts((p) => ({ ...p, [id]: e.target.value }))}
                placeholder="Nota operacional ou pedido de esclarecimento…"
              />
              <button type="button" className="btn-small secondary" disabled={busy} onClick={() => void onAddComment(id)}>
                Adicionar comentário
              </button>
            </div>

            {status === 'OUTSTANDING' && (
              <div className="compliance-finding-block compliance-finding-block--waive">
                <h4>Override (exceção) com justificativa</h4>
                <p className="op-small op-muted">Gera trilho de auditoria no serviço de processamento.</p>
                <textarea
                  className="compliance-textarea"
                  rows={3}
                  value={waiveDrafts[id] ?? ''}
                  onChange={(e) => setWaiveDrafts((p) => ({ ...p, [id]: e.target.value }))}
                  placeholder="Justificativa obrigatória para auditoria…"
                />
                <button type="button" className="btn-small" disabled={busy} onClick={() => void onWaive(id)}>
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
