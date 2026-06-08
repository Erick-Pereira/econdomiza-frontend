export type DeliveryRow = Record<string, unknown>;

export interface DashboardCounts {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  suppressed: number;
  filtered: number;
}

export type GovChannel = { code?: string; displayName?: string; description?: string };
export type GovPolicy = { key?: string; value?: string; description?: string };
export type TemplateRow = {
  code?: string;
  channel?: string;
  subjectPattern?: string;
  bodyPattern?: string;
  sourceEvent?: string;
  SubjectPattern?: string;
  BodyPattern?: string;
  SourceEvent?: string;
};

export type DeliveriesPage = {
  items: DeliveryRow[];
  total: number;
  page: number;
  pageSize: number;
};

export function pickStr(r: DeliveryRow, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '—';
}

export function pickNum(r: DeliveryRow, ...keys: string[]): number {
  for (const k of keys) {
    const v = r[k];
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function readDashboard(raw: unknown): DashboardCounts {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    total: Number(o.total ?? o.Total ?? 0),
    pending: Number(o.pending ?? o.Pending ?? 0),
    sent: Number(o.sent ?? o.Sent ?? 0),
    failed: Number(o.failed ?? o.Failed ?? 0),
    suppressed: Number(o.suppressed ?? o.Suppressed ?? 0),
    filtered: Number(o.filtered ?? o.Filtered ?? 0),
  };
}

export function readItemsPage(raw: unknown): DeliveriesPage {
  const o = (raw ?? {}) as Record<string, unknown>;
  const itemsRaw = o.items ?? o.Items;
  const items = Array.isArray(itemsRaw) ? (itemsRaw as DeliveryRow[]) : [];
  return {
    items,
    total: Number(o.total ?? o.Total ?? items.length),
    page: Number(o.page ?? o.Page ?? 1),
    pageSize: Number(o.pageSize ?? o.PageSize ?? 20),
  };
}

export function statusPt(st: string): string {
  const u = st.trim();
  switch (u) {
    case 'Pending':
      return 'Pendente';
    case 'Sent':
      return 'Enviada';
    case 'Failed':
      return 'Falhou';
    case 'Suppressed':
      return 'Suprimida';
    case 'Filtered':
      return 'Filtrada';
    default:
      return u || '—';
  }
}

export function severityPt(sev: string): string {
  const u = sev.toUpperCase();
  if (u === 'CRITICAL') return 'Crítica';
  if (u === 'HIGH') return 'Alta';
  if (u === 'MEDIUM') return 'Média';
  if (u === 'LOW') return 'Baixa';
  if (u === 'INFO') return 'Info';
  return sev || '—';
}

export function deliveryPriority(r: DeliveryRow): 'critico' | 'atencao' | 'normal' {
  const st = pickStr(r, 'status', 'Status');
  const sev = pickStr(r, 'severity', 'Severity').toUpperCase();
  if (st === 'Failed' || sev === 'CRITICAL') return 'critico';
  if (st === 'Pending' || sev === 'HIGH') return 'atencao';
  return 'normal';
}

export function readGov(raw: unknown): {
  channels: GovChannel[];
  policies: GovPolicy[];
  notes: string[];
} {
  const o = (raw ?? {}) as Record<string, unknown>;
  const ch = o.channels ?? o.Channels;
  const pol = o.policies ?? o.Policies;
  const notes = o.operationalNotes ?? o.OperationalNotes;
  return {
    channels: Array.isArray(ch) ? (ch as GovChannel[]) : [],
    policies: Array.isArray(pol) ? (pol as GovPolicy[]) : [],
    notes: Array.isArray(notes) ? (notes as string[]).map(String) : [],
  };
}

export function readTemplates(raw: unknown): TemplateRow[] {
  return Array.isArray(raw) ? (raw as TemplateRow[]) : [];
}

export function slugStatus(st: string): string {
  const u = st.trim().toLowerCase();
  if (['pending', 'sent', 'failed', 'suppressed', 'filtered'].includes(u)) return u;
  return 'other';
}

export function slugSeverity(sev: string): string {
  const u = sev.trim().toLowerCase();
  if (['critical', 'high', 'medium', 'low', 'info'].includes(u)) return u;
  return 'info';
}

export function sortDeliveriesRecent(items: DeliveryRow[]): DeliveryRow[] {
  const rank = (r: DeliveryRow) => {
    const p = deliveryPriority(r);
    if (p === 'critico') return 0;
    if (p === 'atencao') return 1;
    return 2;
  };
  const t = (r: DeliveryRow) => {
    const s = pickStr(r, 'createdAt', 'CreatedAt', 'sentAt', 'SentAt');
    const n = new Date(s).getTime();
    return Number.isFinite(n) ? n : 0;
  };
  return [...items].sort((a, b) => {
    const byDate = t(b) - t(a);
    if (byDate !== 0) return byDate;
    return rank(a) - rank(b);
  });
}

export const EMPTY_DASHBOARD: DashboardCounts = {
  total: 0,
  pending: 0,
  sent: 0,
  failed: 0,
  suppressed: 0,
  filtered: 0,
};

export const NO_USER_ERROR = 'Perfil sem identificador de utilizador.';
