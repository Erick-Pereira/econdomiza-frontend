import { buildDashboardKpisFromMonthlyPayload, type DashboardKpiPayload } from '../dashboard-from-monthly';
import { mapSummaryPayloadToDashboardKpis } from '../dashboard-from-summary';

export type DashboardSummaryResult = {
  data: DashboardKpiPayload;
  /** `monthly` quando `GET /api/dashboard/summary` não está disponível no gateway. */
  kpiSource: 'summary' | 'monthly';
};

type RequestFn = <T = unknown>(path: string, opts?: Record<string, unknown>) => Promise<{ data: T }>;

/**
 * KPIs do dashboard: tenta `GET /api/dashboard/summary`; em 404/405/501 usa `GET /api/dashboard/monthly?year=`.
 */
export async function fetchDashboardSummaryWithFallback(
  request: RequestFn,
  year: number
): Promise<DashboardSummaryResult> {
  try {
    const res = await request<Record<string, unknown>>('/api/dashboard/summary');
    return {
      data: mapSummaryPayloadToDashboardKpis(res.data, year),
      kpiSource: 'summary',
    };
  } catch (e) {
    const st = (e as { status?: number }).status;
    if (st !== 404 && st !== 405 && st !== 501) throw e;
    const res = await request<Record<string, unknown>>(`/api/dashboard/monthly?year=${year}`);
    return {
      data: buildDashboardKpisFromMonthlyPayload(res.data),
      kpiSource: 'monthly',
    };
  }
}
