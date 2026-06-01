import { useMutation, useQueries } from '@tanstack/react-query';
import { formatApiError } from '../../../lib/api-error-message';
import type { DashboardKpiPayload } from '../../../lib/dashboard-from-monthly';
import { EcondomizaApi } from '../../../services';
import { dashboardKeys } from '../../dashboard/query-keys';
import { relatoriosKeys, type ReportPeriod } from '../query-keys';

const YOY_YEARS_BACK = 2;

function reportParams(period: ReportPeriod): Record<string, unknown> {
  const now = new Date();
  if (period === 'monthly') {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  if (period === 'quarterly') {
    return { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) + 1 };
  }
  return { year: now.getFullYear() };
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function useRelatoriosData() {
  const [summaryQuery, yoyQuery] = useQueries({
    queries: [
      {
        queryKey: dashboardKeys.summary(),
        queryFn: () => EcondomizaApi.dashboardSummary(),
      },
      {
        queryKey: relatoriosKeys.yearOverYear(YOY_YEARS_BACK),
        queryFn: () => EcondomizaApi.getYearOverYear(YOY_YEARS_BACK),
      },
    ],
  });

  const summary: DashboardKpiPayload | null = summaryQuery.isSuccess ? summaryQuery.data.data : null;
  const yoy = yoyQuery.isSuccess ? yoyQuery.data.data : null;

  const summaryError = summaryQuery.isError ? formatApiError(summaryQuery.error) : null;
  const yoyError = yoyQuery.isError ? formatApiError(yoyQuery.error) : null;
  const partialError =
    [summaryError && summary ? summaryError : null, yoyError].filter(Boolean).join(' ') || null;

  const isInitialLoading = summaryQuery.isLoading && summary === null;
  const isFetching = summaryQuery.isFetching || yoyQuery.isFetching;

  const refetch = async () => {
    await Promise.all([summaryQuery.refetch(), yoyQuery.refetch()]);
  };

  return {
    summary,
    yoy,
    summaryError,
    yoyError,
    partialError,
    isInitialLoading,
    isFetching,
    refetch,
  };
}

export function useRelatoriosReportDownload() {
  return useMutation({
    mutationFn: async (period: ReportPeriod) => {
      const result = await EcondomizaApi.downloadReport(period, reportParams(period));
      triggerBlobDownload(result.blob, result.filename);
    },
  });
}
