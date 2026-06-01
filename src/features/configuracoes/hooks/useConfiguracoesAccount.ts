import { useQuery } from '@tanstack/react-query';
import { EcondomizaApi } from '../../../services';
import { configuracoesKeys } from '../query-keys';

function parseCondominioName(data: unknown): string | null {
  const d = data as Record<string, unknown> | null | undefined;
  if (!d || typeof d !== 'object') return null;
  const nome = String(d.nome ?? d.name ?? '').trim();
  return nome || null;
}

export function useMyCondominio(tenantId: string | undefined) {
  const trimmed = tenantId?.trim() ?? '';
  const enabled = trimmed.length > 0;

  const query = useQuery({
    queryKey: configuracoesKeys.condominio(trimmed || '_'),
    queryFn: async () => {
      const res = await EcondomizaApi.getMyCondominio();
      return parseCondominioName(res.data);
    },
    enabled,
  });

  return {
    condominioNome: enabled ? (query.data ?? null) : null,
    isLoading: enabled && query.isLoading,
    refetch: query.refetch,
  };
}
