import { useQuery } from '@tanstack/react-query';
import { buildMonthlyChartSeries } from '../../../lib/dashboard-monthly-series';
import { formatApiError } from '../../../lib/api-error-message';
import { EcondomizaApi } from '../../../services';
import { dashboardKeys } from '../query-keys';

export function useDashboardMonthlyChart(year?: number) {
  const y = year ?? new Date().getFullYear();

  const query = useQuery({
    queryKey: dashboardKeys.monthly(y),
    queryFn: async () => {
      const res = await EcondomizaApi.dashboardMonthly(y);
      return buildMonthlyChartSeries(res.data);
    },
    staleTime: 60_000,
  });

  return {
    year: y,
    series: query.data ?? buildMonthlyChartSeries({ rows: [] }),
    isLoading: query.isLoading,
    error: query.isError ? formatApiError(query.error) : null,
    refetch: query.refetch,
  };
}
