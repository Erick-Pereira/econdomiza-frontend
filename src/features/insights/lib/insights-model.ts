export const insightsKeys = {
  all: ['insights'] as const,
  bundle: () => [...insightsKeys.all, 'bundle'] as const,
};

export type InsightPeriod = { fromInclusive?: string; toInclusive?: string };

export type InsightLink = { label: string; href: string };

export type OperationalInsight = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  severity: string;
  confidence: string;
  primaryPeriod?: InsightPeriod | null;
  comparePeriod?: InsightPeriod | null;
  dataSources: string[];
  criteria: string;
  evidence: Record<string, string>;
  tier: string;
  impactScore: number;
  uiGroup: string;
  simpleExplanation: string;
  detailedExplanation: string;
  whyItMatters: string;
  recommendation: string;
  suggestedAction: string;
  dataOriginLabel: string;
  benchmarkNote: string;
  complianceNote: string;
  anomalyNote: string;
  operationalLinks: InsightLink[];
};

export type InsightsEnvelope = {
  generatedAtUtc?: string;
  disclaimer?: string;
  executiveSummary?: string;
  items?: OperationalInsight[];
  servedFrom?: string;
  snapshotId?: string;
  expiresAtUtc?: string;
  ruleSetVersion?: string;
};

export type SnapshotMetaRow = {
  id: string;
  createdAtUtc: string;
  expiresAtUtc: string;
  ruleSetVersion: string;
};

export type AlertInsightRow = {
  id: string;
  type: string;
  productName: string;
  message: string;
  category: string;
  alertCategory: string;
  severity: string;
  deviationPct: string;
  currentPrice: string;
  avgPrice: string;
  analyzedAt: string;
  createdAt: string;
  resolved: boolean;
};

export type IaItemNarrative = {
  simpleExplanation: string;
  whyItMatters: string;
  whatToDo: string;
  detailedExplanation: string;
};

export type InsightsBundle = {
  envelope: InsightsEnvelope | null;
  history: SnapshotMetaRow[];
  alerts: AlertInsightRow[];
  complianceScore: number | null;
  complianceOutstanding: number | null;
  partialErrors: string[];
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function parseLinks(raw: unknown): InsightLink[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .map((x) => {
      const o = asRecord(x);
      return {
        label: String(o.label ?? o.Label ?? ''),
        href: String(o.href ?? o.Href ?? ''),
      };
    })
    .filter((l) => l.label.trim() !== '' && l.href.trim() !== '');
}

function parseInsight(r: Record<string, unknown>): OperationalInsight {
  const evidence = asRecord(r.evidence);
  const ev: Record<string, string> = {};
  for (const [k, val] of Object.entries(evidence)) {
    ev[k] = val == null ? '' : String(val);
  }
  return {
    id: String(r.id ?? ''),
    kind: String(r.kind ?? ''),
    title: String(r.title ?? ''),
    summary: String(r.summary ?? ''),
    severity: String(r.severity ?? 'info'),
    confidence: String(r.confidence ?? 'medium'),
    primaryPeriod:
      r.primaryPeriod && typeof r.primaryPeriod === 'object' ? (r.primaryPeriod as InsightPeriod) : null,
    comparePeriod:
      r.comparePeriod && typeof r.comparePeriod === 'object' ? (r.comparePeriod as InsightPeriod) : null,
    dataSources: Array.isArray(r.dataSources) ? (r.dataSources as unknown[]).map((s) => String(s)) : [],
    criteria: String(r.criteria ?? ''),
    evidence: ev,
    tier: String(r.tier ?? 'info'),
    impactScore: Number(r.impactScore ?? r.ImpactScore ?? 0),
    uiGroup: String(r.uiGroup ?? r.UiGroup ?? 'spend'),
    simpleExplanation: String(r.simpleExplanation ?? r.SimpleExplanation ?? ''),
    detailedExplanation: String(r.detailedExplanation ?? r.DetailedExplanation ?? ''),
    whyItMatters: String(r.whyItMatters ?? r.WhyItMatters ?? ''),
    recommendation: String(r.recommendation ?? r.Recommendation ?? ''),
    suggestedAction: String(r.suggestedAction ?? r.SuggestedAction ?? ''),
    dataOriginLabel: String(r.dataOriginLabel ?? r.DataOriginLabel ?? ''),
    benchmarkNote: String(r.benchmarkNote ?? r.BenchmarkNote ?? ''),
    complianceNote: String(r.complianceNote ?? r.ComplianceNote ?? ''),
    anomalyNote: String(r.anomalyNote ?? r.AnomalyNote ?? ''),
    operationalLinks: parseLinks(r.operationalLinks ?? r.OperationalLinks),
  };
}

export function parseInsightsEnvelope(data: unknown): InsightsEnvelope {
  const o = asRecord(data);
  const itemsRaw = o.items;
  const items: OperationalInsight[] = Array.isArray(itemsRaw)
    ? (itemsRaw as unknown[]).map((x) => parseInsight(asRecord(x)))
    : [];
  return {
    generatedAtUtc: o.generatedAtUtc != null ? String(o.generatedAtUtc) : undefined,
    disclaimer: o.disclaimer != null ? String(o.disclaimer) : undefined,
    executiveSummary:
      o.executiveSummary != null
        ? String(o.executiveSummary)
        : o.ExecutiveSummary != null
          ? String(o.ExecutiveSummary)
          : undefined,
    items,
    servedFrom: o.servedFrom != null ? String(o.servedFrom) : undefined,
    snapshotId: o.snapshotId != null ? String(o.snapshotId) : undefined,
    expiresAtUtc: o.expiresAtUtc != null ? String(o.expiresAtUtc) : undefined,
    ruleSetVersion: o.ruleSetVersion != null ? String(o.ruleSetVersion) : undefined,
  };
}

function tierRank(t: string): number {
  if (t === 'critical') return 0;
  if (t === 'attention') return 1;
  return 2;
}

export function sortInsights(list: OperationalInsight[]): OperationalInsight[] {
  return [...list].sort((a, b) => {
    const tr = tierRank(a.tier) - tierRank(b.tier);
    if (tr !== 0) return tr;
    return (b.impactScore ?? 0) - (a.impactScore ?? 0);
  });
}

export function parseIaNarrative(
  data: unknown
): { executiveSummary: string; byId: Record<string, IaItemNarrative> } | null {
  const o = asRecord(data);
  const exec = String(o.executiveSummary ?? o.ExecutiveSummary ?? '').trim();
  const rawItems = o.items ?? o.Items;
  if (!Array.isArray(rawItems)) return null;
  const byId: Record<string, IaItemNarrative> = {};
  for (const x of rawItems) {
    const r = asRecord(x);
    const id = String(r.id ?? r.Id ?? '');
    if (!id) continue;
    byId[id] = {
      simpleExplanation: String(r.simpleExplanation ?? r.SimpleExplanation ?? ''),
      whyItMatters: String(r.whyItMatters ?? r.WhyItMatters ?? ''),
      whatToDo: String(r.whatToDo ?? r.WhatToDo ?? ''),
      detailedExplanation: String(r.detailedExplanation ?? r.DetailedExplanation ?? ''),
    };
  }
  return { executiveSummary: exec, byId };
}

export function confidencePt(c: string): string {
  const u = c.toLowerCase();
  if (u === 'high') return 'Alta';
  if (u === 'medium') return 'Média';
  if (u === 'low') return 'Baixa';
  return c || '—';
}

export function uiGroupEyebrow(g: string): string {
  const x = (g || '').toLowerCase();
  if (x.includes('spend') || x === 'despesas' || x === 'orcamento') return 'Despesas e orçamento';
  if (x.includes('price') || x.includes('mercado')) return 'Preços e mercado';
  if (x.includes('compliance') || x.includes('risk') || x.includes('conform')) return 'Obrigações e riscos';
  return 'Operação do condomínio';
}

export function impactLabel(score: number): string {
  const s = Math.min(100, Math.max(0, score));
  if (s >= 75) return 'Impacto alto';
  if (s >= 40) return 'Impacto médio';
  return 'Impacto leve';
}
