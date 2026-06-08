import { useQueries } from '@tanstack/react-query';
import { mapSeverityToDashboardLevel, severityUpperFromAlertRow } from '../../../lib/alert-row';
import { normalizeListPayload } from '../../../lib/api-normalize';
import { pickCreatedAtIso, sortByCreatedAtDesc } from '../../../lib/sort-by-date';
import { formatApiError } from '../../../lib/api-error-message';
import type { DashboardKpiPayload } from '../../../lib/dashboard-from-monthly';
import { enrichMonthlyKpisWithActiveAlertCount } from '../../../lib/dashboard-kpi-merge';
import { EcondomizaApi } from '../../../services';
import { dashboardKeys } from '../query-keys';

export interface DashboardAlertItem {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  severity: 'high' | 'medium' | 'low';
}

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

function mapAlertRows(rawRows: Record<string, unknown>[]): DashboardAlertItem[] {
  const rows = rawRows.map((alert) => {
    const sev = severityUpperFromAlertRow(alert);
    const mapped = mapSeverityToDashboardLevel(sev);
    return {
      id: String(alert.id ?? alert.Id ?? ''),
      type: String(alert.type ?? alert.Type ?? 'Alerta'),
      message: String(alert.message ?? alert.Message ?? ''),
      createdAt: pickCreatedAtIso(alert),
      severity: mapped,
    };
  });
  return sortByCreatedAtDesc(rows);
}

export function useDashboardData() {
  const [summaryQuery, alertsQuery] = useQueries({
    queries: [
      {
        queryKey: dashboardKeys.summary(),
        queryFn: () => EcondomizaApi.dashboardSummary(),
      },
      {
        queryKey: dashboardKeys.alerts(),
        queryFn: () => EcondomizaApi.listAlerts({ pageSize: 50 }),
      },
    ],
  });

  const alertList = alertsQuery.data
    ? (normalizeListPayload(alertsQuery.data.data).filter(
        (r) => r != null && typeof r === 'object'
      ) as Record<string, unknown>[])
    : [];
  const alerts = alertsQuery.isSuccess ? mapAlertRows(alertList) : [];

  let kpis: DashboardKpiPayload | null = null;
  let kpiError: string | null = null;

  if (summaryQuery.isSuccess) {
    const summaryRes = summaryQuery.data;
    const baseKpis = summaryRes.data;
    kpis =
      summaryRes.kpiSource === 'monthly' || baseKpis.alertasAtivos === 0
        ? enrichMonthlyKpisWithActiveAlertCount(baseKpis, alertList)
        : baseKpis;
  } else if (summaryQuery.isError) {
    kpiError = formatApiError(summaryQuery.error);
    kpis = emptyDashboardKpis(new Date().getFullYear());
  }

  const alertsFetchError = alertsQuery.isError ? formatApiError(alertsQuery.error) : null;
  const isInitialLoading = summaryQuery.isLoading && kpis === null;
  const isFetching = summaryQuery.isFetching || alertsQuery.isFetching;

  const highPriorityCount =
    kpis && typeof kpis.alertasAltaPrioridade === 'number'
      ? kpis.alertasAltaPrioridade
      : alerts.filter((a) => a.severity === 'high').length;

  const refetch = async () => {
    await Promise.all([summaryQuery.refetch(), alertsQuery.refetch()]);
  };

  return {
    kpis,
    alerts,
    kpiError,
    alertsFetchError,
    highPriorityCount,
    isInitialLoading,
    isFetching,
    refetch,
  };
}
