/** Helpers de UI operacional para despesas (badges, semântica de estado). */

export const PROCESSING_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos (pipeline)' },
  { value: 'Received', label: 'Recebido' },
  { value: 'Enriching', label: 'Enriquecimento (IA)' },
  { value: 'Benchmarking', label: 'Benchmark' },
  { value: 'Persisting', label: 'Persistência' },
  { value: 'Completed', label: 'Processamento OK' },
  { value: 'PartiallyCompleted', label: 'Concluído com lacunas' },
  { value: 'Failed', label: 'Falha técnica' },
];

export type OpBadgeTone = 'ok' | 'warn' | 'danger' | 'neutral' | 'info' | 'progress';

export function processingStatusTone(code: string): OpBadgeTone {
  switch (code) {
    case 'Completed':
      return 'ok';
    case 'PartiallyCompleted':
      return 'warn';
    case 'Failed':
      return 'danger';
    case 'Enriching':
    case 'Benchmarking':
    case 'Persisting':
    case 'Received':
      return 'progress';
    default:
      return 'neutral';
  }
}

export function approvalStatusTone(code: string): OpBadgeTone {
  switch (code) {
    case 'Approved':
      return 'ok';
    case 'Rejected':
    case 'Cancelled':
      return 'danger';
    case 'PendingApproval':
      return 'info';
    default:
      return 'neutral';
  }
}

export function settlementStatusTone(code: string): OpBadgeTone {
  switch (code) {
    case 'Paid':
      return 'ok';
    case 'PartiallyPaid':
      return 'warn';
    case 'Unpaid':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function confidenceTone(score: number | null | undefined, lowConfidence: boolean): OpBadgeTone {
  if (score == null || !Number.isFinite(score)) return 'neutral';
  if (lowConfidence || score < 0.5) return 'danger';
  if (score < 0.75) return 'warn';
  return 'ok';
}

export function formatConfidencePercent(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return '—';
  return `${(score * 100).toFixed(1)}%`;
}

export function pickStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && v !== '') return String(v);
  }
  return '';
}

export function pickNum(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function pickBool(obj: Record<string, unknown>, ...keys: string[]): boolean {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === 1) return true;
    if (v === 'false' || v === 0) return false;
  }
  return false;
}

export function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function humanizeApprovalPt(code: string): string {
  switch (code) {
    case 'PendingApproval':
      return 'Aguarda aprovação';
    case 'Approved':
      return 'Aprovada';
    case 'Rejected':
      return 'Rejeitada';
    case 'Cancelled':
      return 'Cancelado';
    default:
      return code || '—';
  }
}

export function humanizeSettlementPt(code: string): string {
  switch (code) {
    case 'Unpaid':
      return 'Em aberto';
    case 'PartiallyPaid':
      return 'Parcialmente paga';
    case 'Paid':
      return 'Liquidada';
    default:
      return code || '—';
  }
}

export function humanizeProcessingPt(code: string): string {
  const m: Record<string, string> = {
    Received: 'Recebido',
    Enriching: 'IA / enriquecimento',
    Benchmarking: 'Benchmark',
    Persisting: 'Persistência',
    Completed: 'Concluído',
    Failed: 'Falha',
    PartiallyCompleted: 'Concluído (lacunas)',
  };
  return (m[code] ?? code) || '—';
}

/** Lê flags booleanas da API (camelCase/PascalCase, bool ou string). */
export function readAllowedFlag(source: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const v = source[key];
    if (v === true) return true;
    if (v === false) return false;
    if (typeof v === 'string') {
      const lower = v.trim().toLowerCase();
      if (lower === 'true') return true;
      if (lower === 'false') return false;
    }
  }
  return false;
}

/** Extrai GUID de um objeto de pagamento/item. */
export function readEntityId(obj: Record<string, unknown>): string {
  const v = obj.id ?? obj.Id;
  if (v == null || v === '') return '';
  return String(v);
}
