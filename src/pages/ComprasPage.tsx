import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizeListPayload } from '../lib/api-normalize';
import { formatApiError } from '../lib/api-error-message';
import { EcondomizaApi } from '../services';
import { PageHeader } from '../components/layout/PageHeader';
import { PageFatalErrorState, PageLoadingState } from '../components/layout/PageLoadStates';
import { TableScrollHint } from '../components/layout/TableScrollHint';
import {
  PROCESSING_STATUS_FILTER_OPTIONS,
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

/** Despesas (notas / compras) — lista operacional alinhada ao serviço de processamento. */
function extractExpenseRows(raw: unknown): Record<string, unknown>[] {
  const direct = normalizeListPayload(raw);
  if (direct.length > 0) {
    return direct.filter((r) => r != null && typeof r === 'object') as Record<string, unknown>[];
  }
  if (raw && typeof raw === 'object') {
    for (const v of Object.values(raw as Record<string, unknown>)) {
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
        return v as Record<string, unknown>[];
      }
    }
  }
  return [];
}

function money(row: Record<string, unknown>): string {
  const n = Number(row.totalAmount ?? row.TotalAmount);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function datePt(row: Record<string, unknown>): string {
  const s = pickStr(row, 'issueDate', 'IssueDate');
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('pt-BR');
  } catch {
    return s;
  }
}

function badgeClass(tone: string): string {
  return `op-badge op-badge--${tone}`;
}

const ComprasPage: React.FC = () => {
  const [raw, setRaw] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingFilter, setProcessingFilter] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const filters: Record<string, unknown> = { page: 1, pageSize: 100 };
      if (processingFilter) filters.processingStatus = processingFilter;
      const res = await EcondomizaApi.listExpenses(filters);
      setRaw(res.data);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [processingFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => extractExpenseRows(raw), [raw]);
  const meta = useMemo(() => {
    const o = asRecord(raw);
    if (!o) return { total: rows.length };
    const t = pickNum(o, 'total', 'Total');
    return { total: t ?? rows.length };
  }, [raw, rows.length]);

  if (loading) {
    return <PageLoadingState id="compras-page" message="Carregando despesas…" />;
  }

  if (error && rows.length === 0) {
    return <PageFatalErrorState id="compras-page" message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="page" id="compras-page">
      <PageHeader
        title="Compras"
        description="Lista operacional: pipeline técnica, aprovação, liquidação e confiança do enriquecimento. Abra o detalhe para a linha temporal e ações."
        quickLinks={[
          { to: '/auditoria', label: 'Auditoria e upload' },
          { to: '/fornecedores', label: 'Fornecedores' },
          { to: '/conformidades', label: 'Obrigações' },
        ]}
      />
      {error && <div className="banner banner--error">{error}</div>}

      <div className="card op-list-filters">
        <label className="op-field op-field--inline">
          <span>Filtrar por pipeline</span>
          <select value={processingFilter} onChange={(e) => setProcessingFilter(e.target.value)}>
            {PROCESSING_STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn-small secondary" onClick={() => void load()}>
          Aplicar / atualizar
        </button>
        <span className="op-muted op-small">
          {meta.total != null && `Total reportado: ${meta.total}`}
        </span>
      </div>

      {!error && rows.length === 0 && (
        <div className="card">
          <p>Nenhuma despesa encontrada para o filtro pedido.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Despesas ({rows.length})</h2>
          </div>
          <TableScrollHint />
          <div className="purchases-table table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Emissão</th>
                  <th>Operação</th>
                  <th>Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const id = pickStr(row, 'id', 'Id');
                  const proc = pickStr(row, 'processingStatus', 'ProcessingStatus');
                  const appr = pickStr(row, 'approvalStatus', 'ApprovalStatus');
                  const sett = pickStr(row, 'settlementStatus', 'SettlementStatus');
                  const conf = pickNum(row, 'confidenceScore', 'ConfidenceScore');
                  const lowConf = pickBool(row, 'lowConfidence', 'LowConfidence');
                  const fail = pickStr(row, 'processingFailureReason', 'ProcessingFailureReason');
                  return (
                    <tr key={id + String(i)}>
                      <td>{pickStr(row, 'description', 'Description')}</td>
                      <td>{pickStr(row, 'category', 'Category')}</td>
                      <td>{datePt(row)}</td>
                      <td>
                        <div className="op-list-badges">
                          <span className={badgeClass(processingStatusTone(proc))} title="Pipeline técnica">
                            {humanizeProcessingPt(proc)}
                          </span>
                          <span className={badgeClass(approvalStatusTone(appr))} title="Aprovação">
                            {humanizeApprovalPt(appr)}
                          </span>
                          <span className={badgeClass(settlementStatusTone(sett))} title="Liquidação">
                            {humanizeSettlementPt(sett)}
                          </span>
                          <span className={badgeClass(confidenceTone(conf, lowConf))} title="Confiança (0–1)">
                            {formatConfidencePercent(conf)}
                            {lowConf ? ' ⚠' : ''}
                          </span>
                          {fail && (
                            <span className="op-badge op-badge--danger" title={fail}>
                              Falha
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{money(row)}</td>
                      <td>
                        {id ? (
                          <Link className="btn-small secondary" to={`/compras/${id}`}>
                            Detalhe
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprasPage;
