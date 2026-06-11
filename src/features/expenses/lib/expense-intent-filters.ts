/** Lista mestra de filtros por intenção operacional (aprovação / processamento). */
export type ExpenseIntentFilterKey =
  | ''
  | 'approval:PendingApproval'
  | 'processing:Completed'
  | 'processing:Failed';

export const EXPENSE_INTENT_FILTERS: { value: ExpenseIntentFilterKey; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'approval:PendingApproval', label: 'Aguardando aprovação' },
  { value: 'processing:Completed', label: 'Processadas' },
  { value: 'processing:Failed', label: 'Com falha' },
];

export function parseExpenseIntentFilter(filterKey: string): {
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

export function buildExpenseListParams(filterKey: string, page = 1, pageSize = 100): Record<string, unknown> {
  const params: Record<string, unknown> = { page, pageSize };
  const parsed = parseExpenseIntentFilter(filterKey);
  if (parsed.approvalStatus) params.approvalStatus = parsed.approvalStatus;
  if (parsed.processingStatus) params.processingStatus = parsed.processingStatus;
  return params;
}

/** URL canónica da lista mestra com filtro de intenção. */
export function expenseListHref(filterKey: ExpenseIntentFilterKey = ''): string {
  if (!filterKey) return '/compras';
  return `/compras?intencao=${encodeURIComponent(filterKey)}`;
}
