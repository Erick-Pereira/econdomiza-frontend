import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { extractUploadPipelineWarning } from '../../../lib/econdomiza-api';
import { formatApiError } from '../../../lib/api-error-message';
import { EcondomizaApi } from '../../../services';
import { extractExpenseRows, mapAuditoriaExpenseRow, type AuditoriaExpenseRow } from '../lib/expense-map';
import { auditoriaKeys } from '../query-keys';

export type { AuditoriaExpenseRow };

export interface AuditoriaStats {
  total: number;
  processing: number;
  approved: number;
  pendingApproval: number;
}

function computeStats(expenses: AuditoriaExpenseRow[]): AuditoriaStats {
  let processing = 0;
  let approved = 0;
  let pendingApproval = 0;

  for (const e of expenses) {
    const p = e.processingStatus.toLowerCase();
    const a = e.approvalStatus.toLowerCase();
    if (p.includes('pending') || p.includes('process') || p.includes('partial')) processing += 1;
    if (a.includes('approve') && !a.includes('pending')) approved += 1;
    if (a.includes('pending')) pendingApproval += 1;
  }

  return { total: expenses.length, processing, approved, pendingApproval };
}

export function useAuditoriaData() {
  const queryClient = useQueryClient();

  const expensesQuery = useQuery({
    queryKey: auditoriaKeys.expenses(),
    queryFn: async () => {
      const res = await EcondomizaApi.listExpenses({ page: 1, pageSize: 100 });
      return res.data;
    },
    select: (data) => {
      const rows = extractExpenseRows(data).map(mapAuditoriaExpenseRow);
      return { expenses: rows, stats: computeStats(rows) };
    },
    staleTime: 2 * 60 * 1000,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const res = await EcondomizaApi.uploadDocument(file, { source: 'auditoria-page' });
      const warning = extractUploadPipelineWarning(res.data);
      return { fileName: file.name, warning };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: auditoriaKeys.expenses() });
    },
  });

  const expenses = expensesQuery.data?.expenses ?? [];
  const stats = expensesQuery.data?.stats ?? { total: 0, processing: 0, approved: 0, pendingApproval: 0 };
  const fetchError = expensesQuery.isError ? formatApiError(expensesQuery.error) : null;
  const uploadError = uploadMutation.isError ? formatApiError(uploadMutation.error) : null;
  const uploadWarning = uploadMutation.data?.warning ?? null;
  const uploadSuccessMessage =
    uploadMutation.isSuccess && uploadMutation.data
      ? uploadMutation.data.warning
        ? null
        : `“${uploadMutation.data.fileName}” enviado com sucesso. A lista será atualizada em instantes.`
      : null;

  return {
    expenses,
    stats,
    fetchError,
    uploadError,
    uploadWarning,
    uploadSuccessMessage,
    isInitialLoading: expensesQuery.isLoading && !expensesQuery.data,
    isFetching: expensesQuery.isFetching,
    isUploading: uploadMutation.isPending,
    refetch: () => expensesQuery.refetch(),
    uploadFile: uploadMutation.mutateAsync,
  };
}
