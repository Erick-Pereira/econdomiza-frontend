import { formatDatePtBr } from '../../../lib/format-date-pt-br';
import type { BadgeVariant } from '../../../components/ui';

export type AuditoriaExpenseRow = {
  id: string;
  description: string;
  totalAmount: number;
  issueDate: string;
  issueDateLabel: string;
  processingStatus: string;
  approvalStatus: string;
  settlementStatus: string;
  supplierName: string;
  confidenceScore: number | null;
  lowConfidence: boolean;
};

function str(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '';
}

function num(row: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = row[k];
    if (v != null) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

export function mapAuditoriaExpenseRow(raw: Record<string, unknown>): AuditoriaExpenseRow {
  const issueDate = str(raw, 'issueDate', 'IssueDate', 'date', 'Date');
  const confRaw = raw.confidenceScore ?? raw.ConfidenceScore;
  const confidenceScore = confRaw != null && Number.isFinite(Number(confRaw)) ? Number(confRaw) : null;

  return {
    id: str(raw, 'id', 'Id'),
    description: str(raw, 'description', 'Description') || 'Despesa sem descrição',
    totalAmount: num(raw, 'totalAmount', 'TotalAmount', 'amount', 'Amount'),
    issueDate,
    issueDateLabel: formatDatePtBr(issueDate, '—'),
    processingStatus: str(raw, 'processingStatus', 'ProcessingStatus', 'status', 'Status') || '—',
    approvalStatus: str(raw, 'approvalStatus', 'ApprovalStatus') || '—',
    settlementStatus: str(raw, 'settlementStatus', 'SettlementStatus') || '—',
    supplierName: str(raw, 'supplierName', 'SupplierName'),
    confidenceScore,
    lowConfidence: Boolean(raw.lowConfidence ?? raw.LowConfidence),
  };
}

export function extractExpenseRows(raw: unknown): Record<string, unknown>[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((r) => r != null && typeof r === 'object') as Record<string, unknown>[];
  }
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    for (const key of ['items', 'Items', 'data', 'Data', 'expenses', 'Expenses'] as const) {
      const v = o[key];
      if (Array.isArray(v)) {
        return v.filter((r) => r != null && typeof r === 'object') as Record<string, unknown>[];
      }
    }
    for (const v of Object.values(o)) {
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
        return v as Record<string, unknown>[];
      }
    }
  }
  return [];
}

export function processingStatusLabel(code: string): string {
  const c = code.toLowerCase();
  if (c.includes('fail')) return 'Falhou';
  if (c.includes('partial')) return 'Parcial';
  if (c.includes('complete') || c === 'completed') return 'Processado';
  if (c.includes('pending') || c.includes('process')) return 'Em processamento';
  return code || '—';
}

export function approvalStatusLabel(code: string): string {
  const c = code.toLowerCase();
  if (c.includes('cancel')) return 'Cancelado';
  if (c.includes('reject')) return 'Rejeitada';
  if (c.includes('approve') && !c.includes('pending')) return 'Aprovada';
  if (c.includes('pending')) return 'Aguardando aprovação';
  return code || '—';
}

export function processingBadgeVariant(code: string): BadgeVariant {
  const c = code.toLowerCase();
  if (c.includes('fail')) return 'error';
  if (c.includes('partial') || c.includes('pending') || c.includes('process')) return 'warning';
  if (c.includes('complete')) return 'ok';
  return 'neutral';
}

export function approvalBadgeVariant(code: string): BadgeVariant {
  const c = code.toLowerCase();
  if (c.includes('cancel') || c.includes('reject')) return 'error';
  if (c.includes('pending')) return 'warning';
  if (c.includes('approve')) return 'ok';
  return 'neutral';
}
