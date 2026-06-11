import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { formatApiError } from '../../../lib/api-error-message';
import { EcondomizaApi } from '../../../services';
import { extractFindings, mapExpenseComplianceRaw } from '../lib/expense-compliance-map';
import { conformidadesKeys } from '../query-keys';

export function useExpenseCompliance(expenseId: string) {
  const query = useQuery({
    queryKey: conformidadesKeys.expense(expenseId),
    queryFn: async () => {
      const res = await EcondomizaApi.getExpenseCompliance(expenseId);
      return mapExpenseComplianceRaw(res.data);
    },
    enabled: expenseId.length > 0,
  });

  const raw = query.data ?? null;
  const findings = useMemo(() => extractFindings(raw), [raw]);
  const errorMessage = query.isError ? formatApiError(query.error) : null;

  return {
    raw,
    findings,
    isInitialLoading: query.isLoading && raw === null && !query.isError,
    isFetching: query.isFetching,
    errorMessage,
    refetch: query.refetch,
  };
}

export function useExpenseComplianceMutations(expenseId: string) {
  const queryClient = useQueryClient();

  const setComplianceData = (data: unknown) => {
    const mapped = mapExpenseComplianceRaw(data);
    if (mapped) {
      queryClient.setQueryData(conformidadesKeys.expense(expenseId), mapped);
    }
  };

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: conformidadesKeys.expense(expenseId) });
  };

  const reevaluate = useMutation({
    mutationFn: () => EcondomizaApi.reevaluateExpenseCompliance(expenseId),
    onSuccess: (res: { data?: unknown }) => {
      if (res.data) setComplianceData(res.data);
      else void invalidate();
    },
  });

  const saveEvidence = useMutation({
    mutationFn: ({ findingId, documentIds }: { findingId: string; documentIds: string[] }) =>
      EcondomizaApi.setExpenseComplianceEvidence(expenseId, findingId, documentIds),
    onSuccess: invalidate,
  });

  const addComment = useMutation({
    mutationFn: ({ findingId, body }: { findingId: string; body: string }) =>
      EcondomizaApi.addExpenseComplianceComment(expenseId, findingId, body),
    onSuccess: invalidate,
  });

  const waiveFinding = useMutation({
    mutationFn: ({ findingId, reason }: { findingId: string; reason: string }) =>
      EcondomizaApi.waiveExpenseComplianceFinding(expenseId, findingId, reason),
    onSuccess: invalidate,
  });

  const isMutating =
    reevaluate.isPending || saveEvidence.isPending || addComment.isPending || waiveFinding.isPending;

  return { reevaluate, saveEvidence, addComment, waiveFinding, isMutating };
}
