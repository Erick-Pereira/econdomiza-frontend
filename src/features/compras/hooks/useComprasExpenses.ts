import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizeListPayload } from '../../../lib/api-normalize';
import { formatApiError } from '../../../lib/api-error-message';
import { EcondomizaApi } from '../../../services';
import { buildExpenseListParams } from '../../expenses/lib/expense-intent-filters';
import { sortRowsByRecency } from '../../../lib/sort-by-date';
import { comprasKeys } from '../query-keys';

function extractExpenseRows(raw: unknown): Record<string, unknown>[] {
  const direct = normalizeListPayload(raw);
  if (direct.length > 0) {
    return direct.filter((r) => r != null && typeof r === 'object') as Record<string, unknown>[];
  }
  if (raw && typeof raw === 'object') {
    for (const v of Object.values(raw as Record<string, unknown>)) {
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
        return v as Record<string, unknown>[];
      }
    }
  }
  return [];
}

export function useComprasExpenses(filterKey: string) {
  return useQuery({
    queryKey: comprasKeys.list(filterKey),
    queryFn: async () => {
      const filters = buildExpenseListParams(filterKey);
      const res = await EcondomizaApi.listExpenses(filters);
      return res.data;
    },
    select: (data) => ({
      raw: data,
      rows: sortRowsByRecency(extractExpenseRows(data)),
    }),
    placeholderData: (previous) => previous,
  });
}

export function useComprasApproval(filterKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      if (approve) {
        await EcondomizaApi.approveExpense(id);
      } else {
        await EcondomizaApi.rejectExpense(id, 'Reprovado pelo Síndico/Conselho');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: comprasKeys.list(filterKey) });
    },
    meta: {
      formatError: formatApiError,
    },
  });
}
