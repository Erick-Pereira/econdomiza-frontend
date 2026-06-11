import { formatDateTimePtBr } from './format-date-pt-br';
import { humanizeProcessingPt } from './expense-operational-ui';

export type TimelineLike = {
  title: string;
  detail?: string | null;
  action?: string | null;
  source?: string;
};

export type HumanizedTimelineDetail = {
  summary: string | null;
  technicalDetail: string | null;
};

const TIMELINE_ACTION_PT: Record<string, string> = {
  UPDATE: 'Atualização de registo',
  CREATE: 'Registo criado',
  DELETE: 'Registo removido',
  Confidence: 'Confiança do enriquecimento',
  PriceAnalyzed: 'Análise de preço',
};

const PROCESSING_STATUS_NUM: Record<number, string> = {
  0: 'Recebido',
  1: 'Enriquecimento (IA)',
  2: 'Benchmark',
  3: 'Persistência',
  4: 'Concluído (lacunas)',
  5: 'Processamento concluído',
  6: 'Falha técnica',
};

export function humanizeTimelineAction(action: string | null | undefined): string {
  if (!action) return '';
  return TIMELINE_ACTION_PT[action] ?? action;
}

export function looksLikeJsonPayload(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return false;
  return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'));
}

function humanizeJsonObject(o: Record<string, unknown>): string {
  const parts: string[] = [];

  const proc = o.ProcessingStatus ?? o.processingStatus;
  if (proc != null && proc !== '') {
    const code = typeof proc === 'number' ? PROCESSING_STATUS_NUM[proc] : humanizeProcessingPt(String(proc));
    parts.push(`Processamento: ${code ?? String(proc)}`);
  }

  const status = o.Status ?? o.status;
  if (status != null && status !== '') {
    parts.push(`Estado: ${String(status)}`);
  }

  const updated = o.UpdatedAt ?? o.updatedAt;
  if (updated) {
    parts.push(`Atualizado em ${formatDateTimePtBr(String(updated))}`);
  }

  const transition = o.LastPipelineTransitionAt ?? o.lastPipelineTransitionAt;
  if (transition) {
    parts.push(`Transição de pipeline: ${formatDateTimePtBr(String(transition))}`);
  }

  const desc = o.Description ?? o.description;
  if (typeof desc === 'string' && desc.trim().length > 0 && desc.length < 120) {
    parts.push(desc.trim());
  }

  const supplier = o.SupplierId ?? o.supplierId;
  if (supplier && parts.length === 0) {
    parts.push('Registo de fornecedor atualizado');
  }

  if (parts.length === 0) {
    return 'Alteração registada no sistema';
  }

  return parts.join(' · ');
}

export function humanizeTimelineDetail(entry: TimelineLike): HumanizedTimelineDetail {
  const raw = entry.detail?.trim();
  if (!raw) {
    return { summary: null, technicalDetail: null };
  }

  if (looksLikeJsonPayload(raw)) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return {
          summary: humanizeJsonObject(parsed as Record<string, unknown>),
          technicalDetail: raw,
        };
      }
    } catch {
      /* keep as plain text */
    }
    return {
      summary: 'Alteração técnica registada',
      technicalDetail: raw,
    };
  }

  if (raw.length > 280) {
    return {
      summary: `${raw.slice(0, 277)}…`,
      technicalDetail: raw,
    };
  }

  return { summary: raw, technicalDetail: null };
}

export type TimelineTab = 'all' | 'decisions' | 'processing' | 'prices';

export const TIMELINE_TAB_LABELS: { id: TimelineTab; label: string }[] = [
  { id: 'decisions', label: 'Decisões' },
  { id: 'all', label: 'Todos' },
  { id: 'processing', label: 'Processamento' },
  { id: 'prices', label: 'Preços' },
];

export function isTechnicalAuditUpdate(entry: TimelineLike): boolean {
  return (
    entry.source === 'audit' &&
    entry.action === 'UPDATE' &&
    !!entry.detail &&
    looksLikeJsonPayload(entry.detail)
  );
}

export function timelineTabFilter(tab: TimelineTab, entry: TimelineLike): boolean {
  const blob = `${entry.title} ${entry.detail ?? ''} ${entry.action ?? ''}`.toLowerCase();

  if (tab === 'decisions') {
    if (isTechnicalAuditUpdate(entry)) return false;
    return (
      /aprov|rejeit|cancel|pagamento|estorno|despesa criada|decisão|liquidação/i.test(blob) ||
      entry.action === 'CREATE' ||
      (entry.source === 'audit' && entry.action !== 'UPDATE')
    );
  }

  if (tab === 'processing') {
    return (
      /process|pipeline|confiança|enriquecimento|ingest|falha|reprocess|benchmarking|persist/i.test(blob) ||
      entry.action === 'Confidence' ||
      isTechnicalAuditUpdate(entry)
    );
  }

  if (tab === 'prices') {
    return (
      /preço|preco|benchmark|priceanalyzed|mercado|desvio|referência|referencia/i.test(blob) ||
      entry.action === 'PriceAnalyzed'
    );
  }

  return true;
}

export function humanizeSeverityPt(severity: string | null | undefined): string {
  const u = (severity ?? '').trim().toUpperCase();
  switch (u) {
    case 'CRITICAL':
      return 'Crítico';
    case 'HIGH':
      return 'Alto';
    case 'WARNING':
    case 'MEDIUM':
      return 'Atenção';
    case 'LOW':
    case 'INFO':
      return 'Informativo';
    default:
      return severity?.trim() || '—';
  }
}
