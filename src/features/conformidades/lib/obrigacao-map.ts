import { parseApiDateLocal } from '../../../lib/format-date-pt-br';
import { normalizeListPayload } from '../../../lib/api-normalize';
import { EcondomizaApi } from '../../../services';

/** Estado visual para obrigações com prazo (não confundir com enums técnicos da API). */
export type ObrigacaoBucket = 'pendente' | 'em-dia' | 'vencido' | 'critico';

export const DIAS_PARA_CRITICO = 14;

const TIPO_PT: Record<string, string> = {
  PREFEITURA: 'Prefeitura / cadastro',
  LICENCA: 'Licença de funcionamento',
  AUDITORIACONTABIL: 'Auditoria contábil',
  SEGUROPREDIAL: 'Seguro predial',
  CERTIFICADOSEGURANCA: 'AVCB / segurança',
  CUSTOM: 'Obrigação personalizada',
};

function strField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && v !== '') return String(v);
  }
  return '';
}

export interface ObrigacaoItem {
  id: string;
  typeKey: string;
  typeLabel: string;
  description: string;
  lifecycle: 'completed' | 'pending' | 'overdue';
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
}

export function mapConformityRow(raw: unknown): ObrigacaoItem | null {
  if (raw == null || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  const id = strField(c, 'id', 'Id');
  if (!id) return null;

  const apiStatus = String(c.status ?? c.Status ?? '').toUpperCase();
  const now = new Date();
  const dueRaw = c.dueDate ?? c.DueDate;
  const doneRaw = c.completedAt ?? c.CompletedAt;
  const dueDate = dueRaw != null && String(dueRaw) !== '' ? String(dueRaw) : null;
  const completedAt = doneRaw != null && String(doneRaw) !== '' ? String(doneRaw) : null;
  const due = dueDate ? parseApiDateLocal(dueDate) : null;
  const completed = completedAt ? parseApiDateLocal(completedAt) : null;

  let lifecycle: ObrigacaoItem['lifecycle'] = 'pending';
  if (apiStatus === 'COMPLETED' || (completed && !Number.isNaN(completed.getTime()))) {
    lifecycle = 'completed';
  } else if (apiStatus === 'OVERDUE' || (due && !Number.isNaN(due.getTime()) && due < now)) {
    lifecycle = 'overdue';
  }

  const typeKey = strField(c, 'type', 'Type').replace(/\s/g, '');
  const typeNorm = typeKey.toUpperCase();

  return {
    id,
    typeKey: typeNorm,
    typeLabel: (TIPO_PT[typeNorm] ?? typeKey) || 'Obrigação',
    description: strField(c, 'description', 'Description') || '—',
    lifecycle,
    dueDate,
    completedAt,
    notes: c.notes != null || c.Notes != null ? String(c.notes ?? c.Notes) : null,
  };
}

export function bucketForItem(it: ObrigacaoItem): ObrigacaoBucket {
  if (it.lifecycle === 'completed') return 'em-dia';
  if (it.lifecycle === 'overdue') {
    const due = it.dueDate ? parseApiDateLocal(it.dueDate) : null;
    if (due && !Number.isNaN(due.getTime())) {
      const days = (Date.now() - due.getTime()) / 86400000;
      if (days > DIAS_PARA_CRITICO) return 'critico';
    }
    return 'vencido';
  }
  return 'pendente';
}

/** Buckets visíveis para Morador (somente leitura — sem estado "Crítico" separado). */
export const MORADOR_VIEW_BUCKETS: ObrigacaoBucket[] = ['pendente', 'em-dia', 'vencido'];

/** Para UI de Morador, agrupa "crítico" em "vencido". */
export function bucketForDisplay(it: ObrigacaoItem, mergeCriticoIntoVencido: boolean): ObrigacaoBucket {
  const raw = bucketForItem(it);
  if (mergeCriticoIntoVencido && raw === 'critico') return 'vencido';
  return raw;
}

export async function resolveCondominioId(sessionTenantId: string): Promise<string> {
  const tid = sessionTenantId?.trim();
  if (tid) return tid;
  const condominioResult = await EcondomizaApi.getMyCondominio();
  const raw = condominioResult.data as Record<string, unknown> | undefined;
  if (raw && typeof raw === 'object') {
    const id = strField(raw, 'id', 'Id');
    if (id) return id;
  }
  throw new Error('Condomínio inválido: sem tenantId na sessão e sem id no perfil do condomínio.');
}

export function pickNum(raw: Record<string, unknown> | null, ...keys: string[]): number {
  if (!raw) return 0;
  for (const k of keys) {
    const v = raw[k];
    if (v == null) continue;
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function strRow(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (v != null && v !== '') return String(v);
  }
  return '—';
}

export function severityPt(sev: string): string {
  const u = sev.toUpperCase();
  if (u === 'CRITICAL') return 'Crítica';
  if (u === 'HIGH') return 'Alta';
  if (u === 'MEDIUM') return 'Média';
  if (u === 'LOW') return 'Baixa';
  return sev || '—';
}

export const BUCKET_META: Record<ObrigacaoBucket, { label: string; hint: string; cardClass: string }> = {
  pendente: {
    label: 'Pendente',
    hint: 'Ainda há prazo ou sem data definida',
    cardClass: 'obligation-kpi obligation-kpi--pendente',
  },
  'em-dia': {
    label: 'Em dia',
    hint: 'Registadas como concluídas',
    cardClass: 'obligation-kpi obligation-kpi--ok',
  },
  vencido: {
    label: 'Vencido',
    hint: 'Passou do prazo — precisa de atenção',
    cardClass: 'obligation-kpi obligation-kpi--vencido',
  },
  critico: {
    label: 'Crítico',
    hint: `Atraso superior a ${DIAS_PARA_CRITICO} dias`,
    cardClass: 'obligation-kpi obligation-kpi--critico',
  },
};

export type ConformidadesHubBundle = {
  condominioId: string;
  items: ObrigacaoItem[];
  dashboard: Record<string, unknown> | null;
  findings: Record<string, unknown>[];
  findingsError: string | null;
};

export async function fetchConformidadesHub(tenantId: string): Promise<ConformidadesHubBundle> {
  const cid = await resolveCondominioId(tenantId);

  const [confRes, dashRes, findRes] = await Promise.all([
    EcondomizaApi.listConformities(cid),
    EcondomizaApi.complianceDashboard().catch(() => null),
    EcondomizaApi.complianceFindings({ page: 1, pageSize: 80, status: 'OUTSTANDING' }).catch(() => null),
  ]);

  const items: ObrigacaoItem[] = [];
  for (const row of normalizeListPayload(confRes.data)) {
    const it = mapConformityRow(row);
    if (it) items.push(it);
  }

  let dashboard: Record<string, unknown> | null = null;
  if (dashRes?.data && typeof dashRes.data === 'object') {
    dashboard = dashRes.data as Record<string, unknown>;
  }

  let findings: Record<string, unknown>[] = [];
  let findingsError: string | null = null;
  if (findRes?.data) {
    const data = findRes.data as Record<string, unknown>;
    const list = normalizeListPayload(data ?? findRes.data);
    findings = list.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
  } else if (findRes === null) {
    findingsError = 'Não foi possível carregar pendências das compras.';
  }

  return { condominioId: cid, items, dashboard, findings, findingsError };
}
