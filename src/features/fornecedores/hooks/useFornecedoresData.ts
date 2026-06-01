import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizeListPayload } from '../../../lib/api-normalize';
import { EcondomizaApi } from '../../../services';
import { fornecedoresKeys, type SupplierFormPayload } from '../query-keys';

export interface SupplierItem {
  id: string;
  name: string;
  document: string;
  category: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

export interface SupplierQualityItem {
  supplierId: string;
  name: string;
  category: string | null;
  isActive: boolean;
  tier: string;
  tierLabel: string;
  score: number | null;
  expenseCount: number;
  totalSpent: number;
  avgPriceDeviationPercent: number | null;
  priceAuditCount: number;
  criticalPriceEvents: number;
  warningPriceEvents: number;
  openComplianceFindings: number;
  reasons: string[];
}

export interface SupplierQualitySummary {
  totalSuppliers: number;
  recommendedCount: number;
  acceptableCount: number;
  attentionCount: number;
  highRiskCount: number;
  insufficientDataCount: number;
}

function mapQualityRow(row: Record<string, unknown>): SupplierQualityItem {
  const reasonsRaw = row.reasons;
  const reasons = Array.isArray(reasonsRaw) ? reasonsRaw.map(String) : [];
  return {
    supplierId: String(row.supplierId ?? ''),
    name: String(row.name ?? ''),
    category: row.category != null ? String(row.category) : null,
    isActive: row.isActive !== false,
    tier: String(row.tier ?? 'DADOS_INSUFICIENTES'),
    tierLabel: String(row.tierLabel ?? 'Dados insuficientes'),
    score: row.score == null ? null : Number(row.score),
    expenseCount: Number(row.expenseCount ?? 0),
    totalSpent: Number(row.totalSpent ?? 0),
    avgPriceDeviationPercent:
      row.avgPriceDeviationPercent == null ? null : Number(row.avgPriceDeviationPercent),
    priceAuditCount: Number(row.priceAuditCount ?? 0),
    criticalPriceEvents: Number(row.criticalPriceEvents ?? 0),
    warningPriceEvents: Number(row.warningPriceEvents ?? 0),
    openComplianceFindings: Number(row.openComplianceFindings ?? 0),
    reasons,
  };
}

function mapQualityAnalysis(raw: unknown): {
  suppliers: SupplierQualityItem[];
  summary: SupplierQualitySummary;
} {
  const root = (raw ?? {}) as Record<string, unknown>;
  const summaryRaw = (root.summary ?? {}) as Record<string, unknown>;
  const suppliersRaw = Array.isArray(root.suppliers) ? root.suppliers : [];
  return {
    suppliers: (suppliersRaw as Record<string, unknown>[]).map(mapQualityRow).filter((s) => s.supplierId),
    summary: {
      totalSuppliers: Number(summaryRaw.totalSuppliers ?? 0),
      recommendedCount: Number(summaryRaw.recommendedCount ?? 0),
      acceptableCount: Number(summaryRaw.acceptableCount ?? 0),
      attentionCount: Number(summaryRaw.attentionCount ?? 0),
      highRiskCount: Number(summaryRaw.highRiskCount ?? 0),
      insufficientDataCount: Number(summaryRaw.insufficientDataCount ?? 0),
    },
  };
}

function tierBadgeClass(tier: string): string {
  switch (tier) {
    case 'RECOMENDADO':
      return 'op-badge op-badge--ok';
    case 'ACEITAVEL':
      return 'op-badge op-badge--neutral';
    case 'ATENCAO':
      return 'op-badge op-badge--warn';
    case 'RISCO':
      return 'op-badge op-badge--danger';
    default:
      return 'op-badge op-badge--neutral';
  }
}

export { tierBadgeClass };

function mapRow(s: Record<string, unknown>): SupplierItem {
  return {
    id: String(s.id ?? ''),
    name: String(s.normalizedName ?? s.name ?? ''),
    document: String(s.document ?? s.cnpj ?? s.cpf ?? ''),
    category: String(s.category ?? '-'),
    phone: (s.phone as string) ?? null,
    email: (s.email as string) ?? null,
    isActive: s.isActive !== false,
  };
}

function mapSuppliers(raw: unknown): SupplierItem[] {
  const suppliersData = normalizeListPayload(raw);
  return (suppliersData as Record<string, unknown>[])
    .filter((row) => row.isActive !== false)
    .map(mapRow)
    .filter((s) => s.id);
}

export function useFornecedoresList() {
  return useQuery({
    queryKey: fornecedoresKeys.list(),
    queryFn: async () => {
      const result = await EcondomizaApi.listSuppliers({});
      return mapSuppliers(result.data);
    },
  });
}

export function useSupplierQualityAnalysis() {
  return useQuery({
    queryKey: fornecedoresKeys.qualityAnalysis(),
    queryFn: async () => {
      const result = await EcondomizaApi.getSupplierQualityAnalysis();
      return mapQualityAnalysis(result.data);
    },
  });
}

export function useFornecedorMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: fornecedoresKeys.list() });
    await queryClient.invalidateQueries({ queryKey: fornecedoresKeys.qualityAnalysis() });
  };

  const createSupplier = useMutation({
    mutationFn: (payload: SupplierFormPayload) => EcondomizaApi.createSupplier(payload),
    onSuccess: invalidate,
  });

  const updateSupplier = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SupplierFormPayload }) =>
      EcondomizaApi.updateSupplier(id, payload),
    onSuccess: invalidate,
  });

  const deactivateSupplier = useMutation({
    mutationFn: (id: string) => EcondomizaApi.deactivateSupplier(id),
    onSuccess: invalidate,
  });

  return { createSupplier, updateSupplier, deactivateSupplier };
}
