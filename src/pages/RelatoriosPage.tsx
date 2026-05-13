import React, { useEffect, useState } from 'react';
import { formatApiError } from '../lib/api-error-message';
import { EcondomizaApi } from '../services/api';

function formatYoyCell(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number' && Number.isFinite(v)) {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v);
  }
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** Visualização defensiva de /api/dashboard/year-over-year (estruturas variáveis). */
function YearOverYearView({ data }: { data: unknown }) {
  if (data == null) {
    return <p className="form-help">Sem dados de comparação.</p>;
  }
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <p>Nenhum período devolvido.</p>;
    }
    const rows = data.filter((x) => x != null && typeof x === 'object') as Record<string, unknown>[];
    const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].slice(0, 14);
    return (
      <div className="audits-table" style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              {keys.map((k) => (
                <th key={k}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {keys.map((k) => (
                  <td key={k}>{formatYoyCell(row[k])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const nestedArr = Object.entries(o).find(
      ([, v]) =>
        Array.isArray(v) &&
        v.length > 0 &&
        typeof (v as unknown[])[0] === 'object' &&
        (v as unknown[])[0] !== null
    );
    if (nestedArr) {
      return <YearOverYearView data={nestedArr[1]} />;
    }
    const scalars = Object.entries(o).filter(
      ([, v]) => v != null && ['number', 'string', 'boolean'].includes(typeof v)
    );
    if (scalars.length > 0) {
      return (
        <div className="metrics-grid">
          {scalars.map(([k, v]) => (
            <div key={k} className="metric-card">
              <div className="metric-header">
                <h3>{k}</h3>
              </div>
              <div className="metric-value">{formatYoyCell(v)}</div>
            </div>
          ))}
        </div>
      );
    }
    return <p className="form-help">Estrutura aninhada não reconhecida; use o bloco de desenvolvimento para inspecionar.</p>;
  }
  return <p>{String(data)}</p>;
}

const RelatoriosPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [yoy, setYoy] = useState<unknown>(null);
  const [activeTab, setActiveTab] = useState<'resumo' | 'yoy'>('resumo');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [s, y] = await Promise.all([EcondomizaApi.dashboardSummary(), EcondomizaApi.getYearOverYear(2)]);
        setSummary((s.data as Record<string, unknown>) ?? null);
        setYoy(y.data ?? null);
        setError(null);
      } catch (e) {
        console.error(e);
        setError(formatApiError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  if (loading) {
    return (
      <div className="relatorios-loading">
        <p>A carregar…</p>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="relatorios-error">
        <p>{error}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  const econ = Number(summary?.economiaIdentificada ?? 0);

  return (
    <div className="page" id="relatorios-page">
      <div className="page-header">
        <h1>Relatórios</h1>
        <p>Indicadores agregados a partir do gateway (dados reais quando o backend estiver disponível)</p>
      </div>

      <div className="tabs">
        <button type="button" className={activeTab === 'resumo' ? 'tab active' : 'tab'} onClick={() => setActiveTab('resumo')}>
          Resumo
        </button>
        <button type="button" className={activeTab === 'yoy' ? 'tab active' : 'tab'} onClick={() => setActiveTab('yoy')}>
          Ano contra ano
        </button>
      </div>

      {activeTab === 'resumo' && summary && (
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <h3>Economia identificada</h3>
            </div>
            <div className="metric-value">{formatCurrency(econ)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-header">
              <h3>Alertas ativos</h3>
            </div>
            <div className="metric-value">{String(summary.alertasAtivos ?? 0)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-header">
              <h3>Auditorias realizadas</h3>
            </div>
            <div className="metric-value">{String(summary.auditoriasRealizadas ?? 0)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-header">
              <h3>Fornecedores</h3>
            </div>
            <div className="metric-value">{String(summary.fornecedoresCadastrados ?? 0)}</div>
          </div>
        </div>
      )}

      {activeTab === 'yoy' && (
        <div className="card">
          <div className="card-header">
            <h2>Ano contra ano</h2>
            <p className="form-help" style={{ margin: 0 }}>
              Dados de <code>GET /api/dashboard/year-over-year</code>
            </p>
          </div>
          <YearOverYearView data={yoy} />
          {import.meta.env.DEV && yoy != null && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer' }}>JSON bruto (desenvolvimento)</summary>
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
                {JSON.stringify(yoy, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h2>Relatórios PDF</h2>
        </div>
        <p>
          Geração de PDF por período: <code>GET /api/reports/&lt;monthly|quarterly|yearly&gt;</code> (ver{' '}
          <code>docs/api-contracts.md</code>). O download pode ser ligado aqui quando o endpoint estiver estável no teu
          ambiente.
        </p>
      </div>
    </div>
  );
};

export default RelatoriosPage;
