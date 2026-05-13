import React, { useEffect, useMemo, useState } from 'react';
import { normalizeListPayload } from '../lib/api-normalize';
import { formatApiError } from '../lib/api-error-message';
import { EcondomizaApi } from '../services/api';

/** Despesas (notas / compras) — alinhado ao processing: `GET /api/expenses`. */
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

function str(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && v !== '') return String(v);
  }
  return '—';
}

function money(row: Record<string, unknown>): string {
  const n = Number(row.totalAmount ?? row.TotalAmount);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function datePt(row: Record<string, unknown>): string {
  const s = str(row, 'issueDate', 'IssueDate');
  if (s === '—') return '—';
  try {
    return new Date(s).toLocaleDateString('pt-BR');
  } catch {
    return s;
  }
}

const ComprasPage: React.FC = () => {
  const [raw, setRaw] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await EcondomizaApi.listExpenses({ page: 1, pageSize: 100 });
        setRaw(res.data);
        setError(null);
      } catch (e) {
        console.error(e);
        setError(formatApiError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rows = useMemo(() => extractExpenseRows(raw), [raw]);

  if (loading) {
    return (
      <div className="page" id="compras-page">
        <p>A carregar…</p>
      </div>
    );
  }

  return (
    <div className="page" id="compras-page">
      <div className="page-header">
        <h1>Compras</h1>
        <p>
          Registos de despesa e compras via <code>GET /api/expenses</code> (processing: despesas, aprovação, pagamentos).
        </p>
      </div>
      {error && <p className="form-error" style={{ color: 'crimson' }}>{error}</p>}

      {!error && rows.length === 0 && (
        <div className="card">
          <p>Nenhuma despesa encontrada para o período pedido.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Despesas ({rows.length})</h2>
          </div>
          <div className="purchases-table" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Emissão</th>
                  <th>Estado</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={str(row, 'id', 'Id') + String(i)}>
                    <td>{str(row, 'description', 'Description')}</td>
                    <td>{str(row, 'category', 'Category')}</td>
                    <td>{datePt(row)}</td>
                    <td>{str(row, 'status', 'Status')}</td>
                    <td>{money(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {import.meta.env.DEV && raw != null && (
        <details style={{ marginTop: 16 }} className="card">
          <summary style={{ cursor: 'pointer', padding: '0.5rem 0' }}>Payload bruto (apenas desenvolvimento)</summary>
          <pre
            style={{
              padding: 16,
              overflow: 'auto',
              fontSize: 12,
              background: '#0f172a',
              color: '#e2e8f0',
              borderRadius: 8,
              marginTop: 8,
            }}
          >
            {JSON.stringify(raw, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default ComprasPage;
