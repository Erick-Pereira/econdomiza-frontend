import type { DashboardKpiPayload } from './dashboard-from-monthly';
import { isAlertRowResolved } from './alert-row';

/**
 * Quando os KPIs vêm apenas do mensal, `alertasAtivos` fica 0 no agregador.
 * Usa a primeira página de alertas como estimativa mínima coerente com a lista.
 * Não substitui totais do `GET /api/dashboard/summary` quando esse endpoint respondeu.
 */
export function enrichMonthlyKpisWithActiveAlertCount(
  kpis: DashboardKpiPayload,
  alertRows: Record<string, unknown>[]
): DashboardKpiPayload {
  if (kpis.alertasAtivos > 0) return kpis;
  const active = alertRows.filter((r) => !isAlertRowResolved(r)).length;
  if (active <= 0) return kpis;
  return { ...kpis, alertasAtivos: active };
}
