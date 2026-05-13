import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizeListPayload } from '../lib/api-normalize';
import { formatApiError } from '../lib/api-error-message';
import type { DashboardKpiPayload } from '../lib/dashboard-from-monthly';
import { EcondomizaApi } from '../services/api';

interface StatusItem {
  label: string;
  value: string;
}

interface AlertItem {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  severity: 'high' | 'medium' | 'low';
}

const moneyBr = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const DashboardPage: React.FC = () => {
  const [kpis, setKpis] = useState<DashboardKpiPayload | null>(null);
  const [statusItems, setStatusItems] = useState<StatusItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        try {
          const summaryResult = await EcondomizaApi.dashboardSummary();
          const s = summaryResult.data as DashboardKpiPayload;
          setKpis(s);
          setStatusItems([
            { label: 'Conformidades', value: s.statusGeral.conformidades },
            { label: 'Documentação', value: s.statusGeral.documentacao },
            { label: 'Fornecedores Validados', value: s.statusGeral.fornecedoresValidados },
          ]);
        } catch (e) {
          console.error('Dashboard KPIs failed:', e);
          setKpis({
            year: new Date().getFullYear(),
            economiaIdentificada: 0,
            auditoriasRealizadas: 0,
            fornecedoresCadastrados: 0,
            alertasAtivos: 0,
            statusGeral: {
              conformidades: '0%',
              documentacao: '0%',
              fornecedoresValidados: '0%',
            },
          });
          setStatusItems([
            { label: 'Conformidades', value: '0%' },
            { label: 'Documentação', value: '0%' },
            { label: 'Fornecedores Validados', value: '0%' },
          ]);
          setError(formatApiError(e));
        }

        try {
          const alertsResult = await EcondomizaApi.listAlerts({ pageSize: 50 });
          const alertList = normalizeListPayload(alertsResult.data);
          const alertItems: AlertItem[] = (alertList as Record<string, unknown>[]).map((alert) => {
            const sev = String(alert.severity ?? 'WARNING').toUpperCase();
            const mapped: 'high' | 'medium' | 'low' =
              sev === 'CRITICAL' ? 'high' : sev === 'WARNING' ? 'medium' : 'low';
            return {
              id: String(alert.id ?? ''),
              type: String(alert.type ?? 'Alerta'),
              message: String(alert.message ?? ''),
              createdAt: String(alert.createdAt ?? ''),
              severity: mapped,
            };
          });
          setAlerts(alertItems);
        } catch (e) {
          console.error('Alerts list failed:', e);
          setAlerts([]);
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  if (loading && kpis === null) {
    return (
      <div className="dashboard-loading">
        <p>Carregando dados do dashboard...</p>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="dashboard-error">
        <p>{error ?? 'Sem dados do dashboard.'}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="page" id="dashboard-page">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p>Visão geral da auditoria do seu condomínio</p>
        </div>

        {error && (
          <div className="card" style={{ marginBottom: 16, color: 'crimson' }}>
            {error}
          </div>
        )}

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon economy">
              <i className="fas fa-coins"></i>
            </div>
            <div className="metric-content">
              <p className="metric-label">Economia Identificada</p>
              <p className="metric-value">{moneyBr(kpis.economiaIdentificada)}</p>
              <p className="metric-change">Referência: dashboard do gateway</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon alerts">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="metric-content">
              <p className="metric-label">Alertas Ativos</p>
              <p className="metric-value">{kpis.alertasAtivos}</p>
              <p className="metric-change">{alerts.filter((a) => a.severity === 'high').length} de alta prioridade</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon audits">
              <i className="fas fa-file-alt"></i>
            </div>
            <div className="metric-content">
              <p className="metric-label">Auditorias Realizadas</p>
              <p className="metric-value">{kpis.auditoriasRealizadas}</p>
              <p className="metric-change">Este trimestre</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon suppliers">
              <i className="fas fa-handshake"></i>
            </div>
            <div className="metric-content">
              <p className="metric-label">Fornecedores</p>
              <p className="metric-value">{kpis.fornecedoresCadastrados}</p>
              <p className="metric-change">Cadastrados</p>
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
                    <div className="alert-date">{new Date(alert.createdAt).toLocaleDateString('pt-BR')}</div>
                  </div>
                ))
              ) : (
                <p className="form-help" style={{ padding: '0.75rem 0', margin: 0 }}>
                  Nenhum alerta listado neste momento.
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Status Geral</h2>
            </div>
            <div className="status-content">
              {statusItems.map((item, index) => (
                <div key={index} className="status-item">
                  <span className="status-label">{item.label}</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${parseInt(item.value.replace('%', ''), 10) || 0}%` }}
                    ></div>
                  </div>
                  <span className="status-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
