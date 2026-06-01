/** Chaves de filtro da lista de compras — mapeiam para query params distintos na API. */
export type ComprasFilterKey = '' | 'approval:PendingApproval' | 'processing:Completed' | 'processing:Failed';

export const COMPRAS_FILTERS: { value: ComprasFilterKey; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'approval:PendingApproval', label: 'Aguardando aprovação' },
  { value: 'processing:Completed', label: 'Processadas' },
  { value: 'processing:Failed', label: 'Com falha' },
];

export function parseComprasFilter(filterKey: string): {
  approvalStatus?: string;
  processingStatus?: string;
} {
  if (!filterKey) return {};
  const [kind, value] = filterKey.split(':');
  if (!value) return {};
  if (kind === 'approval') return { approvalStatus: value };
  if (kind === 'processing') return { processingStatus: value };
  return {};
}
