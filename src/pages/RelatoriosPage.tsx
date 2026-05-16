import React, { useEffect, useState } from 'react';
import { formatApiError } from '../lib/api-error-message';
import { EcondomizaApi } from '../services';
import { PageHeader } from '../components/layout/PageHeader';
import { TableScrollHint } from '../components/layout/TableScrollHint';

function formatYoyCell(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number' && Number.isFinite(v)) {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v);
  }
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return 'dados agrupados';
  return String(v);
}

type YearOverYearItem = {
  year: number;
  month: number;
  totalAmount: number;
};

type ReportPeriod = 'monthly' | 'quarterly' | 'annual';

function numberField(row: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const n = Number(row[key]);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function extractYearOverYearRows(data: unknown): YearOverYearItem[] {
  if (Array.isArray(data)) {
    return data
      .filter((x) => x != null && typeof x === 'object')
      .map((row) => {
        const r = row as Record<string, unknown>;
        return {
          year: numberField(r, 'year', 'Year'),
          month: numberField(r, 'month', 'Month'),
          totalAmount: numberField(r, 'totalAmount', 'TotalAmount'),
        };
      })
      .filter((row) => row.year > 0 && row.month > 0);
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
      return extractYearOverYearRows(nestedArr[1]);
    }
  }

  return [];
}

/** Visualização defensiva de /api/dashboard/year-over-year, sem expor nomes internos do payload. */
function YearOverYearView({ data }: { data: unknown }) {
  const rows = extractYearOverYearRows(data);

  if (rows.length === 0) {
    return <p className="form-help">Sem dados suficientes para comparar totais entre anos.</p>;
  }

  return (
    <>
      <TableScrollHint />
      <div className="audits-table table-scroll">
        <table>
          <thead>
            <tr>
              <th>Ano</th>
              <th>Mês</th>
              <th>Total processado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.year}-${row.month}`}>
                <td>{row.year}</td>
                <td>{String(row.month).padStart(2, '0')}</td>
                <td>{formatYoyCell(row.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const RelatoriosPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [yoy, setYoy] = useState<unknown>(null);
  const [activeTab, setActiveTab] = useState<'resumo' | 'yoy'>('resumo');
  const [downloading, setDownloading] = useState<ReportPeriod | null>(null);

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

  const downloadReport = async (period: ReportPeriod) => {
    setDownloading(period);
    setError(null);
    try {
      const now = new Date();
      const params =
        period === 'monthly'
          ? { year: now.getFullYear(), month: now.getMonth() + 1 }
          : period === 'quarterly'
            ? { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) + 1 }
            : { year: now.getFullYear() };
      const result = await EcondomizaApi.downloadReport(period, params);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="page page-state" id="relatorios-page">
        <p>Carregando relatórios…</p>
        <div className="skeleton-card" style={{ width: '100%', maxWidth: 560 }}>
          <div className="skeleton-block" style={{ width: '55%' }} />
          <div className="skeleton-block" style={{ width: '100%' }} />
          <div className="skeleton-block" style={{ width: '72%' }} />
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="page page-state page-state--error" id="relatorios-page">
        <p>{error}</p>
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  const gastoProcessado = Number(summary?.gastoProcessado ?? 0);
  const valorEmAberto = Number(summary?.valorEmAberto ?? 0);

  return (
    <div className="page" id="relatorios-page">
      <PageHeader
        title="Relatórios"
        description="Indicadores consolidados e exportação em PDF do período atual, para o seu condomínio."
        quickLinks={[{ to: '/dashboard', label: 'Painel' }]}
      />

      {error && summary && <div className="banner banner--error">{error}</div>}

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
              <h3>Gasto processado</h3>
            </div>
            <div className="metric-value">{formatCurrency(gastoProcessado)}</div>
            <p className="form-help" style={{ margin: 0 }}>
              Em aberto: {formatCurrency(valorEmAberto)}
            </p>
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
              <h3>Fornecedores cadastrados</h3>
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
              Totais mensais consolidados para comparar o mesmo mês em anos diferentes.
            </p>
          </div>
          <YearOverYearView data={yoy} />
        </div>
      )}

      <div className="card mt-section">
        <div className="card-header">
          <h2>Relatórios em PDF</h2>
        </div>
        <p>
          Gere arquivos PDF para arquivo ou reuniões do condomínio. O conteúdo considera o período indicado e as
          despesas vinculadas ao seu acesso atual.
        </p>
        <div className="report-download-row">
          <button
            type="button"
            className="btn-secondary"
            disabled={downloading !== null}
            onClick={() => void downloadReport('monthly')}
          >
            {downloading === 'monthly' ? 'Gerando PDF…' : 'Baixar mensal (PDF)'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={downloading !== null}
            onClick={() => void downloadReport('quarterly')}
          >
            {downloading === 'quarterly' ? 'Gerando PDF…' : 'Baixar trimestral (PDF)'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={downloading !== null}
            onClick={() => void downloadReport('annual')}
          >
            {downloading === 'annual' ? 'Gerando PDF…' : 'Baixar anual (PDF)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RelatoriosPage;
