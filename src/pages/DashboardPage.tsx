import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  formatAlertDatePtBr,
  mapSeverityToDashboardLevel,
  severityUpperFromAlertRow,
} from '../lib/alert-row';
import { normalizeListPayload } from '../lib/api-normalize';
import { formatApiError } from '../lib/api-error-message';
import type { DashboardKpiPayload } from '../lib/dashboard-from-monthly';
import { enrichMonthlyKpisWithActiveAlertCount } from '../lib/dashboard-kpi-merge';
import { EcondomizaApi } from '../services';
import { PageHeader } from '../components/layout/PageHeader';
import { PageFatalErrorState, PageLoadingState } from '../components/layout/PageLoadStates';

interface AlertItem {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  severity: 'high' | 'medium' | 'low';
}

const moneyBr = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

function emptyDashboardKpis(year: number): DashboardKpiPayload {
  return {
    year,
    economiaIdentificada: 0,
    gastoProcessado: 0,
    valorEmAberto: 0,
    auditoriasRealizadas: 0,
    fornecedoresCadastrados: 0,
    alertasAtivos: 0,
  };
}

/** Contrato summary (`alertasAltaPrioridade`) ou contagem na lista carregada. */
function highPriorityDisplay(kpis: DashboardKpiPayload, alerts: AlertItem[]): number {
  if (typeof kpis.alertasAltaPrioridade === 'number') return kpis.alertasAltaPrioridade;
  return alerts.filter((a) => a.severity === 'high').length;
}

const DashboardPage: React.FC = () => {
  const [kpis, setKpis] = useState<DashboardKpiPayload | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertsFetchError, setAlertsFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAlertsFetchError(null);

    const settled = await Promise.allSettled([
      EcondomizaApi.dashboardSummary(),
      EcondomizaApi.listAlerts({ pageSize: 50 }),
    ]);

    let rawRows: Record<string, unknown>[] = [];
    let alertItems: AlertItem[] = [];
    let alertsErr: string | null = null;

    if (settled[1].status === 'fulfilled') {
      const alertList = normalizeListPayload(settled[1].value.data);
      rawRows = alertList.filter((r) => r != null && typeof r === 'object') as Record<string, unknown>[];
      alertItems = rawRows.map((alert) => {
        const sev = severityUpperFromAlertRow(alert);
        const mapped = mapSeverityToDashboardLevel(sev);
        return {
          id: String(alert.id ?? ''),
          type: String(alert.type ?? 'Alerta'),
          message: String(alert.message ?? ''),
          createdAt: String(alert.createdAt ?? ''),
          severity: mapped,
        };
      });
    } else {
      const reason = settled[1].status === 'rejected' ? settled[1].reason : new Error('Unknown');
      console.error('Dashboard alerts failed:', reason);
      alertsErr = formatApiError(reason);
    }
    setAlerts(alertItems);
    setAlertsFetchError(alertsErr);

    if (settled[0].status === 'fulfilled') {
      const summaryRes = settled[0].value;
      let nextKpis = summaryRes.data;
      if (summaryRes.kpiSource === 'monthly') {
        nextKpis = enrichMonthlyKpisWithActiveAlertCount(nextKpis, rawRows);
      }
      setKpis(nextKpis);
      setError(null);
    } else {
      const reason = settled[0].status === 'rejected' ? settled[0].reason : new Error('Unknown');
      console.error('Dashboard KPIs failed:', reason);
      setError(formatApiError(reason));
      setKpis(emptyDashboardKpis(new Date().getFullYear()));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading && kpis === null) {
    return <PageLoadingState id="dashboard-page" message="Carregando indicadores…" skeletonMaxWidth={520} />;
  }

  if (!kpis) {
    return (
      <PageFatalErrorState
        id="dashboard-page"
        message={error ?? 'Sem dados do dashboard.'}
        onRetry={() => void fetchData()}
      />
    );
  }

  const highPriority = highPriorityDisplay(kpis, alerts);

  return (
    <>
      <div className="page" id="dashboard-page">
        <PageHeader
          eyebrow="Início"
          title="Painel principal"
          description="Um olhar rápido sobre o que importa agora: valores, alertas e atalhos."
          toolbar={
            <button type="button" className="btn-small" disabled={loading} onClick={() => void fetchData()}>
              {loading ? 'A atualizar…' : 'Atualizar'}
            </button>
          }
        />

        {error && <div className="banner banner--error">{error}</div>}
        {alertsFetchError && (
          <div className="banner banner--info" role="status">
            Não foi possível carregar os alertas recentes neste momento. Os números do resumo mantêm-se. Detalhe:{' '}
            {alertsFetchError}
          </div>
        )}

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon economy">
              <i className="fas fa-coins" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Gasto processado</p>
              <p className="metric-value">{moneyBr(kpis.gastoProcessado)}</p>
              <p className="metric-change">Em aberto: {moneyBr(kpis.valorEmAberto)}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon alerts">
              <i className="fas fa-exclamation-triangle" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Alertas ativos</p>
              <p className="metric-value">{kpis.alertasAtivos}</p>
              <p className="metric-change">{highPriority} marcados como urgentes</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon audits">
              <i className="fas fa-file-alt" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Auditorias</p>
              <p className="metric-value">{kpis.auditoriasRealizadas}</p>
              <p className="metric-change">Total no período do resumo</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon suppliers">
              <i className="fas fa-handshake" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Fornecedores</p>
              <p className="metric-value">{kpis.fornecedoresCadastrados}</p>
              <p className="metric-change">Cadastro interno (sem validação automática)</p>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="card">
            <div className="card-header">
              <h2>Alertas Recentes</h2>
              <Link to="/alertas" className="link-more">
                Ver todos
              </Link>
            </div>
            <div className="alerts-list">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <div key={alert.id} className={`alert-item ${alert.severity}`}>
                    <div className="alert-priority">
                      {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                    </div>
                    <div className="alert-content">
                      <p className="alert-title">{alert.type}</p>
                      <p className="alert-description">{alert.message}</p>
                    </div>
                    <div className="alert-date">{formatAlertDatePtBr(alert.createdAt)}</div>
                  </div>
                ))
              ) : (
                <p className="empty-state" style={{ margin: 0 }}>
                  {alertsFetchError
                    ? 'Lista de alertas indisponível neste momento.'
                    : 'Sem alertas para mostrar.'}
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Obrigações e vistorias</h2>
            </div>
            <div className="status-content" style={{ display: 'grid', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.55, color: 'var(--text-primary)' }}>
                Vencimentos de AVCB, elevadores, licenças e outras obrigações legais — num só sítio, com checklist e
                calendário.
              </p>
              <Link to="/conformidades" className="btn-small">
                Abrir obrigações
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
