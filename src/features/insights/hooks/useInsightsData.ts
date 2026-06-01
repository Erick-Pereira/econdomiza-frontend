import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  isAlertRowResolved,
  prioridadeLabelFromSeverity,
  severityUpperFromAlertRow,
} from '../../../lib/alert-row';
import { normalizeListPayload } from '../../../lib/api-normalize';
import { formatApiError } from '../../../lib/api-error-message';
import { EcondomizaApi } from '../../../services';
import {
  parseIaNarrative,
  parseInsightsEnvelope,
  type AlertInsightRow,
  type InsightsBundle,
  type OperationalInsight,
  type SnapshotMetaRow,
} from '../lib/insights-model';
import { insightsKeys } from '../query-keys';

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

async function fetchInsightsBundle(refresh = false): Promise<InsightsBundle> {
  const settled = await Promise.allSettled([
    EcondomizaApi.getOperationalInsights({ refresh }),
    EcondomizaApi.getOperationalInsightHistory(25),
    EcondomizaApi.listAlerts({ page: 1, pageSize: 50 }),
    EcondomizaApi.complianceDashboard(),
  ]);

  const partialErrors: string[] = [];
  let envelope = null as InsightsBundle['envelope'];
  let history: SnapshotMetaRow[] = [];
  let alerts: AlertInsightRow[] = [];
  let complianceScore: number | null = null;
  let complianceOutstanding: number | null = null;

  if (settled[0].status === 'fulfilled') {
    envelope = parseInsightsEnvelope(settled[0].value.data);
  } else {
    partialErrors.push(formatApiError(settled[0].reason));
  }

  if (settled[1].status === 'fulfilled') {
    const histPayload = asRecord(settled[1].value.data);
    const histRowsRaw = histPayload.rows;
    history = Array.isArray(histRowsRaw)
      ? (histRowsRaw as unknown[]).map((x) => {
          const r = asRecord(x);
          return {
            id: String(r.id ?? ''),
            createdAtUtc: String(r.createdAtUtc ?? ''),
            expiresAtUtc: String(r.expiresAtUtc ?? ''),
            ruleSetVersion: String(r.ruleSetVersion ?? ''),
          };
        })
      : [];
  } else {
    partialErrors.push(formatApiError(settled[1].reason));
  }

  if (settled[2].status === 'fulfilled') {
    const rawItems = normalizeListPayload(settled[2].value.data);
    alerts = (rawItems as Record<string, unknown>[]).map((item) => {
      const sev = severityUpperFromAlertRow(item);
      const prio = prioridadeLabelFromSeverity(sev);
      const msg = String(item.message ?? item.title ?? item.titulo ?? '');
      const product = String(item.productName ?? '');
      return {
        id: String(item.id ?? ''),
        type: String(item.type ?? ''),
        productName: product || '—',
        message: msg,
        category: String(item.category ?? item.categoria ?? '—'),
        alertCategory: String(item.alertCategory ?? '—'),
        severity: prio,
        deviationPct:
          item.deviationPercentage != null && item.deviationPercentage !== ''
            ? `${Number(item.deviationPercentage).toFixed(1)}%`
            : '—',
        currentPrice:
          item.currentPrice != null
            ? Number(item.currentPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : '—',
        avgPrice:
          item.averagePrice != null
            ? Number(item.averagePrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : '—',
        analyzedAt: String(item.analyzedAt ?? ''),
        createdAt: String(item.createdAt ?? ''),
        resolved: isAlertRowResolved(item),
      };
    });
  } else {
    partialErrors.push(formatApiError(settled[2].reason));
  }

  if (settled[3].status === 'fulfilled') {
    const cd = asRecord(settled[3].value.data);
    const score = cd.complianceScore ?? cd.ComplianceScore;
    const out = cd.outstandingFindings ?? cd.OutstandingFindings;
    complianceScore = typeof score === 'number' ? score : Number(score) || null;
    complianceOutstanding = typeof out === 'number' ? out : Number(out) || null;
  }

  return { envelope, history, alerts, complianceScore, complianceOutstanding, partialErrors };
}

export function useInsightsBundle() {
  return useQuery({
    queryKey: insightsKeys.bundle(),
    queryFn: () => fetchInsightsBundle(false),
  });
}

export function useInsightsRecalculate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchInsightsBundle(true),
    onSuccess: (data) => {
      queryClient.setQueryData(insightsKeys.bundle(), data);
    },
  });
}

export function useInsightsNarrative() {
  return useMutation({
    mutationFn: async (items: OperationalInsight[]) => {
      const body = {
        language: 'pt',
        items: items.map((it) => ({
          id: it.id,
          kind: it.kind,
          title: it.title,
          summary: it.summary,
          severity: it.severity,
          tier: it.tier,
          impactScore: it.impactScore,
          uiGroup: it.uiGroup,
          simpleExplanation: it.simpleExplanation || it.summary,
          whyItMatters: it.whyItMatters,
          recommendation: it.recommendation,
          suggestedAction: it.suggestedAction,
          anomalyNote: it.anomalyNote,
          benchmarkNote: it.benchmarkNote,
          complianceNote: it.complianceNote,
          evidence: it.evidence,
        })),
      };
      const { data } = await EcondomizaApi.narrativeOperationalInsights(body);
      const parsed = parseIaNarrative(data);
      if (!parsed) throw new Error('Resposta da IA em formato inesperado.');
      return parsed;
    },
  });
}
