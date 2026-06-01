import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatApiError } from '../../../lib/api-error-message';
import { EcondomizaApi } from '../../../services';
import { fetchConformidadesHub } from '../lib/obrigacao-map';
import { conformidadesKeys, type AddConformityPayload } from '../query-keys';

const SESSION_TENANT_ERROR =
  'Não foi possível identificar o condomínio da sessão. Recarregue a página ou faça login novamente.';

export function useConformidadesHubData(tenantId: string | undefined) {
  const trimmed = tenantId?.trim() ?? '';
  const enabled = trimmed.length > 0;

  const query = useQuery({
    queryKey: conformidadesKeys.hub(trimmed || '_'),
    queryFn: () => fetchConformidadesHub(trimmed),
    enabled,
  });

  const sessionError = !enabled ? SESSION_TENANT_ERROR : null;
  const queryError = query.isError ? formatApiError(query.error) : null;
  const errorMessage = sessionError ?? queryError;

  return {
    condominioId: query.data?.condominioId ?? null,
    items: query.data?.items ?? [],
    dashboard: query.data?.dashboard ?? null,
    findings: query.data?.findings ?? [],
    findingsError: query.data?.findingsError ?? null,
    isInitialLoading: enabled && query.isLoading && !query.data,
    isFetching: query.isFetching,
    errorMessage,
    refetch: query.refetch,
  };
}

export function useConformidadesMutations(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  const trimmed = tenantId?.trim() ?? '';

  const invalidateHub = async () => {
    if (!trimmed) return;
    await queryClient.invalidateQueries({ queryKey: conformidadesKeys.hub(trimmed) });
  };

  const addConformity = useMutation({
    mutationFn: async ({ condominioId, payload }: { condominioId: string; payload: AddConformityPayload }) =>
      EcondomizaApi.addConformity(condominioId, payload),
    onSuccess: invalidateHub,
  });

  const completeConformity = useMutation({
    mutationFn: async ({
      condominioId,
      itemId,
      notes,
    }: {
      condominioId: string;
      itemId: string;
      notes: string;
    }) => EcondomizaApi.completeConformity(condominioId, itemId, notes),
    onSuccess: invalidateHub,
  });

  const reopenConformity = useMutation({
    mutationFn: async ({ condominioId, itemId }: { condominioId: string; itemId: string }) =>
      EcondomizaApi.reopenConformity(condominioId, itemId),
    onSuccess: invalidateHub,
  });

  const isMutating = addConformity.isPending || completeConformity.isPending || reopenConformity.isPending;

  return { addConformity, completeConformity, reopenConformity, isMutating };
}
